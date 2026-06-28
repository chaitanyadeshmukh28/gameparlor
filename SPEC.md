# Parlor — shared build spec for all games

We are rebuilding the netgames.io lineup as a suite of beautiful, real-time
multiplayer party games you can play with friends from anywhere. **Coup** is
already built (at the repo root: `server/`, `client/`) and is the reference
implementation. This document is the contract every game must follow.

Read this fully, then read the reference app and the template before building.

## The lineup

Each game is re-themed with an **original name, theme, and content** (so we never
reproduce a trademarked name, published word list, role text, or artwork — only
the *mechanics*, which are free to reimplement). Identities:

| slug        | Name         | Based on (mechanics) | Players | Port | Identity in one line |
|-------------|--------------|----------------------|---------|------|----------------------|
| nightfall   | **Nightfall**   | One Night Ultimate Werewolf | 3–8 | 3002 | Nocturnal village under a huge moon — indigo & silver, gothic. |
| cipher      | **Cipher**      | Codenames            | 4–8 (2 teams) | 3003 | Mid-century ops room — ink black, red/blue teams, brass, stencil. |
| council     | **The Council** | Secret Hitler        | 5–10 | 3004 | Candle-lit guild chamber — forest green, brass, ivory ballots, wax seals. |
| undercover  | **Undercover**  | Spyfall              | 3–8 | 3005 | Film-noir interrogation — high-contrast B/W + one neon accent. |
| sealed      | **Sealed**      | Love Letter          | 2–6 | 3006 | Rococo romance — blush, rose-gold, plum, pressed-flower elegance. |
| quest       | **Quest**       | Avalon / The Resistance | 5–10 | 3007 | Arthurian heraldry — steel blue, crimson, gold leaf, illuminated caps. |
| intercept   | **Intercept**   | Decrypto             | 4–8 (2 teams) | 3008 | WWII signals room — terminal green on black, amber warnings, monospace. |

Coup occupies port 3001. The dashboard ("Parlor") occupies 3000.

**Crucial:** every game must look unmistakably its own — different palette,
typography, and signature element from Coup *and* from each other. Do not converge
on a shared look.

## ⚠️ Safety: a live game is running

A Coup server is **actively in use on port 3001** (people are playing right now).
Do not disrupt it:
- **Never** run `pkill -f node`, `pkill -f server/index.js`, `killall node`, or any
  broad process kill — that filename is shared by every game and would kill the
  live server. Manage only *your own* server, and only by its specific PID or by
  the port you own.
- Use **your assigned PORT** (see the table) and nothing else. Never bind 3001.
- Don't modify, build into, or delete anything outside your own
  `games/<slug>/` folder (and never the repo root's `server/`, `client/`, `dist/`).

## Architecture (identical for every game)

- **One Node service per game.** Express serves the built client (`dist/`) AND
  runs the authoritative game over WebSockets on path `/ws`. Reads `process.env.PORT`.
- **Server is authoritative.** Clients send intents; the server validates,
  mutates state, and broadcasts a **per-player view** so each player only sees
  their own secret information. Never trust the client.
- **Rooms** keyed by a 4-letter code (unambiguous alphabet). Players join with a
  name; reconnect by name resumes their seat. Disconnected players are handled
  gracefully (don't stall the table).
- **No database** — rooms live in memory.

## Stack & layout (identical for every game)

Node 20, ES modules. Single `package.json` at the game root.

```
games/<slug>/
  package.json            scripts: dev, build, start, test
  vite.config.js          root: 'client', build.outDir '../dist', /ws proxy in dev
  tailwind.config.js      design tokens — OVERRIDE per identity
  postcss.config.js
  server/
    index.js              generic room/ws server (from template, rarely changed)
    base-game.js          BaseGame class (from template, do not edit)
    game.js               YOUR game engine — extends BaseGame
    game.test.mjs         engine rules tests (REQUIRED)
  client/
    index.html
    src/ main.jsx, index.css, net.js, App.jsx, components/...
  README.md
```

Start from `/mnt/c/Users/cdoff/OneDrive/Desktop/Chaitanya/work/coup/template/` —
copy it into your `games/<slug>/` folder, then build on top. Study the Coup
reference at the repo root (`server/game.js`, `server/index.js`,
`client/src/components/*`) for patterns (Card flips, prompts, status, no-scroll
layout, reconnect).

## Server contract — BaseGame

`server/base-game.js` already implements lobby/room/player/reconnect/broadcast
plumbing. Your `server/game.js` does:

```js
import { BaseGame } from './base-game.js';
export class Game extends BaseGame {
  constructor(code) { super(code); this.minPlayers = X; this.maxPlayers = Y; }
  setup() { /* deal/init; set this.phase = 'play' (or your first phase) */ }
  handleMessage(playerId, msg) { /* validate + mutate; return {error} on bad input */ }
  gameView(playerId) { /* return game-specific, per-player-redacted state */ }
  cleanup() { /* optional: clear game state on return-to-lobby */ }
}
```

The generic server handles `create/join/start/leave/restart` for you and forwards
every other message to `handleMessage`. After any successful handler it broadcasts
`viewFor(playerId)` to each player. Call `this.note(text)` to push to the shared
log (used sparingly — prefer in-UI feedback; do NOT build a giant scrolling log).

## Client contract

`client/src/net.js` exports `useGameSocket()` → `{ status, state, you, code,
error, send, create, join }`. Same shape as Coup. `state` is whatever your
`viewFor` returns. Render authoritatively from `state`; send intents via `send({ t: 'whatever', ... })`.

## Design mandate (this is graded)

Follow the frontend-design principles: a distinctive, intentional visual identity
per the table above. Specifically:
- **Avoid the AI-default looks:** (1) cream + high-contrast serif + terracotta;
  (2) near-black + single acid accent; (3) broadsheet hairline-rule newspaper.
  Coup already owns "velvet oxblood court." Pick something genuinely different.
- A characterful **display typeface** (Google Fonts) paired deliberately with a
  clean body face. Make type part of the personality.
- One memorable **signature element** per game (see identity table).
- **Motion with purpose** (Framer Motion): deals, reveals, vote tallies, timers.
  Respect `prefers-reduced-motion`.
- **Mobile-first, no-scroll where feasible** (Coup fits one `100dvh` screen on a
  375×667 phone — match that bar). Visible keyboard focus.
- A **how-to-play / rules** affordance players can open mid-game (Coup has a
  cheat-sheet modal — beginners will be playing).

## Content & IP rules

- Original game **name & theme** (use the table; don't reuse trademarked names).
- Generate your **own content**: word lists (Cipher/Intercept), locations
  (Undercover), role/character names & flavor text (Sealed/Quest/Council/Nightfall).
  Do not copy any specific published list, card text, or artwork. Words themselves
  are free; a *curated copy* of someone's set is not — write your own.
- Emblems/art: draw your own (inline SVG, like Coup's engraved emblems).

## Definition of done

1. `npm install && npm run build` succeeds (client bundles into `dist/`).
2. `npm test` runs engine tests that cover the core rules and pass.
3. `npm start` serves a playable game; `node` server is authoritative.
4. A full round is reachable: create → others join → start → play → win/end →
   play again. Verify it (the Coup build used Playwright to drive 2 clients and
   screenshot; do the same — confirm no console errors and the UI fits a phone).
5. Unique, polished visual identity matching your row in the table.
6. A short `README.md` (how to run, the rules in brief).

Build the whole thing. Don't stub. When in doubt, match Coup's quality bar.
