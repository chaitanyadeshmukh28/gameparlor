// Cipher AI-opponent (bot) tests — in-process, no network / no port.
// Fills a game with bots (plus one scripted human), starts it, then drives
// botDecide() until the mission ends, asserting no throws and no stall.
// Run with: node games/cipher/server/game.bots.test.mjs
import { Game } from './game.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗ ' + m); } };

// Ask a player for its next move and apply it. Bots use botDecide; the scripted
// human plays the same trivial-but-legal operative line. Returns true if a move
// was made. Asserts the engine never rejects a move a decider produced.
function humanScript(view) {
  if (view.phase !== 'play') return null;
  if (view.me.team !== view.turn) return null;
  if (view.turnRole !== 'guess' || view.me.isSpymaster) return null;
  const clue = view.clue;
  if (!clue) return null;
  if (clue.guessesMade >= 1) return { t: 'stop' };
  const hidden = view.board.filter((t) => !t.revealed);
  if (!hidden.length) return null;
  return { t: 'guess', index: hidden[Math.floor(Math.random() * hidden.length)].i };
}

function step(g, p) {
  const view = g.viewFor(p.id);
  const msg = p.isBot ? g.botDecide(view, Math.random) : humanScript(view);
  if (!msg) return false;
  const res = g.handleMessage(p.id, msg);
  ok(!res || !res.error, `${p.name} move rejected: ${JSON.stringify(msg)} -> ${res && res.error}`);
  return true;
}

// Drive a game to completion; returns { over, iters }.
function driveToEnd(g, cap = 2000) {
  let iters = 0;
  while (iters++ < cap) {
    if (g.phase === 'over') return { over: true, iters };
    let acted = false;
    for (const p of g.players) { if (step(g, p)) { acted = true; break; } }
    if (!acted) break; // nobody owes a legal move but the game isn't over → stall
  }
  return { over: g.phase === 'over', iters };
}

// ---- 1. bots auto-seat into a valid, balanced roster ----------------------
{
  const g = new Game('BOT1');
  g.addPlayer('h', 'Human');
  g.seat('h', 'red', 'operative');
  g.addBot('Nova'); g.addBot('Echo'); g.addBot('Rook');
  const red = g.players.filter((p) => p.team === 'red');
  const blue = g.players.filter((p) => p.team === 'blue');
  ok(red.length >= 2 && blue.length >= 2, 'both teams have at least 2 agents');
  ok(red.filter((p) => p.role === 'spymaster').length === 1, 'red has exactly one spymaster');
  ok(blue.filter((p) => p.role === 'spymaster').length === 1, 'blue has exactly one spymaster');
  const res = g.start('h');
  ok(!res.error, `mission starts with bots seated${res.error ? ': ' + res.error : ''}`);
  ok(g.phase === 'play', 'phase is play after start');
}

// ---- 2. a human can reclaim a spymaster seat held by a bot -----------------
{
  const g = new Game('BOT2');
  g.addBot('Nova');           // first bot → red spymaster
  const bot = g.players[0];
  ok(bot.role === 'spymaster', 'first bot takes the open spymaster chair');
  g.addPlayer('h', 'Human');
  g.seat('h', bot.team, 'spymaster'); // human claims it
  ok(g.byId('h').role === 'spymaster', 'human becomes spymaster');
  ok(bot.role === 'operative', 'bot is demoted to operative, not double-spymaster');
}

// ---- 3. isBot is exposed in the game view ----------------------------------
{
  const g = new Game('BOT3');
  g.addPlayer('h', 'Human'); g.seat('h', 'red', 'operative');
  g.addBot('Nova');
  const view = g.viewFor('h');
  const botEntry = view.players.find((p) => p.name === 'Nova');
  ok(botEntry && botEntry.isBot === true, 'bot player entry carries isBot:true');
  ok(view.players.find((p) => p.id === 'h').isBot === false, 'human entry is isBot:false');
}

// ---- 4. bot clues always pass the engine's own clue validation -------------
{
  const g = new Game('BOT4');
  g.addBot('Nova'); g.addBot('Echo'); g.addBot('Rook'); g.addBot('Wren');
  ok(!g.start(g.hostId).error, 'all-bot game starts');
  // Drive just the clue phase and confirm the emitted clue is accepted + clean.
  const spy = g.players.find((p) => p.team === g.turn && p.role === 'spymaster');
  const msg = g.botDecide(g.viewFor(spy.id), Math.random);
  ok(msg && msg.t === 'clue', 'spymaster bot emits a clue');
  const up = String(msg.word).toUpperCase();
  ok(/^[A-Z]+(?:[-'][A-Z]+)?$/.test(up), 'clue is a single alphabetic token');
  ok(!g.board.some((t) => !t.revealed && t.word === up), 'clue is not a word on the board');
  ok(!g.board.some((t) => t.word.includes(up) || up.includes(t.word)), 'clue shares no substring with a board word');
  ok(msg.count === 1, 'safe code bot clues for exactly one agent');
  const res = g.handleMessage(spy.id, msg);
  ok(!res.error, `engine accepts the bot clue${res.error ? ': ' + res.error : ''}`);
  ok(g.turnRole === 'guess', 'clue advances the turn to guessing');
}

// ---- 5. full all-bot game runs to a terminal state, no throws/stall --------
let threw = null;
try {
  for (let trial = 0; trial < 25; trial++) {
    const g = new Game('RUN' + trial);
    g.addBot('Nova'); g.addBot('Echo'); g.addBot('Rook'); g.addBot('Wren');
    g.start(g.hostId);
    const { over, iters } = driveToEnd(g);
    ok(over, `trial ${trial}: game reached phase 'over'`);
    ok(iters < 2000, `trial ${trial}: finished without a runaway loop`);
    ok(g.winner === 'red' || g.winner === 'blue', `trial ${trial}: a winner is recorded`);
    ok(g.endReason === 'cleared' || g.endReason === 'assassin', `trial ${trial}: end reason recorded`);
    ok(g.viewFor(g.players[0].id).board.every((t) => t.type !== null), `trial ${trial}: key revealed at end`);
  }
} catch (e) { threw = e; }
ok(!threw, `all-bot games run without throwing${threw ? ': ' + threw.stack : ''}`);

// ---- 6. mixed human + bots game also runs to completion --------------------
try {
  const g = new Game('MIX');
  g.addPlayer('h', 'Human'); g.seat('h', 'red', 'operative');
  g.addBot('Nova'); g.addBot('Echo'); g.addBot('Rook');
  g.start('h');
  const { over } = driveToEnd(g);
  ok(over, 'mixed human+bot game reaches a terminal state');
} catch (e) { ok(false, 'mixed game threw: ' + e.stack); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
