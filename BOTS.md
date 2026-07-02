# AI Players (bots) — build contract

Players can add **AI opponents** ("bots") in the lobby. Bots are virtual seats the
**server** drives — they have no socket. The shared plumbing is already built; each
game only implements its own decision logic + a lobby button.

## What's already done (shared — do NOT touch)
- `server/mount.js` handles `{t:'addBot'}` / `{t:'removeBot', id}` (host-only, lobby-only)
  and runs the **bot tick**: after every state change it calls `game.botDecide(view, rng)`
  for each bot and applies the returned move, one at a time (~850ms apart), until no bot
  owes a move. Rooms are kept alive only while a **human** is connected.
- `server/base-game.js` (BaseGame) already has `addBot(name)` / `removeBot(id)` and includes
  `isBot` in the generic player list from `viewFor`.

## What YOU implement for your game (only inside `games/<slug>/`)

### 1. `botDecide(view, rng)` on your `Game` class (server/game.js)
- Signature: `botDecide(view, rng = Math.random) { ... }` where `view` is exactly
  `this.viewFor(botId)` (the bot's **redacted** view — same info a human sees) and `rng()` → [0,1).
- **Return the next message the bot should send** — the SAME object shape a human client
  sends into `handleMessage` for your game (inspect `client/src/**` `send({t:...})` calls and
  your `handleMessage` switch). Return `null` when the bot owes no move right now.
- Only ever return a **legal** move for that bot given the view. If it returns an illegal
  move the tick skips it, but avoid it — infinite skipping stalls the bots.
- Handle every phase where a bot could owe an action: its turn, simultaneous votes/night
  actions, forced reveals/discards, clue/guess phases, "proceed/continue" acks, etc.
- Keep it a **reasonable** heuristic (not perfect). For language games (Cipher clues,
  Undercover questions/answers, Intercept clues) use small built-in word lists / templates —
  keep the `botDecide(view)` seam so an LLM can replace the internals later.

### 2. Make sure bots are first-class players
- `setup()` must initialize bot players too (they're normal entries in `this.players` with
  `isBot:true`). Usually already true if you iterate `this.players`.
- If your `gameView()` builds its OWN players array (instead of the BaseGame default), add
  `isBot: !!p.isBot` to each entry so the client can label them.

### 3. Lobby UI (client/src/…): host-only
- Add an **"+ Add AI player"** button → `send({ t: 'addBot' })`, shown while the room isn't full.
- Show an **AI** badge on bot seats; for the host, a ✕ to remove → `send({ t: 'removeBot', id: p.id })`.
- Match your game's existing lobby style.

## Reference implementation (Coup — already done, copy the pattern)
- `games/coup/server/game.js`: `handleMessage`, `botDecide`, `addBot/removeBot`, `isBot` in view.
- `games/coup/client/src/components/Lobby.jsx`: Add-AI button, AI badge, remove ✕.

## Testing (REQUIRED — do not use the shared server on :3000)
Write an **in-process** test (no network, no port) modeled on your existing
`server/game.test.mjs`: import your `Game`, create it, `addBot()` enough bots to fill the
minimum, `start()`, then loop calling `botDecide(viewFor(botId))` for each bot (and scripting
one human with trivial legal moves) until `phase === 'over'` or the game clearly progresses —
assert it reaches a terminal state with **no throws and no stall**. Run it with
`node games/<slug>/server/game.test.mjs` (or a new `*.bots.test.mjs`). Also
`npm run build --workspace games/<slug>` must succeed.

## Rules
- Modify **only** files under your `games/<slug>/`. Never edit `server/`, `dist/`,
  `dashboard/`, other games, or shared configs. Do not restart the :3000 server.
