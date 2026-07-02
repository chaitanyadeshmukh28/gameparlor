// Quest — AI player (bot) driver tests. Run with: node game.bots.test.mjs
// In-process only (no network, no port). Fills a table with bots, starts the
// game, and drives EVERY seat via botDecide until the game reaches 'over',
// asserting the round never throws and never stalls.
import { Game } from './game.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗ ' + m); } };
const group = (name) => console.log('\n• ' + name);

// A tiny seeded RNG so failures are reproducible.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Build an all-bot table of n seats, start it, and run the bot tick loop until
// the game ends or we hit the iteration cap. Returns the finished game.
function runAllBots(n, seed, cap = 4000) {
  const rng = mulberry32(seed);
  const g = new Game('BOTS');
  const ids = [];
  for (let i = 0; i < n; i++) ids.push(g.addBot('Bot' + i).id);
  const startRes = g.start(ids[0]);
  ok(!startRes.error, `${n}p/seed ${seed}: game starts (${startRes.error || 'ok'})`);

  let iters = 0;
  let threw = null;
  while (g.phase !== 'over' && iters < cap) {
    iters++;
    // One "tick": find any bot that owes a move and apply the first one, exactly
    // as the shared server tick does (one move at a time).
    let acted = false;
    for (const id of ids) {
      let move = null;
      try {
        move = g.botDecide(g.viewFor(id), rng);
      } catch (e) { threw = e; break; }
      if (!move) continue;
      let res;
      try {
        res = g.handleMessage(id, move);
      } catch (e) { threw = e; break; }
      // An illegal move is a bug in our heuristic — flag it, but keep going so we
      // can see whether the game still terminates.
      if (res && res.error) ok(false, `${n}p/seed ${seed}: illegal bot move ${JSON.stringify(move)} → ${res.error}`);
      acted = true;
      break; // re-evaluate the whole table after every applied move
    }
    if (threw) break;
    if (!acted) break; // nobody owes a move but we're not over → a stall
  }

  ok(!threw, `${n}p/seed ${seed}: no throw during bot play${threw ? ' (' + threw.message + ')' : ''}`);
  ok(g.phase === 'over', `${n}p/seed ${seed}: reached 'over' (phase=${g.phase}, iters=${iters})`);
  ok(iters < cap, `${n}p/seed ${seed}: terminated within the iteration cap (${iters}/${cap})`);
  ok(g.winner === 'good' || g.winner === 'evil', `${n}p/seed ${seed}: a side won (${g.winner})`);
  return g;
}

// ---- 1. every supported table size, several seeds ------------------------
group('All-bot games reach a terminal state across sizes & seeds');
for (let n = 5; n <= 10; n++) {
  for (const seed of [1, 7, 42, 101]) runAllBots(n, seed);
}

// ---- 2. win-path coverage across many seeds -----------------------------
group('Bot games exercise the different win paths');
{
  const paths = new Set();
  for (let seed = 1; seed <= 120; seed++) {
    const g = runAllBotsQuiet(5, seed);
    if (g) paths.add(g.winPath);
  }
  for (let seed = 1; seed <= 60; seed++) {
    const g = runAllBotsQuiet(7, seed);
    if (g) paths.add(g.winPath);
  }
  console.log('  win paths seen:', [...paths].sort().join(', '));
  ok(paths.has('three_fails'), 'evil can win by sabotaging three quests');
  ok(paths.has('assassin_hit') || paths.has('assassin_miss'),
    'good can reach the Assassin endgame (hit or miss)');
}

// A quiet variant (no per-game assertions) used only for win-path sampling.
function runAllBotsQuiet(n, seed, cap = 4000) {
  const rng = mulberry32(seed);
  const g = new Game('BOTS');
  const ids = [];
  for (let i = 0; i < n; i++) ids.push(g.addBot('Bot' + i).id);
  if (g.start(ids[0]).error) return null;
  let iters = 0;
  while (g.phase !== 'over' && iters < cap) {
    iters++;
    let acted = false;
    for (const id of ids) {
      const move = g.botDecide(g.viewFor(id), rng);
      if (!move) continue;
      const res = g.handleMessage(id, move);
      if (res && res.error) return null; // illegal move → drop this sample
      acted = true;
      break;
    }
    if (!acted) break;
  }
  return g.phase === 'over' ? g : null;
}

// ---- 3. mixed human + bots (one scripted human) -------------------------
group('A table of bots plus one always-approve human still terminates');
{
  const rng = mulberry32(5);
  const g = new Game('MIX');
  const human = g.addPlayer('human-1', 'Human').id;
  const bots = [];
  for (let i = 0; i < 4; i++) bots.push(g.addBot('Bot' + i).id); // 5 total
  g.start(human);

  let iters = 0, threw = null;
  const cap = 4000;
  while (g.phase !== 'over' && iters < cap) {
    iters++;
    let acted = false;
    // Bots first.
    for (const id of bots) {
      const move = g.botDecide(g.viewFor(id), rng);
      if (!move) continue;
      try { g.handleMessage(id, move); } catch (e) { threw = e; }
      acted = true; break;
    }
    if (threw) break;
    if (acted) continue;
    // Otherwise the human owes a trivial legal move for the current phase.
    const v = g.viewFor(human);
    let hm = null;
    if (v.phase === 'reveal' && !v.ready) hm = { t: 'ready' };
    else if (v.phase === 'propose' && v.leader === human) {
      const team = [human, ...v.players.filter((p) => p.id !== human).map((p) => p.id)].slice(0, v.teamSize);
      hm = { t: 'propose', team };
    } else if (v.phase === 'vote' && v.yourVote === null) hm = { t: 'vote', approve: true };
    else if (v.phase === 'voteReveal' || v.phase === 'questReveal') hm = { t: 'proceed' };
    else if (v.phase === 'quest' && v.onQuest && v.yourCard === null) hm = { t: 'play', success: true };
    else if (v.phase === 'assassin' && v.assassin === human) {
      hm = { t: 'assassinate', target: v.players.find((p) => p.id !== human).id };
    }
    if (hm) { try { g.handleMessage(human, hm); } catch (e) { threw = e; } acted = true; }
    if (!acted) break;
  }
  ok(!threw, `mixed table: no throw${threw ? ' (' + threw.message + ')' : ''}`);
  ok(g.phase === 'over', `mixed table: reached 'over' (phase=${g.phase}, iters=${iters})`);
  ok(g.winner === 'good' || g.winner === 'evil', `mixed table: a side won (${g.winner})`);
}

// ---- summary -------------------------------------------------------------
console.log(`\n${fail === 0 ? '✓ all passing' : '✗ failures'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
