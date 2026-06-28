# Cipher

A real-time, two-team codeword duel for **4–8 players** — original game in the
**Parlor** suite, built on the mechanics of Codenames with an entirely original
name, theme, and word list.

> **Identity:** a mid-century intelligence ops room — ink black, brass fittings,
> red vs blue command, stencil & typewriter type. The signature element is the
> **5×5 dossier-card grid** with dramatic flip reveals and a screen-flash
> "TERMINATED" moment when the assassin is uncovered.

## Run it

```bash
npm install
npm run build      # bundles the client into dist/
npm start          # serves the game + WebSocket on $PORT (default 3001)
```

Then open the printed URL. To run on a specific port:

```bash
PORT=3003 npm start
```

For development with hot reload (client on :5173, server on $PORT):

```bash
npm run dev
```

## Tests

```bash
npm test
```

The engine tests (`server/game.test.mjs`) cover key generation (9 / 8 / 7
bystanders / 1 assassin), spymaster-only key redaction, clue validation, guess
resolution (continue / end-turn / enemy-helps-enemy / assassin loss), win
detection, setup validation, and reconnect.

## How to play

Two teams — **Red** and **Blue** — race to contact all of their secret agents
hidden among **25 codewords**. Each team has:

- one **Spymaster**, who alone sees the secret key, and
- one or more **Operatives**, who do the guessing.

In the lobby, every player picks a team and a role (each team needs exactly one
spymaster and at least one operative; minimum two players per team).

### The board
- **9** agents for the starting team, **8** for the other.
- **7** neutral bystanders.
- **1** assassin.

### A turn
1. The active **Spymaster** transmits a one-word clue and a number — how many
   tiles it points to.
2. **Operatives** tap tiles. A correct agent lets them keep going, up to the
   number **+ 1**. They may stop after at least one guess.
3. Tapping a **bystander** or an **enemy agent** ends the turn immediately (an
   enemy tile is revealed for the enemy, helping them).
4. Tapping the **assassin** loses the game instantly for the guessing team.

The first team to contact **all** of its agents wins. The game ends at once if
the assassin is revealed.

## Architecture

- **`server/`** — authoritative engine. `game.js` extends the shared `BaseGame`
  (lobby/room/reconnect plumbing in `base-game.js`); `index.js` serves `dist/`
  and runs the game over `/ws`. `words.js` holds the original codeword pool.
- **`client/`** — React + Vite + Tailwind + Framer Motion. The server broadcasts
  a **per-player redacted view**: a tile's identity is sent over the wire only if
  it is already revealed, the game is over, or the viewer is a spymaster — so
  operatives can never read the key from network traffic.

Server-authoritative throughout: clients send intents (`seat`, `clue`, `guess`,
`stop`); the server validates and broadcasts new state.
