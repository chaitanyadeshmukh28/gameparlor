# Quest

A real-time, hidden-loyalty party game for **5–10 players**, one phone each.
Mechanics and the classic role names are from *The Resistance: Avalon*; the
theme, art, and presentation are original — Arthurian heraldry rendered in steel
blue, gold leaf, and crimson.

> The realm of Camelot holds five quests. The **loyal** want them to succeed; the
> hidden **treacherous** want them to fail. First side to three quest results wins
> — but even a victorious realm can fall if the Assassin finds Merlin.

## Run it

```bash
npm install
npm run build      # bundles the client into dist/
npm start          # serves the game + WebSocket on $PORT (default 3001)
```

Then open the printed URL, **Hold Court** to create a room, and share the 4-letter
code. Players **Join Court** with the same code; reconnect anytime by re-entering
the same name.

```bash
npm run dev        # hot-reloading client (5173) + auto-restart server
npm test           # engine rules tests (97 assertions, no network)
```

This game is assigned **port 3007** in the Parlor suite: `PORT=3007 npm start`.

## The rules in brief

1. **Roles are dealt secretly.** The realm (Good) is the majority; the shadow
   (Evil) is the minority. Special roles below.
2. **Each round the Leader proposes a team** of the size shown on the quest seal,
   then **everyone votes Approve / Reject at once.** Majority approves. Five
   rejected proposals in a row and Evil seizes the realm.
3. **The approved team rides out.** Each member secretly plays **Success** or
   **Fail**. The loyal *must* play Success; the treacherous may play either. Only
   the **tally** of fails is ever revealed — never who failed.
4. **One Fail sinks a quest** — except the **4th quest with 7+ players**, which
   needs **two**.
5. **First side to three quest results wins.** If Good completes three quests, the
   **Assassin** gets one final strike: name Merlin correctly and Evil steals the
   victory.

### Player-count tables

| Players | Good | Evil | Quest team sizes |
|--------:|-----:|-----:|------------------|
| 5  | 3 | 2 | 2 · 3 · 2 · 3 · 3 |
| 6  | 4 | 2 | 2 · 3 · 4 · 3 · 4 |
| 7  | 4 | 3 | 2 · 3 · 3 · 4* · 4 |
| 8  | 5 | 3 | 3 · 4 · 4 · 5* · 5 |
| 9  | 6 | 3 | 3 · 4 · 4 · 5* · 5 |
| 10 | 6 | 4 | 3 · 4 · 4 · 5* · 5 |

\* the 4th quest needs **two** fails to fail.

### Roles

Standard Avalon role names; a flavor subtitle accompanies each in the UI.

| Role | Side | Knowledge / power |
|------|------|-------------------|
| **Merlin** | Good | Secretly sees every Minion of Mordred. Steer the realm without exposing yourself. |
| **Percival** | Good | Sees Merlin and Morgana, but not which is which. |
| **Loyal Servant of Arthur** | Good | Knows nothing. Read the table and vote wisely. |
| **Assassin** | Evil | Knows the other Evil. If the realm wins, may strike Merlin to steal it. |
| **Morgana** | Evil | Knows the other Evil; appears as Merlin to Percival. |
| **Minion of Mordred** | Evil | Knows the other Evil. Sabotage quests from the shadows. |

Every game always includes Merlin, Percival, the Assassin, and Morgana; the
remaining seats are filled with Loyal Servants of Arthur and Minions of Mordred
by the count above.

## Design

- **Identity:** Arthurian heraldry — steel-blue night, gold-leaf illumination,
  crimson shadow, on a faint woven-cloth grain. Display type is **Cinzel**
  (inscriptional Roman capitals), body is **EB Garamond**.
- **Signature element:** the round track of **five quest seals** (illuminated
  Roman numerals that flip to gold laurels on success or crimson cracks on
  failure), plus the simultaneous **Approve/Reject ballot flip** and the
  suspenseful **Success/Fail quest reveal**.
- **Motion:** Framer Motion drives the heraldic crest, the role-card flip, the
  staggered ballot reveal, and the quest result flip. All motion respects
  `prefers-reduced-motion`.
- **Mobile-first:** fits a single `100dvh` screen on a 375×667 phone (verified at
  0px overflow), with visible gold keyboard-focus rings and an in-game **How to
  Play** scroll for newcomers.

## Architecture

- `server/index.js` — generic room/WebSocket server (from the Parlor template).
- `server/base-game.js` — shared lobby/reconnect plumbing (unchanged).
- `server/game.js` — the authoritative Quest engine (`extends BaseGame`). The
  server is the single source of truth; `gameView(playerId)` returns a
  **per-player redacted** snapshot so each client sees only what its role permits.
  Votes are hidden until everyone has voted; individual Success/Fail plays are
  *never* sent to clients — only the tally.
- `client/src/` — React + Vite + Tailwind + Framer Motion. `net.js` is the shared
  auto-reconnecting socket hook; `App.jsx` renders authoritatively from `state`
  and sends intents via `send({ t: ... })`.

### Known limitations

- A vote or quest resolves only once **every connected player** has acted. A
  player who drops mid-vote can rejoin by name to cast their ballot; the table
  waits for them rather than guessing their vote.
- No Mordred/Oberon variants — Merlin sees all Evil, which keeps the night
  knowledge simple and correct for 5–10 players.
