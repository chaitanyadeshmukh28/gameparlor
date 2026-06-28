# Parlor — the portal

The front door to **Parlor**, a suite of real-time multiplayer party games. One
elegant lobby that showcases every game as a tile and sends players into them.

> Pick a game. Share the code. Play from anywhere.

This is a **static** single-page site — no WebSockets, no game logic. A tiny
Express server serves the built React/Vite client and a `/healthz` check. Each
tile links out to that game's own service (Coup on `:3001`, the rest on
`:3002–:3008`).

## Run it

```bash
npm install      # deps: express + vite/react/tailwind/framer-motion
npm run build    # bundles client/ into dist/
npm start        # serves dist/ on PORT (default 3000)
```

Then open <http://localhost:3000>. For development with hot reload:

```bash
npm run dev      # vite on :5173, express on :3000
```

`PORT` is read from the environment (`PORT=3000 npm start`).

## Design identity

Parlor is styled as an **after-hours art-deco games salon** — its own look,
deliberately distinct from any single game in the lineup:

- **Palette** — deep aubergine-midnight chrome (`#0d0b16`), warm ivory type
  (`#f2e9d8`), and champagne-brass deco accents (`#d8b878`). The frame stays calm
  so the rainbow of game accents reads as a vibrant collection on the table.
- **Type** — `Marcellus` (a refined inscriptional display face) for the wordmark
  and game names, `Inter` for body, `Space Mono` for codes and labels.
- **Signature** — a slowly rotating art-deco **sunburst** behind the *Parlor*
  wordmark, plus a recurring diamond-tipped hairline rule.
- **Motion** (Framer Motion) — a staggered tile entrance, a foil wordmark that
  settles in from wide tracking, and tiles that come alive on hover (lift, accent
  glow, logo scale-up, a sliding *Enter ↗*). All motion respects
  `prefers-reduced-motion`.

Each tile **features that game's own real logo** — the actual title/wordmark from
the game's landing screen, captured as a crisp 2×-retina PNG and shown on a
dark, accent-framed title-card stage. The grid reads like a shelf of distinctly
branded games (gilt *Coup* on oxblood, silver *Nightfall* on indigo, stencil
*CIPHER*, ivory *THE COUNCIL* on forest green, white-and-amber *UNDERCOVER*,
rose-gold *Sealed*, gilt *QUEST*, terminal-green *INTERCEPT*).

The logos live in [`client/public/logos/<slug>.png`](client/public/logos/) and
were captured from each live game with the playwright-bowser tooling (element
screenshot of the hero `<h1>` at 2× device scale). To refresh a logo, re-capture
that game's title and replace its PNG.

## Editing the lineup

All eight games live in [`client/src/games.js`](client/src/games.js). Each entry:

```js
{ slug, name, tagline, accent, motif, players, url, basedOn }
```

`accent` (a hex string) tints the tile's border, glow and frame; `slug` also
names the logo image at `client/public/logos/<slug>.png`. (`motifs.jsx` holds
the hero sunburst.) Add a game by appending an entry, dropping its captured logo
PNG into `client/public/logos/`, and pointing `url` at its service.

## Layout

```
dashboard/
  package.json          dev / build / start scripts
  vite.config.js        root: client, build → ../dist (no /ws proxy)
  tailwind.config.js    Parlor design tokens
  server/index.js       static server + /healthz on PORT (default 3000)
  client/
    index.html          Google Fonts: Marcellus, Inter, Space Mono
    public/logos/       each game's real captured title logo (<slug>.png)
    src/
      main.jsx
      index.css         salon base + deco signature CSS
      games.js          the lineup (edit here)
      motifs.jsx        the hero sunburst
      App.jsx           hero + tile grid + footer
      components/GameTile.jsx
  README.md
```

## Notes

- The dashboard never binds a game port and has no knowledge of game state — it
  is purely a launcher. If a game's service isn't running, its tile link simply
  won't resolve; the portal itself is unaffected.
- Tiles open each game in a new tab (`target="_blank"`).
