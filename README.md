# Coup

A real-time, multiplayer game of bluff and intrigue for **2–6 players**. Host a
table, share the 4-letter code, and play with friends from anywhere.

Built as a single Node service: an authoritative game engine over WebSockets,
serving a React + Framer Motion front end.

![velvet & gilt court table](#)

## Play locally

```bash
npm install
npm run dev      # client on http://localhost:5173, server on :3001
```

Open `http://localhost:5173`, host a table, and open the same URL in another tab
(or device) to join with the code. The Vite dev server proxies WebSockets to the
game server automatically.

### Production build

```bash
npm run build    # bundles the client into dist/
npm start        # serves the app + game on http://localhost:3001
```

### Tests

```bash
npm test         # 33 rules assertions against the game engine
```

## How it works

- **`server/game.js`** — the entire ruleset as a pure, deterministic state
  machine (actions, challenges, blocks, blocked-block challenges, influence
  loss, exchange, win detection). No networking, fully unit-tested.
- **`server/index.js`** — Express + `ws`. Holds rooms in memory, routes player
  intents into the engine, and broadcasts a **per-player view** so you only ever
  see your own face-down cards.
- **`client/`** — React. `net.js` is a thin auto-reconnecting socket; the UI
  renders whatever authoritative state the server sends.

Players who disconnect can rejoin with the same name and code; the table waits.
Disconnected players are auto-passed in response windows so a game never stalls.

## Deploy so friends can join from anywhere

You need one host that speaks WebSockets. The repo is a single web service —
`npm install && npm run build`, then `npm start` — so any of these work.

### Render (recommended, has a free tier)

A `render.yaml` blueprint is included.

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, pick the repo, and accept the plan.
3. Render runs the build and gives you a public `https://…onrender.com` URL.

That URL is your table. Share it; friends host/join from their own browsers.

> Free Render services sleep after inactivity and take ~30s to wake on the first
> visit. Fine for game nights; upgrade to a paid instance to keep it warm.

### Railway / Fly.io / a VPS

Same shape — set the start command to `npm start` and expose `$PORT`
(the server reads `process.env.PORT`, default `3001`). WebSockets work out of the
box on all three. On a plain VPS, put it behind Nginx/Caddy with WebSocket
upgrade headers and TLS.

## The rules, in brief

Everyone starts with 2 secret influence cards and 2 coins. On your turn take one
action. Anyone may **challenge** a claimed character (lose a card if you're
wrong — or catch a liar); the right character may **block** certain actions.
Lose both influence and you're out. Last conspirator standing wins.

| Action | Effect | Claim | Counter |
|---|---|---|---|
| Income | +1 coin | — | unstoppable |
| Foreign Aid | +2 coins | — | Duke blocks |
| Coup | Pay 7, kill a card | — | unstoppable |
| Tax | +3 coins | Duke | — |
| Assassinate | Pay 3, kill a card | Assassin | Contessa blocks |
| Steal | Take 2 coins | Captain | Captain / Ambassador block |
| Exchange | Swap with the deck | Ambassador | — |

At 10+ coins you must launch a coup.
