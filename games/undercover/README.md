# Undercover

A real-time, multiplayer game of cover stories for **3–8 players**, themed as a
1940s film-noir interrogation. Mechanics in the spirit of *Spyfall*, rebuilt from
scratch with original locations, roles, art, and code.

> Everyone at the table shares one secret **location** — everyone but the
> **spy**, who's bluffing blind. Ask sharp questions, answer convincingly
> without naming the place, and smoke out the impostor before the clock runs out
> (or, if you're the spy, figure out where you are and slip away).

## Run it

```bash
npm install      # if node_modules isn't already present
npm run build    # bundles the client into dist/
PORT=3005 npm start
# open http://localhost:3005
```

For development with hot reload (client on :5173, server on :3005):

```bash
PORT=3005 npm run dev
```

Create a case, share the 4-letter **case number** with friends, and they join from
any device on the network. Reconnecting with the same alias resumes your seat.

## Rules in brief

1. **The deal.** A secret location is drawn. Every player gets it plus a cover
   role — except one player, the **spy**, who sees only a redacted file and
   does *not* know the location.
2. **The questioning.** Take turns asking each other pointed questions about the
   location. Answer so you sound like you belong, without ever naming the place.
   The spy bluffs along and listens for the answer.
3. **Calling a vote.** Suspicious of someone? Accuse them. **Everyone else must
   agree unanimously** to convict — a single "not guilty" sets them free. Each
   player may open one vote per round.
4. **Breaking cover.** At any moment the spy may stop the clock, break
   cover, and name the location from the public **case board**.
5. **The clock.** A configurable interrogation timer (4–10 min) runs down. If it
   hits zero with no conviction, the spy slips away.

### Scoring (carries across rounds)

| Outcome | Points |
|---|---|
| Spy names the location correctly | **+4** spy |
| Spy survives until the clock runs out | **+2** spy |
| The table convicts an innocent | **+2** spy |
| The table catches the spy | **+1** every player (**+1** bonus to the accuser) |
| Spy guesses the location wrong | **+1** every player |

The host deals each new round; scores persist until everyone returns to the lobby.

## Design

Film-noir interrogation. High-contrast black & white with a single neon accent —
**sodium-lamp amber**, the bare bulb swinging over the table. Condensed noir-poster
type (`Anton` / `Oswald`) with a monospace case-file face (`Spline Sans Mono`),
venetian-blind light raked across the room, and film grain over everything.

The **signature element** is the **dossier case file**: a sealed folder that flips
open to reveal your secret. Players read a stamped dossier (location + cover role);
the spy gets the same file with everything redacted to black bars and one
damning `SPY` stamp. Paired with a server-synced **interrogation clock**
that goes white-hot as it empties.

## Architecture

- `server/game.js` — authoritative engine extending `BaseGame` (`setup`,
  `handleMessage`, `gameView`, `cleanup`). The per-player `gameView` never leaks
  the location or role to the spy and never reveals who the spy is
  until the round ends.
- `server/locations.js` — 30 original locations × 7 original role names.
- `server/index.js` — generic room/WebSocket server (reads `process.env.PORT`).
- `client/` — React + Vite + Tailwind + Framer Motion.

The countdown is driven by a server end-timestamp plus the server clock, so every
client agrees regardless of local clock skew; the server also resolves the round
itself when the timer fires.

## Tests

```bash
npm test
```

`server/game.test.mjs` covers exactly-one-spy dealing, location/role
assignment, the spy's redaction (no location, no role, identity sealed),
the public reference board, accusation voting (catch / wrongful / failed vote /
one-vote-per-player), the spy's declare-and-guess (right and wrong),
clock-out survival, multi-round score carry, and the host/config guards.

## Known limitations

- Turn order for questioning is social, not server-enforced — the game names who
  *asks first* but trusts players to take turns aloud, exactly like the tabletop
  original.
- Rooms are in-memory; restarting the server clears active games.
- A disconnected player keeps their seat (so the table isn't stalled) and is
  skipped as an eligible voter; the round can still resolve around them.
