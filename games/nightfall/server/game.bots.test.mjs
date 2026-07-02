// Nightfall AI-player (bot) tests — fully in-process, no network/port.
// Verifies botDecide drives a bot through every phase it can owe an action in
// (night role-action, day ready, vote) and that a table of bots (optionally with
// one scripted human) always reaches the terminal 'result' phase with no thrown
// errors and no stall.
//
// Run with: node games/nightfall/server/game.bots.test.mjs
import { Game } from './game.js';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('  ✗ ' + msg); } };

const MAX_ITER = 5000;

// One trivial, always-legal move for a scripted human seat.
function humanMove(g, id) {
  const view = g.viewFor(id);
  if (view.phase === 'night') return view.night?.youAreActive ? { t: 'night', skip: true } : null;
  if (view.phase === 'day') return view.me?.ready ? null : { t: 'ready' };
  if (view.phase === 'vote') {
    if (view.vote?.youVoted) return null;
    const other = view.players.find((p) => p.id !== id && p.connected !== false);
    return other ? { t: 'vote', target: other.id } : null;
  }
  return null;
}

// Drive a game to completion the same way the shared bot-tick does: one applied
// action per iteration. Throws on a stall (nobody owes a move mid-game).
function playOut(g, humanId = null) {
  let iter = 0;
  while (g.phase !== 'result') {
    if (++iter > MAX_ITER) throw new Error(`stall after ${MAX_ITER} iterations in phase=${g.phase}`);
    let acted = false;
    for (const p of g.players) {
      const action = p.id === humanId ? humanMove(g, p.id) : g.botDecide(g.viewFor(p.id));
      if (!action) continue;
      const res = g.handleMessage(p.id, action);
      if (res && res.error) continue;         // illegal — mirror the tick and skip
      acted = true;
      break;                                  // one action per iteration
    }
    if (!acted) throw new Error(`no seat owed a move but phase=${g.phase} (would stall)`);
  }
  return iter;
}

// ---- 1. addBot seats real players; view exposes isBot --------------------
(() => {
  const g = new Game('BOT1');
  const a = g.addBot('Botulus');
  const b = g.addBot('Botilda');
  ok(a && b, 'addBot seats two bots in the lobby');
  ok(g.hostId === a.id, 'first bot becomes host when no human is present');
  const view = g.viewFor(a.id);
  ok(view.players.every((p) => 'isBot' in p), 'gameView player entries carry isBot');
  ok(view.players.every((p) => p.isBot === true), 'both seats report isBot:true');
})();

// ---- 2. setup() deals every bot a role -----------------------------------
(() => {
  const g = new Game('BOT2');
  for (let i = 0; i < 3; i++) g.addBot('Bot' + i);
  ok(g.start(g.hostId).error === undefined, 'host bot can start the game');
  ok(g.phase === 'night', 'start moves into the night');
  ok(g.players.every((p) => typeof p.dealtRole === 'string'), 'every bot holds a dealt role');
})();

// ---- 3. An all-bot table always reaches the result (no throw, no stall) ---
(() => {
  let reached = 0, threw = 0;
  for (let trial = 0; trial < 60; trial++) {
    const n = 3 + (trial % 6);                 // sweep 3..8 players
    const g = new Game('BOT3-' + trial);
    for (let i = 0; i < n; i++) g.addBot('Bot' + i);
    try {
      g.start(g.hostId);
      playOut(g);
      if (g.phase === 'result' && g.result) reached++;
    } catch (err) {
      threw++;
      console.error('  ✗ trial ' + trial + ' threw: ' + err.message);
    }
  }
  ok(threw === 0, 'no all-bot game threw an error');
  ok(reached === 60, `every all-bot game reached the result (${reached}/60)`);
})();

// ---- 4. Bots + one scripted human also resolve ---------------------------
(() => {
  let reached = 0, threw = 0;
  for (let trial = 0; trial < 40; trial++) {
    const n = 4 + (trial % 5);                 // 4..8 seats, one of them human
    const g = new Game('BOT4-' + trial);
    const human = g.addPlayer('human', 'Mireille');   // seated first -> host
    for (let i = 0; i < n - 1; i++) g.addBot('Bot' + i);
    try {
      g.start(human.id);
      playOut(g, human.id);
      if (g.phase === 'result' && g.result) reached++;
    } catch (err) {
      threw++;
      console.error('  ✗ trial ' + trial + ' threw: ' + err.message);
    }
  }
  ok(threw === 0, 'no bots+human game threw an error');
  ok(reached === 40, `every bots+human game reached the result (${reached}/40)`);
})();

// ---- 5. botDecide only ever returns legal, phase-appropriate moves --------
(() => {
  const g = new Game('BOT5');
  for (let i = 0; i < 5; i++) g.addBot('Bot' + i);
  g.start(g.hostId);

  // Night: exactly the active bot owes a move; everyone else owes nothing.
  ok(g.phase === 'night', 'in the night phase');
  let sawNightMove = false;
  let guard = 0;
  while (g.phase === 'night' && guard++ < 50) {
    const activeId = g.activeStep.playerId;
    for (const p of g.players) {
      const mv = g.botDecide(g.viewFor(p.id));
      if (p.id === activeId) { ok(mv && mv.t === 'night', 'active bot returns a night move'); sawNightMove = true; }
      else ok(mv === null, 'a non-active bot owes no night move');
    }
    ok(g.nightAction(activeId, g.botDecide(g.viewFor(activeId))).error === undefined, 'the night move applies cleanly');
  }
  ok(sawNightMove, 'at least one bot acted during the night');
  ok(g.phase === 'day', 'the night resolves into the day');

  // Day: each bot readies once, then owes nothing until the phase flips.
  const first = g.players[0].id;
  ok(g.botDecide(g.viewFor(first)).t === 'ready', 'a not-ready bot returns a ready toggle');
  g.handleMessage(first, { t: 'ready' });
  ok(g.botDecide(g.viewFor(first)) === null, 'an already-ready bot owes no further day move');

  // Drive the rest of the day, then the vote — each vote must target another seat.
  playOut(g);
  ok(g.phase === 'result' && g.result, 'the bot table reached a resolved result');
  for (const [voter, target] of Object.entries(g.result.votes)) ok(voter !== target, 'no bot voted for itself');
})();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
