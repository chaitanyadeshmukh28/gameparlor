# Nightfall

A real-time, multiplayer party game of secret roles and one fateful night —
mechanics based on *One Night Ultimate Werewolf*, with an entirely original name,
theme, and content. **3–8 players.**

> A nocturnal village under a huge moon. Each player is dealt one secret role.
> Night falls, roles wake and scheme in the dark, dawn breaks — and the village
> votes on who to hang. Because cards get swapped in the night, you may not be
> what you were dealt. The winner is decided by your **final** card.

Identity: indigo & silver, gothic display type (Cormorant Garamond), a signature
**moon** that hangs full and silver through the night, then warms to amber and
descends to the horizon at dawn. Role cards flip in the dark with a silver shimmer.

## Run it

```bash
npm install
npm run build      # bundles the client into dist/
PORT=3002 npm start
```

Then open **http://localhost:3002**. One player hosts a village and shares the
4-letter code; everyone else joins from their own phone. Reconnect by re-joining
with the same name.

Dev mode (client on :5173, server on :3002 with hot reload):

```bash
PORT=3002 npm run dev
```

Run the engine tests:

```bash
npm test
```

## The rules in brief

Total cards dealt = **players + 3**; the three spare cards rest face-down in the
**center**. The deck always contains at least two Werewolves and the core
specials, filling the rest with Villagers (and, at larger tables, the Insomniac
and the Tanner). Roles use the standard One Night Ultimate Werewolf names, each
with an optional nocturnal nickname shown as a subtitle.

**Roles** (standard names · nickname):

| Role | Team | Night action |
|------|------|--------------|
| **Werewolf** · Nightclaw | Werewolves | Wake with the other Werewolves and learn each other. A *lone* wolf may glimpse one center card. |
| **Seer** · Stargazer | Village | Look at one player's card, **or** two of the center cards. |
| **Robber** · Prowler | Village | Swap your card with another player's, then look at your new role. |
| **Troublemaker** · Meddler | Village | Swap two *other* players' cards — without looking. |
| **Insomniac** · Sleepless | Village | At the very end of night, look at your own (possibly changed) card. |
| **Villager** · Hearthkeeper | Village | No night action. |
| **Tanner** · Outcast | — | No night action. Wins **only** if eliminated. |

**Phases:** deal → **Night** (roles wake in the fixed order *Werewolves → Seer →
Robber → Troublemaker → Insomniac*; each acts privately) → **Day** (free
discussion; the host can run a countdown timer) → **Vote** (everyone accuses
simultaneously) → **Result** (all cards revealed; winners decided on final cards).

**Voting:** a player needs at least **two** votes to be eliminated; everyone tied
for the most votes is eliminated together. If no one reaches two votes, no one dies.

**Winning** (judged on *final* card positions):

- **Village** wins if at least one Werewolf is eliminated — or, if no Werewolves
  are in play, if *no one* dies.
- **The Werewolves** win if no Werewolf is eliminated.
- **The Tanner** wins only by being voted out (and the Village still wins too if a
  Werewolf also dies).

## Architecture

- `server/index.js` — generic room/WebSocket server (shared template).
- `server/base-game.js` — lobby/room/reconnect plumbing (shared template).
- `server/game.js` — the Nightfall engine (extends `BaseGame`). Server-authoritative;
  `gameView` redacts so players never receive others' roles or private night info.
- `server/game.test.mjs` — engine tests (deck building, wake order, swaps, seer
  peeks, win determination, redaction, disconnect handling).
- `client/` — React + Vite + Tailwind + Framer Motion UI.

Built on the shared Parlor template. Original art (inline SVG emblems), palette,
typography, and copy.
