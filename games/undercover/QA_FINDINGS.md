# Undercover — QA Findings

**Tested:** live build at `http://localhost:3005` · 3–4 named browser clients (Vesper/Marlowe/Brigid/Rick), headless Chromium, mobile viewport **375×667 @2x**.
**Method:** 6+ full rounds across two games; every ending exercised (catch / wrong accusation / spy guesses right / spy guesses wrong / timer-out / failed vote); reconnection, illegal/double actions, and **raw WebSocket frame inspection** of every client's received state for redaction leaks.
**Scope:** observation only — no game code changed.

---

## Verdict at a glance

- **Core engine is sound.** Redaction, dealing, all five endings, scoring, the server-synced clock, vote resolution, and every illegal-action guard behave correctly (see "Confirmed PASS" below).
- **The reconnection layer is the weak point.** Reconnecting assigns a player a *new* id but never migrates the references that point at the old id. This single root cause produces a **critical soft-lock** (#1) and a **vote exploit** (#2).
- **Biggest opportunity:** the most dramatic beats (timer, vote tally, spy's guess, the unmask) are rendered as plain text/numbers — prime targets for motion (#8–#12).

Findings: **3 bugs (1 critical, 2 medium)** · **3 visual** · **5 motion/graphics** · plus a large block of verified-correct behavior.

---

## PRIORITIZED FINDINGS

### 1. [MECHANICS] 🔴 CRITICAL · reconnect / `server/game.js` `addPlayer` + `hostId` · Host reconnect orphans the host role → permanent soft-lock
**What:** When any player drops and rejoins by name, `BaseGame.addPlayer` does `existing.id = id` with a brand-new `randomUUID()` (assigned in `index.js attach()`), but `this.hostId` is **never updated**. After the host refreshes their tab / reconnects, `hostId` still points at the dead socket id, so **no player satisfies `isHost`** (`hostId === id` is false for everyone).
**Impact:** All host-only actions die — `nextRound`, `restart`/back-to-lobby, `start`, `config`. At the next **round-over the game is permanently stuck**: every client shows "Waiting on the host to deal another round…" and no one has a "Deal the next round" button. The only escape is everyone leaving (room deletion). Even *before* reconnecting — while the host is merely disconnected — there is no host at all, so a round that ends in that window also locks.
**Repro (confirmed):** 4-player round in play → close host tab → all remaining players report `isHost=false` → host reopens & rejoins by name "Vesper" → **all four** `isHost=false` → end the round → all four see "Waiting on the host…", zero "Deal the next round" buttons. Screenshot: this is the same `roundOver` layout as `qa-shots/04-roundover-timeout.png` but with the host controls replaced by the waiting message for everyone.
**Suggested fix:** In the reconnect branch of `addPlayer`, capture the old id and remap host: `if (this.hostId === oldId) this.hostId = id;`. More robustly, migrate *all* id references on reconnect (see #2) or reassign the host to any connected player whenever the current host disconnects.

---

### 2. [MECHANICS] 🟠 MEDIUM · reconnect / `accusationsUsed` (and other id-keyed state) · One-vote-per-round limit bypassed by reconnecting
**What:** Same root cause as #1. `accusationsUsed` is a `Set` of player **ids**. After a player uses their accusation and then reconnects (new id), the old id is still in the set but the new id is not — so `canAccuse` flips back to `true`.
**Impact:** A player can open **multiple votes per round** simply by refreshing — defeats the "each player may open one vote per round" rule. The same stale-id problem also affects `firstAskerId` (the "asks 1st" badge vanishes for a player who reconnects), `lastAccuserId` (could misattribute / drop the accuser-catch bonus), and `vote.accuserId`/`vote.accusedId` if the accuser or accused reconnects mid-vote.
**Repro (confirmed):** Marlowe calls a vote → `canAccuse=false` → close & rejoin as "Marlowe" → `canAccuse=true` → she opens a second vote in the same round (phase → `vote`, accuser "Marlowe").
**Suggested fix:** On reconnect, migrate the old id everywhere it is held: `accusationsUsed` (delete old, keep usage), `firstAskerId`, `lastAccuserId`, `vote.*`, and `hostId`. Cleanest: key per-round per-player flags on the player object (e.g. `p.accusedThisRound`) instead of on the volatile socket id.

---

### 3. [MECHANICS] 🟠 MEDIUM · `resetToLobby`/`cleanup`/`setup` · Scores never reset when returning to the lobby
**What:** README states "scores persist until everyone returns to the lobby" (i.e., a lobby return should clear them). But `resetToLobby()`→`cleanup()` never zeroes `score`, and `setup()` only initialises score `if (typeof p.score !== 'number')`. So a brand-new game inherits stale scores.
**Impact:** After "End game · back to lobby" and starting a fresh game, **round 1 begins with non-zero scores** — confusing and unfair (e.g. a returning host keeps a lead; a newly-joined player starts at 0 against veterans).
**Repro (confirmed):** End a game with Vesper on 2 pts → "End game · back to lobby" → lobby still shows Vesper 2 pts → start a new game → round-1 scores `{Vesper: 2, …}`.
**Suggested fix:** In `cleanup()` (or at the top of `setup()`), set `p.score = 0` for all players.

---

### 4. [VISUAL] 🟡 LOW · `Suspects.jsx` · "asks 1st" badge clips the card's top edge
**What:** The amber "asks 1st" badge is absolutely positioned at `-top-1.5`, so it sits on/over the top border of the suspect card and butts against the timer row above. It reads, but looks cramped/clipped.
**Where:** Play phase, first-asker's suspect chip. See `qa-shots/02-play-dossier-agent.png` / `03-play-dossier-spy.png` (Brigid's chip).
**Suggested fix:** Add a few px of top padding to the suspects row, or move the badge inside the card (a small corner ribbon) so it doesn't collide with the timer.

---

### 5. [VISUAL] 🟡 LOW→MED · `RoundOver.jsx` · Reveal modal may need scroll at high player counts
**What:** The round-over modal stacks: winner headline + reason + spy/location reveal cards + a full **"Everyone's role"** list (one row per player) + 2 host buttons. At 3–4 players it fits 375×667 cleanly (`qa-shots/04`, `07`). At 7–8 players the role list will push content past the fold; it relies on the modal's `overflow-y-auto`, so it scrolls rather than clips — acceptable but worth confirming the "Deal the next round" button stays reachable.
**Suggested fix:** Verify at max players; consider condensing role rows or making the list area a fixed-height scroller so the action buttons remain pinned/visible.

---

### 6. [VISUAL] 🟡 LOW · `Room.jsx`/`SpyGuess.jsx` · Redundant dossier during spy's guess (non-spy view)
**What:** While the spy is choosing a location, non-spies see the "Cover blown / the spy is naming a location…" panel **and** their own still-flippable "SEALED FILE" dossier above it. Not broken, just slightly redundant/competing focus.
**Where:** `qa-shots/09-spyguess-waiting.png`.
**Suggested fix:** During `spyGuess`, collapse the non-spy dossier to a thin summary (or dim it) so the suspense panel is the focal point.

---

### 7. [MECHANICS] 🟢 NIT · `startRound` location RNG has no anti-repeat
**What:** `locationIndex` is a pure `Math.random()` pick; consecutive rounds can repeat the same location. Observed "Newspaper Office" dealt in two back-to-back rounds.
**Impact:** Cosmetic/fairness nit — a repeat can tip off attentive players. Low priority.
**Suggested fix:** Exclude the previous round's `locationIndex` when drawing the next.

---

### 8. [MOTION ▸ over text] 🔵 PRIORITY · `Timer.jsx` · The interrogation clock is under-dramatised
**What:** The signature "server-synced clock that goes white-hot as it empties" is a 1.5px progress bar + mono digits. The color shift under 30s (`animate-pulse`, amber→white gradient) is subtle and easy to miss.
**Want:** Make the clock a *presence*. The bare bulb in the noir art could dim/swing as time drains; a vignette tightens around the table; under 30s the digits glow red-hot and "tick" with a heartbeat; a faint film-grain flicker intensifies. The pause state ("CLOCK HELD") could visibly freeze the bulb mid-swing. See `qa-shots/02` (running) vs `08` (held).

### 9. [MOTION ▸ over text] 🔵 PRIORITY · `VotePanel.jsx` · Accusation tally is plain numbers
**What:** The vote shows "1 GUILTY · 0 NOT GUILTY · 1/3 in" as static figures; the only motion is a ✓ badge on suspects who voted.
**Want:** Turn the tally into a verdict-meter. Animate count-ups; render each eligible voter as a mugshot chip that flips to a stamped "GUILTY"/"NOT GUILTY" card as they vote; a unanimity bar fills and **slams** to a gavel/stamp when conviction lands, or shatters with a "WALKS" stamp on a single dissent. Builds the interrogation tension the theme promises. See `qa-shots/06-vote-panel.png`.

### 10. [MOTION ▸ over text] 🔵 PRIORITY · `SpyGuess.jsx` · Spy's location guess is a plain text grid
**What:** Breaking cover opens a 2-column list of location names (`qa-shots/08`). The biggest swing in the game (a possible +4) is a text menu.
**Want:** A noir case-board: location *photo cards* pinned with red string, a magnifier on focus, and confirming "names it" with a red **NAMED** stamp thudding onto the card — then a beat of suspense before the reveal. The non-spy watchers (`qa-shots/09`) could see the board fill in live (without the answer) for shared tension.

### 11. [MOTION ▸ over text] 🔵 PRIORITY · `RoundOver.jsx` · The unmask is mostly static
**What:** The reveal is strong on hierarchy (big "THE SPY WINS", reason, spy/location cards) but the actual *unmasking* is a static mug + name, and scores are static numbers (`qa-shots/04`, `07`).
**Want:** Swing a spotlight onto the spy; tear the redaction bars off their file; a mugshot "slam" with a flashbulb pop. **Animate the score deltas** (+4 / +2 / +1) counting up per player so everyone sees who gained what. This is the payoff moment — it should land like a reveal, not a results table.

### 12. [MOTION ▸ over text] 🔵 · `SpyGuess.jsx` (non-spy) / "Break cover" · Cover-blown moment is a spinner
**What:** When the spy declares, non-spies get "COVER BLOWN / The spy is naming a location… / spinner" (`qa-shots/09`).
**Want:** Sell the alarm — a red siren sweep / flashbulb / the dossier bursting open across all tables when "Break cover" fires, then settle into the watch state. (The dossier 3D flip in `Dossier.jsx` is already an excellent signature animation — keep it; this is about matching that quality elsewhere.)

---

## Confirmed PASS (verified correct — do not regress)

**Redaction & dealing (inspected raw WS frames, not just the DOM):**
- Exactly **one spy** per round; spy's frame has `location:null` and `yourRole:null`; non-spies share the same location with **distinct** cover roles.
- **No leak:** every client's `players[]` reports `isSpy:false` and `role:null/undefined` for everyone during play — the spy's identity and the location are never present in any non-authorised client's state. The shared `board` (30 locations) is sent to all, including the spy, as intended. Reveal fields (`isSpy`, `role`, `spyId`, `location`) appear **only** at `roundOver`.

**Endings & scoring (all five + failed vote, scores carry across rounds):**
- Catch (unanimous) → agents win, +1 every non-spy, +1 accuser bonus. ✓
- Wrong accusation (convict innocent) → spy +2; reason line names the accuser. ✓
- Spy guesses right → spy +4. ✓ · Spy guesses wrong → +1 every non-spy. ✓
- Timer-out → spy survives +2 (auto-resolved **server-side** with all clients idle). ✓
- Failed vote (one "Not guilty") → returns to play, **clock resumes**, accuser's one vote consumed. ✓

**Clock:** server-authoritative; pauses to "CLOCK HELD" during vote/guess and freezes `remainingMs`; resumes on a fresh end-timestamp; fires and resolves the round itself on timeout.

**Resilience:** non-host reconnect by name resumes the seat with role/location/spy intact; a **pending voter disconnecting mid-vote** recomputes `needed` (3→2) and the vote still resolves — no stall.

**Illegal/double-action guards (all return correct errors):** declare/guess by a non-spy; accuse self; cast vote with none open; accused voting; accuser re-casting; double vote ("You already voted"); second accusation; non-host `nextRound`/`config`; unknown action; nonexistent target. Join validation: bad code → "No game with that code."; in-progress + unknown name → clear rejection.

**Errors:** **No console errors or warnings** across sessions; no broken buttons or non-advancing states observed (outside the reconnect soft-lock #1).

**Mobile:** all phases (lobby, play agent/spy, vote, spyGuess, roundOver at 3–4p) fit **375×667 with no scroll**.

---

## Screenshots (`games/undercover/qa-shots/`)
| file | what |
|---|---|
| `01-lobby-host.png` | Lobby — case number, roster, duration, start |
| `02-play-dossier-agent.png` | Play — agent's open dossier (location + role) |
| `03-play-dossier-spy.png` | Play — spy's redacted dossier (SPY stamp, 3 actions) |
| `04-roundover-timeout.png` | Reveal — spy survives (timer-out) |
| `05-roundover-spy-view.png` | Reveal as seen by the spy |
| `06-vote-panel.png` | Accusation vote — tally + guilty/not-guilty |
| `07-roundover-agents-win.png` | Reveal — players win (catch) |
| `08-spyguess-picker.png` | Spy break-cover location picker |
| `09-spyguess-waiting.png` | Non-spy "cover blown" waiting state |
