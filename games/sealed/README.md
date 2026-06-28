# Sealed

A real-time, multiplayer parlor game of secrets, duels, and one perilous letter —
built on the mechanics of *Love Letter*, dressed in an original **rococo romance**
identity (blush, rose-gold, deep plum, cream parchment). Part of the **Parlor** suite.

> 2–6 courtiers. One screen. Pass a sealed letter through a salon of intrigue and
> be the last one holding — or hold the highest letter when the courier’s satchel
> runs dry. Win rounds to earn **Favors**; first to the Favor goal wins the soirée.

## Run it

```bash
npm install          # (deps hoist from the repo root if already installed)
npm run build        # bundle the client into dist/
PORT=3006 npm start  # serve the game + authoritative websocket on :3006
# open http://localhost:3006
```

Dev mode (Vite client on :5173 proxying /ws to the server):

```bash
PORT=3006 npm run dev
```

Tests (pure engine rules — no network, no port):

```bash
npm test
```

## How to play

You hold a single secret **letter**. On your turn you draw a second and **play
one**, resolving its effect. If a played effect knocks you out, you’re out for the
round. A round ends when only one courtier remains, or when the deck empties — then
the **highest letter held** wins (ties broken by the sum of letters discarded).
The round winner takes a **Favor**. First to the Favor goal (7 for 2 players, down
to 4 for 5–6) wins the game.

### The eight letters

Cards use the standard, recognizable Love Letter names (with an evocative tag on
each card's art):

| Rank | Card | × | Effect |
|----:|----------------|--:|--------|
| 1 | **Guard** | 5 | Name a rank (2–8); if a chosen rival holds it, they’re out. |
| 2 | **Priest** | 2 | Look at one rival’s hand. |
| 3 | **Baron** | 2 | Compare hands with a rival; the lower hand is out. |
| 4 | **Handmaid** | 2 | You can’t be targeted until your next turn. |
| 5 | **Prince** | 2 | Force a player (even yourself) to discard their hand and redraw. |
| 6 | **King** | 1 | Trade hands with another player. |
| 7 | **Countess** | 1 | Must be discarded if held with the King or the Prince. |
| 8 | **Princess** | 1 | If you ever discard her, you’re out. |

Sixteen cards in all. One is set aside face-down each round; in a 2-player round,
three more are revealed face-up.

### Edge cases handled

- **Handmaid immunity** lifts at the start of your own next turn.
- **Countess** is force-played beside the King or Prince.
- Targeting a card when **every rival is shielded** plays with no effect.
- Discarding the **Princess** (by play or by the Prince) eliminates that player.
- The **Prince** redraws from the **set-aside card** when the satchel is empty.

## Architecture

- `server/game.js` — the authoritative engine (`Game extends BaseGame`). Pure
  logic; the per-player `gameView` reveals only the viewer’s own hand. Secret
  effects (a peek, a duel readout, a trade) are whispered **only** to the player
  who earned them. Disconnected courtiers are auto-played so the table never stalls.
- `server/index.js` / `server/base-game.js` — generic room/websocket plumbing
  (from the Parlor template; unchanged).
- `client/` — React + Vite + Tailwind + Framer Motion. The signature element is the
  single parchment **letter in hand**, with a sealed-letter **delivery + wax-seal**
  flourish whenever a card is played, plus knockout and round-win animations.
- `server/game.test.mjs` — 47 rules assertions covering every letter’s effect, the
  Countess and Handmaid rules, elimination, hand redaction, and round/game wins.

### Type & palette

Display **Cormorant Garamond**, body **EB Garamond**. Plum `#170c19` ground, blush
`#f7d6df`, rose `#e29ab2`, rose-gold `#e3bd86`, cream `#f6eede`, sealing-wax
`#b6384e`. Respects `prefers-reduced-motion`; visible keyboard focus throughout.
