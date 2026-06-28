# The Council

A real-time party game of hidden roles and legislative deduction for **5–10
players** — *The Council* is a faithful reimplementation of **Secret Hitler**. A
secret minority of **Fascists**, hiding a single **Hitler** among them, schemes to
seize a candle-lit Council while the **Liberal** majority tries to keep it honest —
by enacting policy, reading the room, and wielding executive power. The mechanics
and the Liberal / Fascist / Hitler theme follow the original; the title, visual
identity, artwork (inline SVG), and all flavor text are this build's own.

> Identity: a candle-lit guild chamber — forest-green felt, brass fittings, ivory
> parchment ballots, crimson wax seals. Signature moments: the dual **policy track**
> filling with wax-sealed parchment cards, and the **wax-seal ballot reveal**.

## Run it

```bash
npm install
npm run build      # bundles the client into dist/
PORT=3004 npm start
# open http://localhost:3004
```

Development (hot reload, client on :5173 proxying ws to the server):

```bash
PORT=3004 npm run dev
```

Tests (pure engine logic, no network):

```bash
npm test
```

The server reads `process.env.PORT` (defaults to **3004**). It serves the built
client and runs the authoritative game over WebSockets at `/ws`.

## How to play

Each player is secretly dealt a role:

- **Liberals** — the majority. They don’t know one another.
- **Fascists** — the minority. They recognise each other.
- **Hitler** — one member of the Fascist team the others must elevate to Chancellor.
  At **5–6** players Hitler knows the Fascists; at **7+** they sit blind among them
  (and the Fascists still know who Hitler is).

Role counts scale with the table (e.g. 5p → 3 Liberals + 1 Fascist + Hitler;
10p → 6 Liberals + 3 Fascists + Hitler).

### A round

1. The rotating **President** nominates a **Chancellor** to form a slate.
2. Every living member votes **Ja** or **Nein**. A *strict majority* passes it.
3. If it passes, the President draws **3** policies and discards **1** in secret; the
   Chancellor enacts **1** of the remaining **2** onto the track.
4. Three failed votes in a row throw the chamber into disorder — the top policy is
   force-enacted with no power granted, and term limits reset.

The deck holds **6 Liberal** and **11 Fascist** policies; it reshuffles with the
discards when it runs low.

### Executive powers

Each **Fascist** policy can hand the President a power, scaled to the table size:

| Power | What it does |
|-------|--------------|
| **Inspect** | See one member’s allegiance — privately. |
| **Special Election** | Name the next President, then rotation resumes. |
| **Survey** | Read the top three policies in secret. |
| **Execution** | Remove a member. If it’s Hitler, the Liberals win. |

Powers trigger at different Fascist-track positions for 5–6, 7–8, and 9–10 player
games. Once **5** Fascist policies are down, the Chancellor may move to **veto** an
agenda; if the President consents it’s struck (counting as a failed election).

### Winning

- **Liberals** win by enacting **5 Liberal** policies, *or* by executing Hitler.
- **Fascists** win by enacting **6 Fascist** policies, *or* by getting **Hitler**
  elected **Chancellor** once **3+** Fascist policies are already down.

A rules card is available in-game (the **Rules** button) at any time.

## Architecture

- `server/index.js` — generic room/WebSocket server (rooms keyed by 4-letter code,
  reconnect-by-name). From the template; unmodified except the default port.
- `server/base-game.js` — lobby/player/broadcast plumbing (template; do not edit).
- `server/game.js` — **the authoritative engine**: roles, deck, election, the
  legislative session, executive powers, and every win path. The server broadcasts
  a per-player **redacted** view — players only ever learn what their role permits,
  and the President’s discard is never revealed.
- `server/game.test.mjs` — 26 engine tests (role distribution, voting/election
  tracker, draw/enact, power triggers, every win condition, redaction, full reveal).
- `client/` — React + Vite + Tailwind + Framer Motion. `App.jsx` (landing/lobby),
  `Game.jsx` (the table), `Rules.jsx`, `lib.jsx` (vocabulary + SVG emblems).

Server-authoritative throughout: clients send intents (`{ t: 'nominate' | 'vote'
| 'discard' | 'enact' | 'power' | … }`); the server validates, mutates, and
re-broadcasts. Disconnected players keep their seat and can rejoin by name; a
disconnected member’s ballot counts as **Nein** so the table never stalls.

## Accessibility & polish

Mobile-first, fits one `100dvh` screen on a 375×667 phone, visible keyboard focus,
and full `prefers-reduced-motion` support (animations collapse to instant).
