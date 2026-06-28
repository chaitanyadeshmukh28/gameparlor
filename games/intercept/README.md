# Intercept

A real-time, two-team signals-duel for **4–8 players** — codes go out over the
wire, and the watch that reads the enemy's transmissions first wins. Mechanics
are inspired by *Decrypto*; the name, theme, words, and art are original.

> **Identity:** a WWII signals/codebreaking room rendered on a phosphor CRT —
> terminal green on black, amber "eyes-only" code lamps, oscilloscope traces,
> stencil + monospace type, and aged code-sheet paper for your keyword slots.

## Run it

```bash
npm install
npm run build        # bundles the client into dist/
PORT=3008 npm start  # serves the app + authoritative WebSocket game on :3008
```

Open `http://localhost:3008`, create a station, and share the 4-letter code.
For development with hot reload: `PORT=3008 npm run dev`.

```bash
npm test             # engine rule tests (no network) — 40 assertions
```

## How to play

Two **watches** (teams) each hold **4 secret keywords** in numbered slots
**1–4**, known only to that watch.

Each round, both watches play simultaneously:

1. **Transmit** — one **Encryptor** per watch receives a secret **3-digit code**
   (a permutation of three of {1,2,3,4}, e.g. `4-2-1`) and gives **one clue per
   digit**, hinting that slot's keyword — subtly, so the enemy can't read it.
2. **Decode** — your own watch maps the clues back to the code. Miss it and your
   watch takes a **Miscommunication** token.
3. **Intercept** — from round 2 on, you also guess the *enemy's* code from their
   clues plus the **Intercept Log** (every clue ever sent, filed under the slot
   it really meant). Crack it and you take an **Interception** token.

The Encryptor role rotates through each watch every round; everyone else on the
watch are the decoders.

### Winning

- **2 Interception** tokens → that watch **wins**.
- **2 Miscommunication** tokens → that watch **loses** (the enemy wins).
- If neither happens by round **8**, the most interceptions wins (then fewest
  miscommunications; otherwise a draw).
- If both terminal conditions land in the same round, an interception win takes
  precedence.

The tension: vary how you clue a keyword each round, or the enemy maps your
slots and reads every code you send.

## Architecture

- `server/index.js` — generic room/WebSocket server (create/join/start/restart,
  per-player broadcast, reconnect-by-name). From the Parlor template.
- `server/base-game.js` — lobby/player plumbing (`BaseGame`). Unmodified.
- `server/game.js` — the **Intercept engine** (`Game extends BaseGame`):
  setup/deal, code generation, clue transmission, decode + interception
  resolution, token accrual, win/lose/tiebreak, and per-player redaction.
- `server/words.js` — the original 128-word keyword pool.
- `client/src/App.jsx` — the signals-room UI (React + Framer Motion).

**Server is authoritative.** Each broadcast is redacted per player:

- a watch's 4 keywords are sent **only to that watch**;
- the active code is sent **only to that round's Encryptor**;
- decode/intercept guesses are visible only to the watch making them, until the
  round resolves;
- clues are **public** the moment they're transmitted — overhearing them is the
  whole game.

## Notes & limitations

- The lobby balances watches automatically; players can switch before start.
  Each watch needs **at least 2** players (one Encryptor, one+ to decode).
- Disconnected players keep their seat and can rejoin by name; the engine
  recomputes who is required to act so a dropped player doesn't stall a round.
- No persistence — rooms live in memory and clear when empty.
