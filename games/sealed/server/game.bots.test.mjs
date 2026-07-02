// Bot-drive tests for Sealed. In-process (no network, no port). Fills a table
// with AI seats, starts, and drives botDecide() for every bot until the soirée
// reaches 'over' — asserting no throws, no illegal moves, and no stall across
// many rounds. Run with: node games/sealed/server/game.bots.test.mjs
import { Game } from './game.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗ ' + m); } };

// Deterministic RNG so a failure is reproducible.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Drive a game to its terminal 'over' phase. Bots decide via botDecide; an
// optional scripted human plays trivial-but-legal moves on its turn (and, as
// host, deals the next round). Returns run stats; throws on a stall.
function driveToEnd(g, { humanId = null, rng = Math.random, maxSteps = 40000 } = {}) {
  let steps = 0, illegal = 0, moves = 0, rounds = 0;
  while (g.phase !== 'over') {
    if (steps++ > maxSteps) throw new Error(`stalled at phase '${g.phase}' after ${steps} steps`);
    let acted = false;

    // Bots first — mirror the shared tick (one legal move per pass).
    for (const bot of g.players.filter((p) => p.isBot)) {
      let move = null;
      move = g.botDecide(g.viewFor(bot.id), rng); // may throw → surfaces as a test failure
      if (!move) continue;
      const before = g.phase;
      const res = g.handleMessage(bot.id, move);
      if (res && res.error) { illegal++; continue; }
      moves++; acted = true;
      if (before === 'roundEnd' && move.t === 'next') rounds++;
      break;
    }
    if (acted) continue;

    // No bot owed a move — the scripted human must be on the hook.
    if (humanId) {
      const v = g.viewFor(humanId);
      if (v.phase === 'roundEnd' && v.isHost) { g.handleMessage(humanId, { t: 'next' }); rounds++; continue; }
      if (v.phase === 'play' && v.turn === humanId) {
        const actor = g.byId(humanId);
        const mv = g.pickAutoMove(actor);                       // engine's own legal-move helper
        const res = g.handleMessage(humanId, { t: 'play', card: mv.card, target: mv.target, guess: mv.guess });
        if (res && res.error) throw new Error(`human move rejected: ${res.error}`);
        moves++; continue;
      }
    }
    throw new Error(`no one could act at phase '${g.phase}'`);
  }
  return { steps, illegal, moves, rounds };
}

// ---- all-bot tables of every size reach a winner ---------------------------
for (const n of [2, 3, 4, 5, 6]) {
  const g = new Game('BOT' + n);
  for (let i = 0; i < n; i++) g.addBot('AI' + i);        // first bot becomes host
  const startRes = g.start(g.hostId);
  ok(!startRes.error, `${n}-bot table starts cleanly`);
  ok(g.phase === 'play', `${n}-bot round deals into play`);

  let stats;
  try { stats = driveToEnd(g, { rng: mulberry32(1000 + n) }); }
  catch (e) { fail++; console.error(`  ✗ ${n}-bot game threw/stalled: ${e.message}`); continue; }

  ok(g.phase === 'over', `${n}-bot soirée reaches 'over'`);
  ok(g.gameWinnerId != null, `${n}-bot soirée records a winner`);
  ok(stats.illegal === 0, `${n}-bot bots never emit an illegal move (illegal=${stats.illegal})`);
  ok(stats.rounds >= 1, `${n}-bot game plays through multiple rounds (rounds=${stats.rounds})`);
  const champ = g.byId(g.gameWinnerId);
  ok(champ && champ.tokens >= g.favorGoal, `${n}-bot winner actually reached the Favor goal`);
}

// ---- mixed table: one human (host) + bots ----------------------------------
{
  const g = new Game('MIX');
  g.addPlayer('h', 'Human');            // human is host (added first)
  g.addBot('AI-A'); g.addBot('AI-B');
  const startRes = g.start('h');
  ok(!startRes.error, 'mixed table starts cleanly');

  let stats;
  try { stats = driveToEnd(g, { humanId: 'h', rng: mulberry32(77) }); }
  catch (e) { fail++; console.error(`  ✗ mixed game threw/stalled: ${e.message}`); }

  ok(g.phase === 'over', "mixed soirée reaches 'over'");
  ok(g.gameWinnerId != null, 'mixed soirée records a winner');
  ok(stats && stats.illegal === 0, `mixed bots never emit an illegal move`);
}

// ---- botDecide never throws and is null off-turn ---------------------------
{
  const g = new Game('OFF');
  g.addPlayer('h', 'Human'); g.addBot('AI-A'); g.addBot('AI-B');
  g.start('h');
  // Every bot that is NOT the current player owes nothing during the play phase.
  let offTurnNulls = 0, checked = 0;
  for (const bot of g.players.filter((p) => p.isBot)) {
    const v = g.viewFor(bot.id);
    if (v.turn === bot.id) continue;
    checked++;
    if (g.botDecide(v, Math.random) === null) offTurnNulls++;
  }
  ok(checked > 0 && offTurnNulls === checked, 'a bot owes no move when it is not its turn');
}

// ---- bots respect the forced-Countess rule ---------------------------------
{
  const g = new Game('CTS');
  g.addBot('AI-A'); g.addBot('AI-B');
  g.start(g.hostId);
  // Force the current bot to hold Countess(7) + King(6) → must play the Countess.
  g.phase = 'play';
  const cur = g.current();
  cur.hand = [7, 6];
  const move = g.botDecide(g.viewFor(cur.id), mulberry32(5));
  ok(move && move.t === 'play' && move.card === 7, 'bot discards the Countess when held beside royalty');
}

// ---- a bot never voluntarily bins the Princess -----------------------------
{
  const g = new Game('PRN');
  g.addBot('AI-A'); g.addBot('AI-B');
  g.start(g.hostId);
  g.phase = 'play';
  const cur = g.current();
  cur.hand = [8, 3];   // Princess(8) + Baron(3)
  const move = g.botDecide(g.viewFor(cur.id), mulberry32(9));
  ok(move && move.card === 3, 'bot keeps the Princess and plays the other letter');
}

// ---- a bot host deals the next round at roundEnd ---------------------------
{
  const g = new Game('NXT');
  g.addBot('AI-A'); g.addBot('AI-B');
  g.start(g.hostId);
  // Fabricate a roundEnd where the host owes the deal.
  g.phase = 'roundEnd';
  g.roundResult = { winners: [g.players[0].id], reason: 'last', hands: [], fallen: [] };
  const hostBot = g.players.find((p) => p.id === g.hostId);
  const move = g.botDecide(g.viewFor(hostBot.id), Math.random);
  ok(move && move.t === 'next', 'bot host advances between rounds with {t:next}');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
