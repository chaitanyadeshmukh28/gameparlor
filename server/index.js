// The Parlor — one server for the whole suite.
// Serves the dashboard at / and each game's built client under /<slug>/,
// and routes WebSocket upgrades on /<slug>/ws to that game's room manager.
import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import path from 'path';

import { createGameMount } from './mount.js';
import { CoupGame } from '../games/coup/server/game.js';
import { Game as NightfallGame } from '../games/nightfall/server/game.js';
import { Game as CipherGame } from '../games/cipher/server/game.js';
import { Game as CouncilGame } from '../games/council/server/game.js';
import { Game as UndercoverGame } from '../games/undercover/server/game.js';
import { Game as SealedGame } from '../games/sealed/server/game.js';
import { Game as QuestGame } from '../games/quest/server/game.js';
import { Game as InterceptGame } from '../games/intercept/server/game.js';
import { Game as BlackjackGame } from '../games/blackjack/server/game.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const distRoot = path.join(__dirname, '..', 'dist');

// slug -> engine. Order is the lineup order; slugs are the URL segments.
const GAMES = {
  coup: CoupGame,
  nightfall: NightfallGame,
  cipher: CipherGame,
  council: CouncilGame,
  undercover: UndercoverGame,
  sealed: SealedGame,
  quest: QuestGame,
  intercept: InterceptGame,
  blackjack: BlackjackGame,
};

const app = express();
app.get('/healthz', (_req, res) => res.send('ok'));

// Per-game static assets + SPA fallback, mounted before the dashboard root.
for (const slug of Object.keys(GAMES)) {
  const gameDist = path.join(distRoot, slug);
  app.use(`/${slug}`, express.static(gameDist));
  app.get(`/${slug}`, (_req, res) => res.sendFile(path.join(gameDist, 'index.html')));
  app.get(`/${slug}/*`, (_req, res) => res.sendFile(path.join(gameDist, 'index.html')));
}

// Dashboard at the root.
app.use(express.static(distRoot));
app.get('*', (_req, res) => res.sendFile(path.join(distRoot, 'index.html')));

const server = createServer(app);

// One WebSocket mount per game; route upgrades by /<slug>/ws.
const mounts = Object.fromEntries(
  Object.entries(GAMES).map(([slug, GameClass]) => [slug, createGameMount(GameClass)])
);

server.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const m = pathname.match(/^\/([^/]+)\/ws$/);
  const mount = m && mounts[m[1]];
  if (!mount) { socket.destroy(); return; }
  mount.wss.handleUpgrade(req, socket, head, (ws) => mount.wss.emit('connection', ws, req));
});

server.listen(PORT, () => {
  console.log(`The Parlor running on :${PORT}`);
  console.log(`  dashboard  /`);
  for (const slug of Object.keys(GAMES)) console.log(`  ${slug.padEnd(10)} /${slug}`);
});
