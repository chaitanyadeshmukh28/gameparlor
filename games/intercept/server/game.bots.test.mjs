// Intercept AI-player (bot) tests — in-process, no network, no port.
// Fills both watches with bots, starts, and drives botDecide until the duel
// ends. Asserts: bots balance onto watches, no throws, no stall, terminal state.
// Run with: node games/intercept/server/game.bots.test.mjs
import { Game } from './game.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗ ' + m); } };

// Build a game filled with n bots.
function botGame(n) {
  const g = new Game('BOTS');
  for (let i = 0; i < n; i++) g.addBot('DROID-' + i);
  return g;
}

// One bot tick pass over the shared plumbing's model: for each bot, ask
// botDecide for its redacted view and apply the returned message. Returns true
// if any legal move was applied this pass (a stall detector).
function tickOnce(g, rng) {
  let acted = false;
  for (const p of [...g.players]) {
    if (!p.isBot) continue;
    const msg = g.botDecide(g.viewFor(p.id), rng);
    if (!msg) continue;
    const r = g.handleMessage(p.id, msg);
    if (!r || !r.error) acted = true;
    if (g.phase === 'over') break;
  }
  return acted;
}

// ---- lobby: bots balance onto watches + removal ---------------------------
{
  const g = botGame(4);
  ok(g.players.length === 4 && g.players.every((p) => p.isBot), 'addBot creates bot seats');
  ok(g.membersOf('A').length === 2 && g.membersOf('B').length === 2, '4 bots auto-balance to 2v2');
  ok(g.players.every((p) => p.team === 'A' || p.team === 'B'), 'every bot is assigned a watch');
  const victim = g.players[0].id;
  g.removeBot(victim);
  ok(g.players.length === 3 && !g.byId(victim), 'removeBot drops the bot seat');
}

// ---- drive full all-bot games to a terminal state -------------------------
function runGame(n, seedOffset) {
  const g = botGame(n);
  const res = g.start(g.hostId);
  ok(!res.error, `all-bot ${n}p game starts (${res.error || 'ok'})`);
  ok(g.phase === 'encrypt', `${n}p game begins in the transmission phase`);

  // Lightly seeded rng for reproducibility across the suite.
  let s = 0.12345 + seedOffset;
  const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };

  let iters = 0; const MAX = 5000; let threw = null;
  try {
    while (g.phase !== 'over' && iters < MAX) {
      const acted = tickOnce(g, rng);
      iters++;
      if (!acted) break; // no bot owed a legal move — stall
    }
  } catch (e) { threw = e; }

  ok(!threw, `${n}p game: no throw during bot play (${threw && threw.message})`);
  ok(iters < MAX, `${n}p game: no iteration blow-up (${iters} passes)`);
  ok(g.phase === 'over', `${n}p game reaches game over (phase=${g.phase}, round=${g.roundNo})`);
  ok(['A', 'B', 'draw'].includes(g.winner), `${n}p game: terminal winner set (${g.winner})`);
  ok(g.outcome && typeof g.outcome.reason === 'string', `${n}p game: outcome reason recorded`);
  // Decode language is invertible → own-watch decodes should never miscommunicate.
  ok(g.teamData.A.miscommunications === 0 && g.teamData.B.miscommunications === 0,
    `${n}p game: plain-code teammates decode their own code cleanly`);
}

runGame(4, 0);
runGame(6, 0.3);
runGame(4, 0.7);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
