# The Council — QA Findings

**Tested:** http://localhost:3004 (live), plus the current source (`server/game.js`, `client/src/*`) driven in isolation.
**Date:** 2026-06-28 · **Viewport:** 375×667 @2x (mobile), headless Chromium.
**Method:** (a) 5–7 WebSocket clients driven against the live server; (b) pure-logic battery importing the current `game.js` (no network) to exhaust every win path, redaction matrix, and edge case; (c) a real browser client for visual/motion review. Because the live server **crashes every client at game start** (Finding #1), the in-game screenshots (`04`–`10`) were produced by feeding the *current* client a valid, correctly-themed state through a stubbed socket — this proves the client itself is correct and the fault is purely the server.

> ⚠️ The single most important finding (#1) is an operational/deploy bug, not a code bug: **the running server process is stale.** It must be restarted before any other finding can even be observed by a player. Findings #2–#4 are real bugs in the *current source* and will survive a restart.

---

## P0 — Blockers

### 1. [ERROR · MECHANICS] CRITICAL — Live server is stale; client⇄server vocabulary mismatch crashes every client the instant the game starts (blank screen, game unplayable past the lobby)
**Where:** running server PID for `games/council/server/index.js` (started **Jun 27**) vs. `server/game.js` (edited **Jun 28 10:23**) and `dist/` client (rebuilt **Jun 28 10:30**). `client/src/lib.jsx` `ROLES`/`POWERS`; `client/src/Game.jsx` `RoleStrip` (`ROLES[me.role].team`).
**What's wrong:** The live process is running an *older* build whose vocabulary differs from the freshly-built client it serves:

| Concept | Live server emits (stale) | New client expects |
|---|---|---|
| Roles | `loyalist`, `saboteur`, `usurper` | `liberal`, `fascist`, `hitler` |
| Powers | `survey`, **`purge`** | `survey`, `inspect`, `appoint`, **`execute`** |
| Labels | "Chair", "Deputy" | "President", "Chancellor" |

When the host presses **Convene**, the server assigns e.g. `youRole: "saboteur"`. The client's `RoleStrip` does `const role = ROLES[me.role]` → `ROLES["saboteur"]` is `undefined` → `role.team` throws `TypeError: Cannot read properties of undefined (reading 'team')`. React unmounts the whole tree → **blank screen for every player** (`03-LIVE-CRASH-blank.png`). The `'purge'` power would crash `POWERS[type]` the same way, but the game never survives that long.
**Repro:** open :3004, create a room, add ≥5 players, Convene → all clients go blank. Console shows 3× `TypeError … 'team'` / `… 'name'`.
**Fix:** **Restart the council server** so it loads current `server/game.js`. Then verify the served `dist` was rebuilt from current `client/src`. Longer term: add a defensive fallback in `RoleStrip`/`ActionTray` (`const role = ROLES[me.role] ?? FALLBACK`) and a top-level React error boundary so a single bad field degrades gracefully instead of white-screening, and consider a server `protocolVersion` the client checks on `joined`.
**Evidence:** `qa-shots/03-LIVE-CRASH-blank.png`; console logs captured `TypeError: Cannot read properties of undefined (reading 'team')`.

---

## P1 — High (bugs in current source; survive the restart)

### 2. [MECHANICS] HIGH — Reconnect-by-name swaps the player's id but leaves `order[]` / `chairId` / `nominee` pointing at the old id → reconnecting President or Chancellor is locked out; the table soft-locks
**Where:** `server/base-game.js` `addPlayer()` (`existing.id = id`); consumed by `server/game.js` (`this.order`, `chairId`, `nominee`, `lastGov`, `votes`, `seatIndex`, `nextAliveAfter`).
**What's wrong:** On reconnect, `addPlayer` mutates `existing.id` to a brand-new UUID, but every positional reference captured at `setup()` still holds the *old* id. Verified in isolation:
- `order.includes(newId) === false`, `chairId` still equals the **old** id.
- The reconnected player is no longer `isChair`/`isDeputy`; `seatIndex` returns `-1`.
- If they were the **President**, `nominate(newId, …)` is rejected with *"Only the President may nominate."* — they can never act, and no one else can advance the round → **soft-lock**.
- Other players' views: `chairId` no longer resolves to any entry in `players[]`, so the UI's `chair?.name` is `undefined` ("undefined takes the chair…").
**Repro (logic-verified):** start a 5p game; the President closes their tab and rejoins by name; they receive the table but `amIChair=false`, `eligibleDeputies=[]`, and `nominate` errors. (Voting still works because `castVote` keys off the live player object, so a reconnecting *plain voter* mostly recovers — but a reconnecting **Chair/Deputy** stalls the game.)
**Fix:** keep the player's id stable across reconnects (don't reassign `existing.id`; instead rebind the socket to the existing id), **or** on reconnect remap every stored id (`order`, `chairId`, `nominee`, `lastGov.*`, keys of `votes`, `investigatedBy`, `privateIntel`) from old→new. Stable-id is far simpler and safer.

### 3. [MECHANICS] HIGH — Elections can soft-lock: no server-side vote timeout, and a disconnect mid-vote never re-evaluates the tally
**Where:** `server/game.js` `castVote()` / `resolveVote()`; `server/base-game.js` `removePlayer()`.
**What's wrong:** A vote resolves only inside `castVote`, when `living().filter(p => p.connected && votes[p.id]===undefined)` becomes empty. Two stalls (both reproduced in isolation):
- **Silent connected player:** if one living, connected member simply never clicks Ja/Nein, `resolveVote` is never reached. There is **no server timeout** (only the *reveal* has a client-side auto-ack), so the whole game waits forever on one person.
- **Disconnect mid-vote:** if everyone else has voted and the last outstanding voter disconnects, `removePlayer` flips `connected=false` but does **not** re-run the pending check, so the election never resolves even though every *connected* member has now voted.
**Repro:** 5p game, 4 of 5 vote, 5th stays idle (stall A) or closes their tab (stall B) → phase stays `vote` indefinitely.
**Fix:** re-evaluate resolution after `removePlayer`/disconnect (treat disconnected as their auto-Nein and call `resolveVote` if no connected member is still pending); add a server-side ballot timeout that auto-casts Nein for non-voters, mirroring the existing reveal timeout.

---

## P2 — Medium

### 4. [MECHANICS] MEDIUM — A cast ballot can be silently changed until reveal (no lock / no idempotency)
**Where:** `server/game.js` `castVote()` — `this.votes[id] = vote` with no guard if already present.
**What's wrong:** A player who voted `ja` can re-send `nein` and it overwrites with no error; only the last value counts. In a hidden-simultaneous-vote game this enables last-moment flip-flopping and (combined with the public reveal tally) subtle signalling. The client also shows "Ballot cast" and hides the buttons, so this is reachable only via a crafted message today — but it's unguarded.
**Repro (logic-verified):** `castVote(p,'ja')` then `castVote(p,'nein')` → no error, stored vote becomes `nein`.
**Fix:** reject a second ballot from the same player (`if (this.votes[id] !== undefined) return {error:'Ballot already cast.'}`), or explicitly decide votes are changeable and document it.

### 5. [VISUAL] MEDIUM — Mobile no-scroll: bottom-edge clipping of action-card labels and the ballot counter at 375×667
**Where:** `Game.jsx` `LegCard` label (`absolute -bottom-6 …`) and the vote panel's "N/M ballots in" line.
**What's wrong:** On the **Drafting** screen the "DISCARD ↑" captions under the three cards are cut off by the viewport bottom (`07-drafting.png`); on **Enactment** the "ENACT ↑" captions crowd into the veto button (`08-enact-veto.png`); on **Vote** the "2/5 ballots in" line is clipped (`05-vote.png`). The layout is `h-[100dvh] … overflow-hidden`, so anything past the fold is lost rather than scrollable.
**Fix:** move the legcard caption inside the card (or above it), and reserve a fixed footer row in `ActionTray` so the count/labels are never under the fold. Re-check at 375×667 and at 375×640 (smaller Androids).

---

## P3 — Motion / graphics-over-text opportunities (priority per brief)

The client already nails several signature moments — keep these and extend the same language to the rest:
- ✅ **Ballot reveal** (`06-vote-reveal.png`): wax seals flip 3D to J/N per player, then "The slate passes". Excellent.
- ✅ **Policy track fill**: `PolicyCard` springs/drops in when a slot fills.
- ✅ **Game-over reveal** (`10-gameover-reveal.png`): seal stamp, faction columns, "♛ Hitler · executed", clear one-line reason. Strong.

Where plain text/static UI could become motion (each is currently a text panel or a number):

### 6. [MOTION] — Enacting a policy has no travel/impact animation
**Where:** `legislativeDeputy` → `enactPolicy`; track re-renders on next state.
**Want:** the chosen `LegCard` should physically fly from the Chancellor's hand into the next track slot and **slam with a wax-seal stamp** (screen-shake + ink splash), and if it lands on a power slot the **power glyph should ignite** in the same beat. Today the card just disappears and a slot quietly fills.

### 7. [MOTION] — Executive powers are static text panels
**Where:** `power` phase (`Survey`, `Inspect`, `Special Election`, `Execution`).
**Want:**
- **Inspect**: a sealed envelope/wax seal *cracks open* to reveal a red (Fascist) or green (Liberal) sigil — instead of the current text box.
- **Execution**: a stamp/strike animation lands on the target's seal in the Council ring, the seal shatters and desaturates (the ring already greys the dead — animate the *moment* of death).
- **Special Election**: the gavel visibly slides from the current President's seat to the appointed seat.
- **Survey**: the top three cards lift off a rendered deck, fan out, then flip face-down as you "return to the chamber".

### 8. [MOTION] — Election tracker and "chaos" are under-dramatised
**Where:** `Header` `ElectionTracker` (three dots); `chaos()` forced enactment.
**Want:** make the three dots a rising tension meter (ember/crack as failures mount); when the 3rd failure triggers chaos, play a distinct "the chamber falls into disorder" beat — the forced top-deck policy should flip over on its own and slam onto the track, visually different from a normal enactment so players register that no one chose it.

### 9. [MOTION] — The draw deck is just a number (`deckCount`)
**Where:** `PolicyTracks`/header area shows counts only.
**Want:** when the President "draws three", show three cards lifting off a physical deck stack; let the deck thin visibly and re-thicken on reshuffle (`ensureDeck`) so the deck-exhaustion mechanic is legible.

---

## Verified-good (no action needed)

- **Redaction is sound** — exhaustively checked the current `game.js` for n=5…10 and through legislative/power phases: Liberals see **no** other roles; Fascists see fellow Fascists + Hitler; Hitler sees Fascists only at n≤6; the President's secret `draw3`, the Chancellor's `deputy2`, the inspect `result`/`privateIntel`, and the survey `top3` are each delivered **only** to the owning seat. **No leaks found**, and the discard pile is never exposed.
- **All four win paths** (5 Liberal, 6 Fascist, Hitler executed, Hitler elected Chancellor with ≥3 Fascist policies) resolve correctly — the engine's own 26 tests pass and the logic battery reproduced each.
- **Election tracker / chaos**: 3 failed votes auto-enact the top policy, reset the tracker, and forget term limits. Correct.
- **Eligibility / term limits**: President & last Chancellor excluded; the "President eligible again at ≤5 alive" rule fires correctly; no empty-eligibility soft-lock found down to 3 alive.
- **Illegal moves** are rejected with clear errors (wrong-phase nominate/discard/enact/power, non-chair nominate, self-nominate, invalid ballot, double-discard).
- **Deck reshuffle** preserves the 17-card total when the discard is folded back in.
- **Landing & lobby** (`01`, `02`) render and function correctly on the live server (these don't touch roles, so they survive the stale-server bug).
```
```
