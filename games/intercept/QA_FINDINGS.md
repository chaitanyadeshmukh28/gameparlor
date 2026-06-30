# Intercept — QA Findings

**Tester:** QA agent (headless Chromium, 375×667 phone viewport, deviceScaleFactor 2)
**Target:** live server at http://localhost:3008 (no code changed; observation only)
**Method:** 4 real browser clients — Watch ALPHA = {ALICE (host), CAROL}, Watch BRAVO = {BOB, DAVE}.
Played **Game 1 to a full win** (BRAVO wins by 2 interceptions, 3 rounds), a partial Game 2 (encryptor-reconnect edge case), and a Game 3 (miscommunication accrual). Rotated the Encryptor each round, exercised round‑1 no‑interception, interception + miscommunication accrual, disconnect/reconnect, illegal/locked actions, room cleanup, restart. Cross‑checked every claim against the engine (`server/game.js`) and ran the engine unit suite (**45/45 pass**).

**Redaction verdict: SOLID.** All secret state is redacted *server‑side* in `gameView()` (own keywords only to that watch; active code only to that round's Encryptor; enemy keywords `null` until game over). Verified by reading each client's live DOM in encrypt/guess/reveal phases — no team ever saw the enemy's keywords or the live code. One design caveat (#9).

Severity legend: **CRITICAL** (blocks play) · **HIGH** · **MEDIUM** · **LOW** · **POSITIVE** (verified working).

---

## TOP PRIORITY

### 1. [MECHANICS] CRITICAL · Encryptor disconnect → **permanent soft‑lock**, unrecoverable even on reconnect
**Where:** `game.js` `startRound()` stores `encryptorByTeam[t] = pickEncryptor(t)` as the player's **socket id**; `BaseGame.addPlayer()` reconnect sets `existing.id = newId`. The captured id is never updated. Clue gate: `if (this.encryptorByTeam[me.team] !== me.id) return {error}`.
**Repro (verified live):** Round in `encrypt` phase, BRAVO's Encryptor (BOB) closes his tab before transmitting, then rejoins by name. After reconnect BOB's view is the **decoder wait screen** ("BOB is sending your clues"), with **no code, no clue inputs, no Transmit button** (screenshot `qa-shots/07-CRITICAL-encryptor-reconnect-softlock.png`). No other BRAVO member is the Encryptor, so BRAVO's clues can never be sent. ALPHA shows "✓ transmitted", BRAVO stuck on "… encrypting" forever — the table hangs in `encrypt` permanently.
**Why severe:** combined with #2 there is **no recovery** — host can't force‑advance or return to lobby; the only escape is everyone abandoning the room. Any encryptor who drops a connection (mobile backgrounding, wifi blip) at the worst moment kills the game.
**Fix:** key the encryptor seat to a **stable identity** (player name or a persistent player index), not the socket id; resolve `encryptorByTeam` → current `player.id` at read time. Also **reassign the Encryptor to a connected member** if the seat‑holder is disconnected when a clue/transmit is attempted, or when they reconnect re‑bind the seat to their new id.

### 2. [MECHANICS] HIGH · No in‑game "return to lobby / abandon" control — any stall is terminal
**Where:** `client/src/App.jsx` — the only `restart`/return path is the **New Duel** button on the `over` screen (`FinalScreen`). `BaseGame.resetToLobby()` exists server‑side but no mid‑game client triggers it.
**Repro:** Once #1 (or any future stall) occurs, the host has no button to reset; the game is dead.
**Fix:** add a host‑only "Abort transmission → lobby" affordance available in all in‑game phases (sends a `restart`/reset intent), plus a confirm. This is the safety net for every soft‑lock class.

### 3. [MECHANICS] MEDIUM · Encryptor that simply *stays* disconnected stalls the round (no reassignment)
**Where:** `pickEncryptor()` only runs in `startRound()`; there is no reassignment when the chosen Encryptor disconnects mid‑`encrypt`. `decodeNeeded`/`interceptNeeded` gracefully skip absent decoders, but the **transmit step has no such fallback**.
**Repro:** Encryptor closes tab and does *not* return → that watch can never transmit → `phase` never advances to `guess`.
**Fix:** if the Encryptor is disconnected when the other watch has transmitted (or after a short grace), reassign to the next connected member (`pickEncryptor` already skips disconnected players — call it again), or let any connected member of that watch transmit.

### 4. [MOTION] HIGH · The **code transmission** is the heart of the game but is silent plain text
**Where:** `EncryptorConsole` → on Transmit it just swaps to a wait panel; `TransmitStatus` flips "… encrypting" → "✓ transmitted".
**Want:** make transmission a *visible broadcast* — an oscilloscope/Morse pulse travels down a wire from your station toward the opposing watch; the three Nixie code digits "fire" in sequence as each clue is sent; a brief "ON AIR" sweep. This is a WWII signals room; the single most thematic moment is currently a text toggle.

### 5. [MOTION] HIGH · **Intercept Log / deduction board** (Intel modal) is a plain comma list — should be the codebreaker's worksheet
**Where:** `IntelModal` renders `team.board[i]` as `"clue" · "clue" · …` text per slot.
**Want:** a **grid/matrix (slots 1–4 × rounds)** where each transmitted clue animates into its cell; the enemy's grid shows your accumulating guesses with empty cells you're trying to fill. New clues "stamp" in. This turns the core deduction loop into a tactile board instead of a sentence.

---

## MECHANICS / REDACTION

### 6. [MECHANICS] MEDIUM · Team‑shared guess can be silently overwritten by a teammate; resolution fires on the last write
**Where:** `handleMessage` `guess` → `this.guesses[me.team].decode/intercept = guess` (no per‑player ownership/lock). `maybeResolve()` runs after every guess.
**Repro:** Decoder A locks `[1,2,3]` (their UI locks). Decoder B then locks `[4,2,1]`; the team value is overwritten and, once all needed slots are full, the round resolves with whoever wrote last. Two decoders can quietly fight; a griefer can flip a correct decode to wrong.
**Fix:** intended design is "one guess per watch," but the UX hides that the value is shared. Either (a) lock the watch's guess once any member submits (first‑write‑wins, show "CAROL locked 4‑2‑1, change?") or (b) require an explicit team confirm. At minimum surface *who* set the current guess and let the watch see/agree before it locks.

### 7. [MECHANICS] LOW · Disconnecting the sole decoder lets a watch dodge a Miscommunication
**Where:** `decodeNeeded(t)` = "some connected non‑Encryptor exists." If the only decoder drops, it returns false and the round resolves with **no miscommunication charged**.
**Repro:** 2‑player watch, decoder closes tab during `guess` → no MIS token even though the code went unread.
**Fix:** acceptable as graceful‑degradation, but note the exploit; consider charging the pending guess or freezing until reconnect/timeout in ranked play.

### 8. [MECHANICS] LOW · "Next Transmission" (continue) has no host gate — any player advances the round for everyone
**Where:** `handleMessage` `continue` → `startRound()` with no host check (contrast `start`/`resetToLobby` which are host‑gated).
**Repro:** During `reveal`, a fast player on either team clicks Next and the whole table jumps to the next round, cutting off others still reading the reveal.
**Fix:** gate `continue` to host, or require an "all ready"/short auto‑timer, or at least show "waiting for N players" before advancing.

### 9. [REDACTION] LOW (design) · Reveal/history expose each watch's **exact numeric code** to the enemy
**Where:** `resolveRound()` pushes `{round, team, clues, code}` to `history`; `gameView` sends full `history` to both watches at reveal, and `RevealCard` prints the code digits beside each clue.
**Why note:** keywords stay secret (good), but in the source game the numeric code is *never* revealed — the opponent only learns the clue→slot mapping (which the board already gives). Handing the enemy the precise past codes is a strategic divergence, not a secret‑leak, but worth a deliberate decision.
**Fix:** if matching Decrypto strategy, reveal only the clue→slot mapping (board), not the literal code sequence to the *opposing* watch.

---

## ERRORS / STABILITY (mostly POSITIVE)

### 10. [ERRORS] POSITIVE · No thrown errors or stuck states in observed normal play
Full Game 1 (create → join → start → 3 rounds → win → restart), reveals, both modals, decoder reconnect, and room re‑creation produced **no broken buttons, no non‑advancing states, no layout throw**. (Console was not exhaustively dumped; flagged so a dev can add a console‑error gate in CI.)

### 11. [ERRORS] POSITIVE · Input validation holds
- Start correctly rejected with **"Need at least 4 players"** until both watches had 2 (re‑verified after a failed setup).
- Encryptor's own decode card is correctly disabled ("You sent these clues — your watch decodes"); engine `canDecode` excludes the Encryptor.
- Round‑1 interception is blocked both in UI (card hidden, "No interception in round 1") and engine (`canIntercept` requires `roundNo ≥ 2`).
- Locked decode/intercept cards remove their controls (no UI double‑submit); engine rejects guesses outside `guess` phase.
- Engine unit suite: **45 passed, 0 failed** (covers code generation, decode/miscommunication, interception win, lose‑by‑2‑miscommunications, and the round‑8 tiebreak).

### 12. [MECHANICS] POSITIVE · Core loop verified live
Keyword dealing (4 distinct per watch from disjoint draw) ✓ · every generated code a valid distinct permutation of 3 of {1,2,3,4} ✓ · clue flow → both transmit → `guess` ✓ · own‑team decode vs enemy interception resolved independently ✓ · **interception accrual + INTERCEPTED alert + win at 2 interceptions** ✓ (Game 1) · **miscommunication accrual + GARBLED** ✓ (Game 3 R1) · **Encryptor rotates each round** ✓ (A: Alice→Carol→Alice; B: Bob→Dave→Bob) · **decoder reconnect by name** restores team + own keywords ✓ · restart preserves teams ✓ · room auto‑deletes when empty ✓.

---

## VISUAL / MOBILE

### 13. [VISUAL] POSITIVE · Strong, unmistakable identity
WWII signals terminal: phosphor‑green on black, amber "eyes‑only" code panel, **Nixie‑tube code digits** with flip‑in, stencil display face, CRT flicker/vignette. Clear hierarchy on encrypt and reveal screens. (`qa-shots/01`, `04`, `05`.)

### 14. [VISUAL] MEDIUM · No‑scroll holds for small games but overlays use internal scroll that will clip in long games
At 375×667 the **encrypt**, **guess**, and **reveal** screens fit with no page scroll in 4‑player play (`document.scrollHeight == clientHeight == 667`). **But** the Reveal/Final/Intel overlays are `overflow-y-auto` containers: with 8 rounds of history, both watches' reveal cards, or a full Intel board, content will scroll/clip inside the overlay. Flag for a max‑rounds playthrough.
**Fix:** verify the reveal and Intel layouts at round 6–8 on a phone; condense per‑round rows or paginate.

### 15. [VISUAL] LOW · Encrypt console header wraps awkwardly
"▦ ENCRYPTOR · SECRET CODE — EYES ONLY" wraps to a second line and the "● LIVE" indicator floats to the top‑right of the wrap (`qa-shots/01`). Tighten the label or move "● LIVE" onto its own aligned row.

---

## MOTION / GRAPHICS OVER TEXT (priority category)

*(M4–M6 below; M-transmission and M-intercept-log are #4 and #5 in TOP PRIORITY.)*

### 16. [MOTION] MEDIUM · Token lamps don't animate when a token is earned
**Where:** `Scoreboard`/`Lamps` (persistent header) are static dots; only the transient reveal `Badge` ("+1 INTERCEPT") moves.
**Want:** when a token lands, the corresponding INT/MIS lamp **powers on with a surge/flicker** (relay click, glow ramp) synced to the badge — this is a signals room; the scoreboard should feel electrical. Drive a permanent sense of "1 away from winning/losing."

### 17. [MOTION] MEDIUM · Decode / interception resolution is static rows — animate the clue→slot snap
**Where:** `RevealCard` lists clue + code digit side by side (digits do spring‑scale in, nice start).
**Want:** each clue card **snaps onto its revealed slot digit**; a correct self‑decode locks green, a **miscommunication garbles** the clue text (glitch/scramble) before settling red. Make right‑vs‑wrong legible at a glance through motion, not just the "✓ / ✗" line.

### 18. [MOTION] LOW · INTERCEPTED alert is good — extend it
**Where:** `InterceptAlert` already shakes + light‑sweeps (`qa-shots/04`) — keep it.
**Want:** on intercept, show the **enemy's stolen code digits being pulled** toward the intercepting watch's scoreboard, terminating in the lamp surge (#16).

### 19. [MOTION] LOW · End reveal — let the enemy's secret words "decrypt"
**Where:** `TeamFinalCard` flips keyword cards (rotateX) — already pleasant.
**Want:** for the *enemy* watch's words (secret all game), play a brief **scramble→settle "decrypting…" effect** so the climactic reveal feels earned.

### 20. [MOTION] LOW · Slot selection during decode/intercept could "dial" the code
**Where:** `GuessCard` shows picked slots in boxes (CL1–3).
**Want:** as the watch selects slots, animate the sequence like a code being **dialed/tuned** into the three boxes (tick/rotor feel), reinforcing "you are composing a 3‑digit transmission."

---

## Screenshots
- `qa-shots/01-encrypt-console-encryptor.png` — Encryptor console, Nixie code, eyes‑only panel
- `qa-shots/02-encrypt-wait-decoder.png` — decoder wait view (own keywords, enemy hidden)
- `qa-shots/03-round1-reveal-clean.png` — round‑1 reveal, no interception
- `qa-shots/04-round2-INTERCEPTED-alert.png` — INTERCEPTED alert + +1 INTERCEPT
- `qa-shots/05-game1-final-bravo-wins.png` — final win screen
- `qa-shots/06-game1-final-reveal-enemyview.png` — end‑game full keyword reveal (enemy client)
- `qa-shots/07-CRITICAL-encryptor-reconnect-softlock.png` — finding #1 soft‑lock
- `qa-shots/08-miscommunication-garbled-reveal.png` — miscommunication / GARBLED
