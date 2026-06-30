# Quest (Avalon) — QA Findings

**Tested:** live server at `http://localhost:3007`, mobile viewport 375×667 @2x (headless Chromium).
**Method:** (a) a protocol-level WebSocket harness driving 5/7/10 bot clients through **5 full games to completion** across every win path, asserting role/knowledge setup, vote/quest mechanics, and redaction on the raw per-player state; (b) a 6-test edge harness for disconnect/reconnect/soft-lock; (c) a real browser client + 4 auto-playing bots to capture each UI stage and check console/overflow.
**Date:** 2026-06-28.

## Scope covered
- Win paths driven to completion: `assassin_miss` (good), `assassin_hit` (evil), `three_fails` (evil), `five_rejects` (evil) — all reached and verified. Screenshots from a full 5-player game (good wins, assassin missed).
- Player counts 5, 7, 10 (evil counts 2/3/4) — composition + knowledge verified.
- Two-fails rule on quest 4 at 7 players — verified both directions (1 fail passes, 2 fails sink).
- Illegal/double actions, disconnect mid-vote/mid-quest, reconnect-by-name.

## What works well (verified, no action needed)
- **Redaction is solid at the protocol level.** Across `reveal/propose/vote/voteReveal/quest/questReveal/assassin`, no client's state ever contained another player's `role`/`team`; the raw `votes` map and individual quest `cards` are never sent (only `hasVoted`/`playedQuest` booleans, a progress count, and your own card); `assassin` id appears only in the assassin/over phases; `merlin` id only at `over`. Full reveal happens exactly at game-over. **No leaks found.**
- **Role/knowledge setup correct for every count:** evil counts 5→2, 7→3, 10→4; Merlin sees exactly the evil set; Percival sees exactly {Merlin, Morgana}; each evil sees fellow evil minus self; loyal sees nothing.
- **Vote/quest/win rules correct:** strict majority with ties rejecting; consecutive-reject tracker → evil at 5; good players' fail cards coerced to success server-side; two-fails on quest 4 (7+); first to 3 quest results; assassin hit/miss resolves correctly.
- **All input guards hold:** non-leader propose, off-team quest play, non-assassin strike, assassin targeting an evil player, and duplicate `vote`/`proceed` taps are all rejected/no-op'd server-side.
- **Console is clean:** 0 errors / 0 warnings across a full game. Page itself does not scroll (locked to 100dvh) on every in-game phase except the end screen (see #7).

---

# Prioritized findings

### 1. [MECHANICS] HIGH · vote phase · Voter disconnect mid-vote permanently stalls the table
**Repro:** 5 players, team proposed, 4 of 5 vote, the 5th closes their tab without voting. `removePlayer` only sets `connected=false`; nothing re-evaluates the vote, and `onVote` resolves only when a vote message arrives. The game sits in `vote` forever (verified: phase stayed `vote` 500ms+ after disconnect, never resolved).
**Why:** `onVote` is the only path that calls `resolveVote`; disconnects don't trigger a re-check.
**Fix:** On disconnect (and on a short grace timer), re-run the resolution check counting only connected players, or auto-cast a default (reject) for disconnected non-voters. Add a host "force-resolve"/kick affordance as a backstop.

### 2. [MECHANICS] HIGH · quest phase · Quest-member disconnect permanently stalls the quest
**Repro:** team approved, one of two members plays Success, the other closes their tab. `resolveQuest` only fires from `onPlay`; phase stays `quest` indefinitely (verified). No timeout, no recovery except that exact player reconnecting *and* playing.
**Fix:** Same pattern as #1 — re-check on disconnect / grace-timer; treat a disconnected member's missing card as a forced Success (good) or auto-resolve, or let the host reassign/skip.

### 3. [MECHANICS] HIGH · assassin phase · Assassin disconnect makes the game un-endable
**Repro (by inspection, same root cause):** in the `assassin` phase only `me.role==='assassin'` may strike. If the assassin disconnects, no one else can act and there is no timeout/kick → the game can never reach `over`. A completed good-team victory is left frozen.
**Fix:** On assassin disconnect with no reconnection in N seconds, auto-resolve as a miss (good wins) or allow host override.

### 4. [MECHANICS] MED · propose phase · Leader disconnect stalls until that exact player returns
**Repro:** in `propose`, the current leader closes their tab. The leader seat is **not** reassigned (`leaderIndex` only advances via `nextLeader()` on vote-reject/quest-advance). Only the leader may propose, so the table stalls. *Recoverable:* reconnecting by name restores the seat (new internal id, same leader) and they can propose — verified working. But a leader who never returns hard-stalls the game.
**Fix:** If the leader is disconnected for N seconds, pass leadership to the next connected player.

> Findings #1–#4 share one root cause: **disconnections are not handled during active phases** — no grace timer, no auto-default, no host skip/kick. The task scenario "a player closes their tab mid-vote" currently stalls the whole table. This is the highest-impact area to fix.

### 5. [MECHANICS / REDACTION-adjacent] HIGH · vote phase · Reconnect mid-vote leaves an orphan ballot that corrupts the tally
**Repro:** a player votes Approve, closes the tab, reconnects by name (gets a **new** internal id), then votes again. `this.votes` still holds the **old** id's ballot, so `resolveVote` counts `Object.values(this.votes)` = **6 ballots for 5 players** (verified: `lastVote.votes` had 6 entries). The extra ballot inflates the approve/reject count and can flip the result; the vote-reveal headline ("X approve · Y reject") and the per-card grid also draw from this map.
**Fix:** On reconnect, remap or clear the player's prior vote (key votes by a stable seat identity rather than the per-connection uuid, or delete the old id's entry when `existing.id` is reassigned in `BaseGame.addPlayer`). The same stale-id risk applies to `questCards` if a quest member reconnects mid-quest.

### 6. [MECHANICS] MED · vote phase · Approval denominator counts disconnected seats as implicit rejects
**Repro:** with one of 5 players disconnected (seat retained), the 4 present split 2–2. Approval uses `approves*2 > this.n` with `n` = total seats (5), so 2 approves of 4 present → **rejected** (verified). Disconnected seats silently weigh toward rejection, skewing balance and interacting badly with #1.
**Fix:** Decide the rule explicitly — base majority on connected players, or document that absent seats count as reject — and keep it consistent with the disconnect handling from #1.

### 7. [VISUAL] HIGH · game-over screen · Restart button is off-screen / unreachable on a phone
**Repro:** at 375×667 the end screen content is ~767px tall but lives in `main` (`overflow-hidden`) and the inner `.no-bar` scroller is **not height-constrained** (`clientHeight==scrollHeight==767`, `canScroll=false`), and the page itself doesn't scroll. The host's **"Hold court again"** button measures at `top≈849 / bottom≈897` — entirely below the 667 viewport and not scrollable to. The host literally cannot start a new game from a phone after a 5-player match; the bottom of "The court unmasked" is also clipped. See `qa-shots/10b-over-fullpage.png` (full-page capture still cuts off at the viewport, proving the clip) and `qa-shots/10-over.png`.
**Fix:** Restore the height chain so the OverStage scroller is bounded (`min-h-0`/`h-full` through the AnimatePresence `motion.div`), or let the over screen scroll the page (`max-h` → `min-h`), and/or pin the restart button as a fixed footer. This is the most player-blocking visual bug.

### 8. [VISUAL] LOW-MED · reveal / vote / over · Other stages rely on inner `overflow-y-auto` that can hide content
The reveal, vote/seat lists, and vote-reveal grid use `overflow-y-auto no-bar`. They fit at 5 players, but at 8–10 players (longer seat lists / 10-ballot reveal grid) content can scroll inside an unlabeled scroller with no scrollbar (`no-bar`), so players may not realize there's more below. Verify at 10p and add a subtle fade/affordance, or shrink rows to fit.

### 9. [VISUAL] LOW · vote screen · Approve iconography is ambiguous
Approve is rendered as an upright sword (`Ballot approve`), reject as an ✕. A raised sword can read as "attack/oppose." Colour (gold vs crimson) carries most of the meaning. Consider a clearer aye glyph (laurel, shield, or thumbs/✓) to pair with the ✕. See `qa-shots/05-vote.png`.

---

## MOTION / GRAPHICS-OVER-TEXT (priority category)

### 10. [MOTION] HIGH-value · quest reveal · Replace "PASS"/"FAIL" text cards with heraldic charges
The reveal already flips cards (nice), but each card just says the word **PASS**/**FAIL** (`qa-shots/11-quest-reveal.png`). You already have beautiful charges in `Crest.jsx` — the gold **laurel** (success) and crimson **crack/betrayal** mark (fail) used on the quest-track seals. Use those on the flip cards instead of text: shuffle the face-down cards, then flip each to a laurel seal or a cracking crimson seal, with the fail cards landing last and a screen-shake on a betrayal. Far more dramatic and on-theme than typography.

### 11. [MOTION] HIGH-value · vote reveal · Make the ballot tally a suspense beat, not a static list
Currently the verdict word ("Approved/Rejected") and the count appear immediately, then ballots flip in a flat 2-col grid (`qa-shots/06-vote-reveal.png`). Suggested: reveal ballots one-by-one into two columns/urns (aye vs nay), run a live tally counter, and **delay the Approved/Rejected verdict stamp** until the last ballot lands — a wax-seal "APPROVED/REJECTED" stamp thudding down. This is the core social moment of Avalon; it deserves the drama.

### 12. [MOTION] HIGH-value · assassin endgame · The strike has no animation
Selecting a target and tapping Strike jumps straight to the result screen. Add a beat: the blade (you already draw an assassin dagger sigil) sweeps across the chosen player's card, a crimson slash, then a held moment before the reveal flips to show whether it was Merlin. This is the single most cinematic moment in the game and is currently instantaneous.

### 13. [MOTION] MED · quest "rides out" / waiting states · Animate the companions, not a counter
"`1/2 have played · 1 fail sinks it`" (`qa-shots/07-quest-play.png`) is plain text. Show the chosen companions riding out / laying cards face-down (a face-down card sliding in per player as they commit), so the table *feels* the quest assembling.

### 14. [MOTION/UX] MED · all reveals · Any single tap skips the reveal for everyone
`ProceedButton` advances the shared phase, so one over-eager player (or, in testing, a bot) instantly skips the vote-reveal/quest-reveal animation for the whole table. With the richer reveals above this becomes worse. Consider a minimum on-screen duration before "continue" is enabled, or require a majority/all-acknowledge to advance.

### 15. [MOTION] LOW · quest track seal flip · Good polish already present
The quest-track seals (signature element) animate nicely (current seal bobs, completed seals flip in) and the two-fails badge ("2" on quest IV at 7+) is correctly shown — verified. No change needed; called out as a strength to preserve. See `qa-shots/03-reveal-assassin.png` header.

---

## Quick reference — severity counts
- **MECHANICS:** 6 findings (4 HIGH: #1, #2, #3, #5; 2 MED: #4, #6). Core rules + redaction are otherwise correct.
- **VISUAL:** 3 findings (1 HIGH: #7; 1 LOW-MED: #8; 1 LOW: #9).
- **MOTION/graphics-over-text:** 6 findings (3 high-value: #10, #11, #12; 2 MED: #13, #14; 1 LOW/strength: #15).
- **ERRORS:** none (0 console errors; all action guards verified).

## Screenshots
All under `games/quest/qa-shots/`: `01-landing`, `02-lobby-full`, `03-reveal-assassin`, `04-rules-modal`, `05-vote`, `06-vote-reveal`, `07-quest-play`, `07b-quest-loyal-locked` (Sabotage locked for good), `08-propose-leader`, `08b-propose-selected`, `09-assassin`, `09b-assassin-selected`, `10-over`, `10b-over-fullpage` (shows end-screen clip), `11-quest-reveal`.
