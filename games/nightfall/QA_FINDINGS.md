# Nightfall — QA Findings

**Tested:** http://localhost:3002 (live), headless Chromium @ 375×667 (mobile), 4 named browser clients (Alice/Bob/Cara/Dave) + direct engine harness against `server/game.js`.
**Method:** Full game played to completion (lobby → night → day → vote → result → play again), plus targeted edge-case probes run directly against the authoritative engine and confirmed in-browser. Existing engine test suite: **97/97 pass** (`node --test server/game.test.mjs`).
**Console:** 0 errors, 0 warnings across all phases.
**Date:** 2026-06-28.

> **Note on the “stale server” (see #1):** the on-disk `server/game.js` is newer than the running process, so some result fields are missing **live**. My engine probes ran against the *current on-disk* code (what you’ll get after a restart). Where live vs. code differs, I call it out.

Screenshots referenced below live in `games/nightfall/qa-shots/`.

---

## A. MECHANICS & REDACTION (highest priority)

### 1. [MECHANICS · ops] CRITICAL — Live server is STALE; result screen missing the win **reason** and the **night recap**
- **Where:** Result/Dawn screen (every game played live right now). `qa-shots/09-result.png`.
- **What's wrong:** The running `:3002` process (pid 74492) started **Jun 27 20:17**, but `server/game.js` was updated **Jun 28 10:16** — ~14 h later. The live process is running the *old* engine. Capturing the raw WebSocket `state.result` payload shows the keys are:
  `deaths, counts, votes, villageWins, werewolfWins, team, winners, reveal, center` — **`reason` and `nightActions` are absent.**
  Consequences a player sees: the explanation box under “The Village wins” renders **empty** (09-result.png), and the **“In the dark” recap section never appears** (verified absent from the DOM). The on-disk code *does* produce both (engine harness emitted 5 correct recap lines + a correct reason sentence).
- **Repro:** Play any game to result on :3002 → empty reason box, no recap. `stat -c %y server/game.js` vs `ps -o lstart` of the :3002 node process confirms the skew.
- **Suggested fix:** **Restart the :3002 server** so it loads the current `game.js`. (I did NOT restart it — per safety constraints.) After restart, re-verify the reason box + recap render (the build in `dist/` already contains the rendering code and is current, built 10:17).

### 2. [REDACTION / SECURITY] HIGH — Reconnect-by-name lets anyone hijack a seat and read another player's secret role
- **Where:** Any phase after lobby. `server/base-game.js#addPlayer` (reconnect branch).
- **What's wrong:** Mid-game, `addPlayer` matches an incoming join by **name only** (case-insensitive), reassigns that player's `id` to the new socket, and returns the seat — **no secret/token check.** Since the 4-char room code is shown openly, anyone who knows a victim’s display name + code can take over their seat and immediately receive `view.me.role` and `view.me.info` (the victim’s full night knowledge). The original player — *even if still online* — is silently displaced (their old `id` no longer maps to any seat, so they stop receiving updates).
- **Repro (engine probe, reproduced live):**
  ```
  addPlayer('bo') returned: SEAT GRANTED
  Attacker's view.me.role = werewolf   (== Bo's secret role => LEAK)
  Attacker sees Bo's night info = [{"k":"wolves",...,"lone":true}]
  Original Bo still mapped? NO -> original displaced
  ```
  In-browser: opened a tab, joined as “Dave”, and immediately saw “YOUR CARD: Werewolf” + “You hunt alone…”.
- **Suggested fix:** On first join, hand the client a per-seat secret token (store in localStorage). Require that token to reclaim a seat. Reject a reconnect if the named seat is **still connected** (treat as “name taken”). At minimum, only allow name-reconnect for seats currently marked `connected:false`.

### 3. [MECHANICS / SOFT-LOCK] MED — Vote can stall: last connected player can't vote because disconnected players' buttons are disabled
- **Where:** Vote phase. `client/src/components/Vote.jsx` (`disabled={!p.connected}`).
- **What's wrong:** A round resolves only when every *connected* player has voted. But the Vote UI disables the accuse button for any disconnected player. If everyone except one player drops, the remaining player has **no enabled button to click** (can’t vote self), so the vote never resolves → soft-lock. The server actually *accepts* a vote against a disconnected player (engine probe A: `castVote('a','b'[disconnected]) → {}` and phase advanced to `result`); only the client blocks it.
- **Repro:** Engine probe A (3 players, 2 disconnect during vote → connected=["Ann"], no enabled target).
- **Suggested fix:** Don’t disable vote buttons for disconnected players (server already permits it); or auto-resolve the vote when only one connected player remains.

### 4. [MECHANICS / SOFT-LOCK] MED — No host migration: a host who leaves strands the room (notably “Play again”)
- **Where:** All post-lobby phases; acute at Result. `server/base-game.js` (`resetToLobby`, `startTimer`, `callVote` are host-only; `removePlayer` only reassigns host **in lobby**).
- **What's wrong:** When the host disconnects mid-game, `hostId` is **not** reassigned. At the result screen only the host gets the “Play again” button (`restart` is host-only), so the remaining players are stuck forever on “Waiting for the host to gather the village again…”. During the day, a host-less room also can’t start a timer or call the vote early (ready-up still works, so day isn’t a hard lock, but it’s fragile).
- **Repro:** Engine probe B — host removed at result; `hostId` stays `'a'`; `resetToLobby('b') → {error:'Only the host can return to the lobby.'}`.
- **Suggested fix:** On host disconnect in any phase, migrate `hostId` to the first connected player (the lobby already does this).

### 5. [MECHANICS] MED — Disconnecting during *your* night turn permanently skips your action (no recovery, no notice)
- **Where:** Night phase. `server/game.js#removePlayer` (advances `stepIndex` past the active actor).
- **What's wrong:** If the active player drops even briefly during their wake step, the night advances past them. Reconnecting **does** restore their role + prior info (good — see positive note), but their action is gone and they’re never told they missed it. On a phone, a momentary network blip = silently losing your Seer read / Robber swap / lone-wolf peek.
- **Repro:** Closed Dave’s tab while he was the active lone Werewolf → night advanced to the Seer; reopened + rejoined as “Dave” → seat & “You hunt alone” info restored, but the center-peek opportunity was gone with no indication.
- **Suggested fix:** Give the active step a short grace window (e.g. 5–8 s) to allow reconnect before skipping; or, if a player reconnects while night is still in progress and their step was skipped due to disconnect, surface a clear “you slept through your turn” note.

### 6. [MECHANICS · minor] LOW — Vote tally counts disconnected voters but the total counts only connected
- **Where:** Vote phase progress bar. `server/game.js#gameView` (`votedCount = Object.keys(votes).length`, `total = connected count`).
- **What's wrong:** If a player votes then disconnects, their vote stays counted while `total` drops, so the “votes cast” bar can read 100% (or be inconsistent) while a present player still hasn’t voted — misleading.
- **Repro:** Engine probe D (a & b vote, b leaves → `votedCount=2, total=2` shows “2/2 done” though c hasn’t voted).
- **Suggested fix:** Count `votedCount` only over currently-connected players.

### Positive mechanics confirmations (no action needed)
- Wake order is fixed and correct: werewolf → seer → robber → troublemaker → insomniac.
- **Swaps are correctly reflected in FINAL roles and the win calc.** Live game observed: Troublemaker swapped Alice↔Bob, making Bob the final Werewolf; Bob was hanged → **Village wins**; reveal showed “Alice started Werewolf → ended Seer”, “Bob started Seer → ended Werewolf” (09-result.png). Chained robber→troublemaker→insomniac is correct (engine test #8).
- **Redaction during play is airtight** *for honest clients*: `gameView` only sends `me` (own role/info) + a strictly redacted player list; non-active players’ `night.role` is `null`; a villager’s view never contains another player’s role string. (The only leak vector is the name-reconnect hijack, #2.)
- Every win condition validated (engine + live): wolf hanged → village; no wolf hanged → werewolves; hung/scattered vote (no 2-vote majority) → no death; Tanner voted out (no wolf) → outcast wins alone; wolf+Tanner both die on a tie → village **and** Tanner win; no wolves in play + a death → nobody wins.
- Reconnect-by-name **restores private night knowledge** correctly (Dave’s role + info came back intact).
- “Play again” (host) cleanly resets all clients to the lobby.

---

## B. ERRORS
### 7. None found — clean. LOW (positive)
- 0 console errors / warnings captured across lobby, night, day, vote, result (all 4 clients). All buttons functioned; no broken/stuck states except the soft-locks noted above. Page never threw.

---

## C. VISUAL / MOBILE NO-SCROLL (375×667)

### 8. [VISUAL] MED — Host’s **Day** view clips your own SecretDock (role + night info)
- **Where:** Day phase, host only. `qa-shots/05-day-host.png` (clipped) vs `06-day-nonhost.png` (fits).
- **What's wrong:** The host’s day screen stacks 3 timer buttons + “I’m ready” + “Call the vote now” + the secret dock; the content band overflows (measured inner scroll container **454 px > 443 px**), cutting off “Your card / Werewolf / • You hunt alone… / • You glimpsed…” at the bottom edge. The host must scroll an inner area to see their own role/knowledge. Non-host fits fine.
- **Suggested fix:** Make the secret dock a compact sticky strip (always visible), and/or collapse the three timer presets into one control. Keep the whole day view within one no-scroll screen.

### 9. [VISUAL] LOW — Landing fanned-deck card names are clipped
- **Where:** Landing. `qa-shots/01-landing.png`.
- **What's wrong:** The rotated side cards truncate their labels: “Se…”, “Wer…”, “…maker”, “…ner”. Looks unfinished.
- **Suggested fix:** Reduce the fan’s x-offset/rotation on narrow viewports, widen cards slightly, or drop labels on the two outermost cards.

### 10. [VISUAL] LOW — Result is the only scrolling screen; will get long at 6–8 players (esp. once recap is restored)
- **Where:** Result. `qa-shots/09-result.png`.
- **What's wrong:** Acceptable for a reveal, but with reason + recap + 8 player cards + 3 center cards it’s a long scroll on mobile.
- **Suggested fix:** Tighter reveal grid (3-col on mobile) and/or a collapsible “In the dark” recap.

### 11. [VISUAL · a11y · minor] LOW — Face-down cards carry hidden face text in the DOM
- **Where:** Any hidden card (e.g. center peek). `client/src/components/Card.jsx` renders both faces; the back is shown via 3D transform while the face div (with a fallback “VILLAGE” team tag) stays in the DOM.
- **What's wrong:** Not a redaction leak (the role is `null` for hidden cards, so no secret is exposed), but `innerText` / screen readers pick up a stray “Village” on face-down cards.
- **Suggested fix:** `aria-hidden` the non-visible face, and omit the team tag when `role` is null.

---

## D. MOTION / GRAPHICS OVER TEXT (priority improvements)

Nightfall communicates almost everything secret/important as **plain text bullet points** (the SecretDock “• Alice holds the Werewolf”, and — once the server is restarted — the “In the dark” recap list). The card-flip animation in `Card.jsx` already exists and should be reused to *show* these moments.

### 12. [MOTION] HIGH-value — Animate the night actions instead of writing them as bullets
- **Where:** Night wake prompts + the post-action SecretDock; the result recap.
- **Seer peek:** flip the chosen player/center **card face-up** with the existing 3D flip + a glow, hold ~1.5 s, flip back — instead of the bullet “Alice holds the Werewolf.”
- **Robber:** animate *your* card sliding to the target and theirs sliding into your slot (a visible swap), then flip your new card up to reveal what you became.
- **Troublemaker:** animate the two targets’ cards physically crossing/swapping positions (you don’t see faces — emphasize the motion, not the value).
- **Lone-wolf peek:** the selected center card flips up momentarily then back.
- **Werewolf intro:** pulse/glow partner avatars red and draw a connecting line, rather than “Fellow Werewolves: …”.

### 13. [MOTION] HIGH-value — Make the death/reveal a moment, not a line of text
- **Where:** Result. Currently “Voted out: Bob” + a static ✕ that just appears on the card.
- **Want:** sequence it — (1) tally animation (vote markers fly onto accused portraits / counters tick up), (2) the eliminated player’s card dramatically flips face-up and the ✕ stamps down with a thud/shake, (3) the team-win banner sweeps in. The data already exists (`result.votes`, `deaths`, `reveal`).

### 14. [MOTION] MED — Show the vote tally before cutting to the result
- **Where:** Vote → Result transition (jumps instantly today).
- **Want:** a brief “the village decides…” reveal of who-accused-whom (arrows from each voter to their target) using `result.votes`, then settle into the reveal.

### 15. [MOTION] MED — Give sleepers a sense of night progress
- **Where:** Night, non-active players see a pulsing eye + “The village sleeps” with **no progress indication** (you can’t tell how many actors remain or whether it’s stalled).
- **Want:** an ambient, non-leaking progress cue — e.g. the moon advancing across the sky through night “stages”, or a subtle “n roles still stirring” dots row — so the wait feels intentional rather than frozen. (Bonus: would have masked the perceived stall when the active player disconnected in #5.)

---

## Priority summary
1. **#1** Restart the stale :3002 server (result reason + recap are missing live).
2. **#2** Reconnect-by-name hijack / role leak (auth a seat with a secret token).
3. **#5 / #3 / #4** Disconnect handling: skipped night turns, vote soft-lock vs. disconnected players, host migration.
4. **#8** Host day view clips the secret dock (mobile no-scroll).
5. **#12 / #13** Replace text bullets with card-flip/swap and a real death/reveal animation.
