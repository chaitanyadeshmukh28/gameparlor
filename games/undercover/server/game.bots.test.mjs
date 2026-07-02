// Undercover — AI player (bot) tests. In-process, no socket/port/timers.
// Fills a table with bots, starts, and drives `botDecide` for every bot (with
// an optional scripted human) until the round reaches its terminal state —
// asserting no throws and no stall. Run: node server/game.bots.test.mjs
import { Game } from './game.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗ ' + m); } };

// Deterministic RNG so a failing run is reproducible.
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// Drive every bot (and, if present, a scripted human) until the round ends or
// we run out of iterations. The clock is the natural tie-breaker in a live
// game, so if a full pass yields no move we simulate it timing out.
function playOut(g, rng, { human = null } = {}) {
  const MAX = 2000;
  for (let i = 0; i < MAX; i++) {
    if (g.phase === 'roundOver') return i;

    let acted = false;
    for (const p of g.players) {
      if (g.phase === 'roundOver') break;
      if (!p.isBot) continue;
      const view = g.viewFor(p.id);
      const move = g.botDecide(view, rng);
      if (!move) continue;
      const res = g.handleMessage(p.id, move);
      // An illegal move would set { error } — the tick would skip it, but for a
      // clean bot we assert it never happens.
      if (res && res.error) { fail++; console.error('  ✗ bot move rejected: ' + res.error + ' :: ' + JSON.stringify(move)); }
      else acted = true;
    }

    // Give a scripted human a trivial legal nudge if the table needs one.
    if (!acted && human && g.phase !== 'roundOver') acted = human(g) || acted;

    // Everyone went quiet mid-questioning → the interrogation clock runs out.
    if (!acted && g.phase === 'play') { g._onTimeout(); acted = true; }

    if (!acted && g.phase !== 'roundOver') break; // genuine stall
  }
  return -1;
}

const allBots = (n) => {
  const g = new Game('BOTS');
  for (let i = 0; i < n; i++) g.addBot('Bot ' + (i + 1));
  return g;
};

// ── every seat can be a bot: fill, start, run to a terminal round ─────────
{
  const g = allBots(4);
  ok(g.players.length === 4 && g.players.every((p) => p.isBot), 'four bot seats added');
  const res = g.start(g.hostId);
  ok(!res.error, 'host bot can start the game');
  ok(g.phase === 'play', 'the round begins in play');
  // Bots are first-class: dealt a spy + cover roles like anyone else.
  ok(g.players.filter((p) => p.isSpy).length === 1, 'exactly one bot is the undercover');
  ok(g.players.filter((p) => !p.isSpy).every((p) => typeof p.role === 'string'), 'every non-spy bot has a cover role');

  const iters = playOut(g, makeRng(1));
  ok(iters >= 0, 'an all-bot table drives the round to a terminal state (no stall)');
  ok(g.phase === 'roundOver', 'the round reaches roundOver');
  ok(['caught', 'wrongful', 'spy_guessed', 'spy_wrong_guess', 'spy_survived'].includes(g.outcome),
    'a legal outcome is recorded: ' + g.outcome);
}

// ── the bot view exposes isBot on every seat ─────────────────────────────
{
  const g = allBots(3);
  g.start(g.hostId);
  const v = g.viewFor(g.players[0].id);
  ok(v.players.every((p) => p.isBot === true), 'gameView marks every seat isBot');
  ok(typeof v.youMayChatter === 'boolean', 'view exposes the chatter budget flag');
}

// ── botDecide only ever returns legal moves across many seeds ────────────
{
  let terminalReached = 0;
  const seeds = 40;
  for (let s = 0; s < seeds; s++) {
    const g = allBots(4 + (s % 4)); // 4..7 players
    g.start(g.hostId);
    const iters = playOut(g, makeRng(s * 7 + 3));
    if (g.phase === 'roundOver') terminalReached++;
    ok(iters >= 0, `seed ${s}: no stall, no rejected bot move`);
  }
  ok(terminalReached === seeds, `every seed (${seeds}) ended in a terminal round`);
}

// ── a spy bot names a plausible location when it breaks cover ─────────────
{
  const g = allBots(4);
  g.start(g.hostId);
  const spy = g.players.find((p) => p.isSpy);
  g.handleMessage(spy.id, { t: 'declare' });
  ok(g.phase === 'spyGuess', 'the spy bot can declare');
  const move = g.botDecide(g.viewFor(spy.id), makeRng(9));
  ok(move && move.t === 'guess' && g.locations[move.locationIndex],
    'the spy bot guesses a real location off the board');
  const res = g.handleMessage(spy.id, move);
  ok(!res.error && g.phase === 'roundOver', 'the guess resolves the round');
}

// ── bots cast legal votes when accused-adjacent, and templated chatter ────
{
  const g = allBots(4);
  g.start(g.hostId);
  const spy = g.players.find((p) => p.isSpy);
  const agent = g.players.find((p) => !p.isSpy);
  // Open a vote by hand, then let the other bots weigh in via botDecide.
  g.handleMessage(agent.id, { t: 'callVote', target: spy.id });
  ok(g.phase === 'vote', 'a bot-called vote opens the vote phase');
  let cast = 0;
  for (const p of g.players) {
    if (g.phase !== 'vote') break;
    const v = g.viewFor(p.id);
    if (!v.vote?.youEligible) continue;
    const move = g.botDecide(v, makeRng(5));
    if (move && move.t === 'castVote') { g.handleMessage(p.id, move); cast++; }
  }
  ok(cast > 0, 'eligible bots cast votes');

  // Chatter is templated, non-empty, and capped per round.
  const g2 = allBots(3);
  g2.start(g2.hostId);
  const b = g2.players[0];
  let said = 0;
  for (let i = 0; i < 10 && g2.viewFor(b.id).youMayChatter; i++) {
    const line = g2._botLine(g2.viewFor(b.id), makeRng(i + 1));
    const res = g2.handleMessage(b.id, { t: 'say', text: line });
    if (!res.error) said++;
  }
  ok(said > 0 && said <= 2, 'a bot contributes at most CHATTER_CAP lines');
  ok(g2.handleMessage(b.id, { t: 'say', text: 'one more' }).error, 'the bot is blocked past its chatter cap');
}

// ── a bot-as-host + humans mix: humans do nothing, bots still finish ─────
{
  const g = new Game('MIX');
  g.addPlayer('h1', 'Human One');   // human is host (added first)
  g.addBot('Bot A');
  g.addBot('Bot B');
  g.addBot('Bot C');
  g.start('h1');
  ok(g.phase === 'play', 'mixed table starts');
  // The human only ever casts a vote when the table needs one (unanimity
  // requires every eligible seat) — otherwise bots carry the round.
  const human = (gg) => {
    const hv = gg.viewFor('h1');
    if (hv.phase === 'vote' && hv.vote?.youEligible) { gg.handleMessage('h1', { t: 'castVote', agree: true }); return true; }
    return false;
  };
  const iters = playOut(g, makeRng(42), { human });
  ok(iters >= 0 && g.phase === 'roundOver', 'bots finish the round alongside a mostly-passive human');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
