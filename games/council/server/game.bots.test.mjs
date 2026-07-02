// The Council — AI player (bot) tests. Pure in-process logic; no network, no port.
// Runs full all-bot games to a terminal state and unit-checks botDecide per power.
// Run: `node server/game.bots.test.mjs`.
import assert from 'node:assert';
import { Game, FASCIST_WIN, LIBERAL_WIN } from './game.js';

let passed = 0, failed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log(`  ok  ${name}`); }
  catch (e) { failed++; console.error(`FAIL  ${name}\n      ${e.stack || e.message}`); }
};

// A game seated entirely with bots (so botDecide drives every seat).
function mkBotGame(n) {
  const g = new Game('BOTS');
  for (let i = 0; i < n; i++) g.addBot(`Bot${i}`);
  const res = g.setup();
  assert.ok(!res.error, `setup ok for ${n} bots`);
  return g;
}
function setRoles(g, roles) {
  g.order.forEach((id, i) => {
    const p = g.byId(id);
    p.role = roles[i];
    p.team = roles[i] === 'liberal' ? 'good' : 'bad';
  });
}

// Drive an all-bot table: each iteration, find one bot that owes a legal move,
// apply it, and re-evaluate. Throws on stall (nobody owes a legal move) or on a
// runaway iteration count. Returns the number of moves applied.
function playOut(g, maxIter = 4000) {
  let iter = 0, moves = 0;
  while (g.phase !== 'over') {
    if (++iter > maxIter) throw new Error(`stall: exceeded ${maxIter} iterations (phase=${g.phase})`);
    let acted = false;
    for (const p of g.players) {
      if (!p.isBot) continue;
      const view = g.viewFor(p.id);
      const move = g.botDecide(view, Math.random);
      if (!move) continue;
      const res = g.handleMessage(p.id, move);
      if (res && res.error) continue; // illegal move: skip (mirrors the shared tick)
      acted = true; moves++;
      break; // re-evaluate the table after every applied move
    }
    if (!acted) throw new Error(`stall: no bot owed a legal move (phase=${g.phase})`);
  }
  return moves;
}

// ---- 1. Full all-bot games reach a terminal state, no throws, no stall ------
test('all-bot games run to completion for every table size (5–10)', () => {
  for (let n = 5; n <= 10; n++) {
    for (let trial = 0; trial < 30; trial++) {
      const g = mkBotGame(n);
      const moves = playOut(g);
      assert.equal(g.phase, 'over', `n=${n} trial=${trial}: reached game over`);
      assert.ok(g.winner === 'good' || g.winner === 'bad', `n=${n}: a faction won`);
      assert.ok(typeof g.winReason === 'string' && g.winReason.length, 'a win reason is recorded');
      assert.ok(moves > 0, 'the bots actually played moves');
      // Sanity: the game ended via a real path, not by exhausting the deck oddly.
      assert.ok(
        g.liberalEnacted >= LIBERAL_WIN || g.fascistEnacted >= FASCIST_WIN ||
        g.players.some((p) => p.role === 'hitler' && !p.alive) || g.winner === 'bad',
        'terminal state matches a win condition',
      );
    }
  }
});

// ---- 2. Nomination: the President bot names an eligible Chancellor ----------
test('president bot nominates an eligible chancellor', () => {
  const g = mkBotGame(5);
  const view = g.viewFor(g.chairId);
  const mv = g.botDecide(view, Math.random);
  assert.equal(mv.t, 'nominate');
  assert.ok(g.eligibleDeputies().includes(mv.deputyId), 'nominee is eligible');
  assert.ok(!g.nominate(g.chairId, mv.deputyId).error, 'the move is legal');
});

// ---- 3. Voting: living bots cast a valid ballot, dead bots owe nothing ------
test('bots cast valid ballots and only when it is their turn to vote', () => {
  const g = mkBotGame(5);
  g.nominate(g.chairId, g.eligibleDeputies()[0]);
  assert.equal(g.phase, 'vote');
  for (const p of g.players) {
    const mv = g.botDecide(g.viewFor(p.id), Math.random);
    assert.equal(mv.t, 'vote');
    assert.ok(mv.vote === 'ja' || mv.vote === 'nein');
    assert.ok(!g.castVote(p.id, mv.vote).error, 'ballot accepted');
  }
  assert.equal(g.phase, 'voteReveal', 'all ballots in → resolved');
  // In the reveal phase a living bot advances the table.
  const ack = g.botDecide(g.viewFor(g.chairId), Math.random);
  assert.equal(ack.t, 'ackReveal');
});

// ---- 4. Legislative: faction-aware discard / enact -------------------------
test('liberal president discards a fascist; liberal chancellor enacts a liberal', () => {
  const g = mkBotGame(5);
  setRoles(g, ['liberal', 'liberal', 'liberal', 'fascist', 'hitler']);
  g.chairId = g.order[0];
  g.nominee = g.order[1];
  g.draw3 = ['fascist', 'liberal', 'fascist'];
  g.phase = 'legislativeChair';
  const disc = g.botDecide(g.viewFor(g.order[0]), Math.random);
  assert.equal(disc.t, 'discard');
  assert.equal(g.draw3[disc.index], 'fascist', 'liberal bins a fascist card');
  g.chairDiscard(g.order[0], disc.index);
  const enact = g.botDecide(g.viewFor(g.order[1]), Math.random);
  assert.equal(enact.t, 'enact');
  assert.equal(g.deputy2[enact.index], 'liberal', 'liberal enacts the liberal policy');
});

test('fascist president discards a liberal; fascist chancellor enacts a fascist', () => {
  const g = mkBotGame(5);
  setRoles(g, ['fascist', 'fascist', 'liberal', 'liberal', 'hitler']);
  g.chairId = g.order[0];
  g.nominee = g.order[1];
  g.draw3 = ['liberal', 'fascist', 'liberal'];
  g.phase = 'legislativeChair';
  const disc = g.botDecide(g.viewFor(g.order[0]), Math.random);
  assert.equal(g.draw3[disc.index], 'liberal', 'fascist bins a liberal card');
  g.chairDiscard(g.order[0], disc.index);
  const enact = g.botDecide(g.viewFor(g.order[1]), Math.random);
  assert.equal(g.deputy2[enact.index], 'fascist', 'fascist enacts the fascist policy');
});

// ---- 5. Veto: liberal chancellor vetoes a double-fascist agenda ------------
test('liberal chancellor proposes veto on an all-fascist agenda; president consents', () => {
  const g = mkBotGame(5);
  setRoles(g, ['liberal', 'liberal', 'fascist', 'hitler', 'liberal']);
  g.chairId = g.order[0];
  g.nominee = g.order[1];
  g.fascistEnacted = 5; // veto unlocked
  g.deputy2 = ['fascist', 'fascist'];
  g.phase = 'legislativeDeputy';
  const mv = g.botDecide(g.viewFor(g.order[1]), Math.random);
  assert.equal(mv.t, 'proposeVeto');
  assert.ok(!g.proposeVeto(g.order[1]).error);
  const ans = g.botDecide(g.viewFor(g.order[0]), Math.random);
  assert.deepEqual(ans, { t: 'answerVeto', agree: true }, 'president consents to the veto');
  assert.ok(!g.answerVeto(g.order[0], ans.agree).error);
});

// ---- 6. Executive powers: each variant produces a legal move ---------------
test('survey power: president bot acknowledges to continue', () => {
  const g = mkBotGame(5);
  setRoles(g, ['liberal', 'fascist', 'hitler', 'liberal', 'liberal']);
  g.chairId = g.order[0];
  g.fascistEnacted = 2;
  g.enactPolicy('fascist', g.order[0], false); // → survey (5p, #3)
  assert.equal(g.activePower.type, 'survey');
  const mv = g.botDecide(g.viewFor(g.order[0]), Math.random);
  assert.deepEqual(mv, { t: 'ackPower' });
  g.ackPower(g.order[0]);
  assert.equal(g.phase, 'nominate');
});

test('inspect power: president bot inspects a living member then acknowledges', () => {
  const g = mkBotGame(9);
  setRoles(g, ['liberal', 'fascist', 'fascist', 'hitler', 'liberal',
               'liberal', 'liberal', 'liberal', 'fascist']);
  g.chairId = g.order[0];
  g.fascistEnacted = 0;
  g.enactPolicy('fascist', g.order[0], false); // → inspect (9p, #1)
  assert.equal(g.activePower.type, 'inspect');
  const mv = g.botDecide(g.viewFor(g.order[0]), Math.random);
  assert.equal(mv.t, 'power');
  const target = g.byId(mv.targetId);
  assert.ok(target && target.alive && target.id !== g.order[0], 'inspects a living other');
  assert.ok(!g.usePower(g.order[0], mv.targetId).error);
  const ack = g.botDecide(g.viewFor(g.order[0]), Math.random);
  assert.deepEqual(ack, { t: 'ackPower' }, 'acknowledges the completed inspection');
  g.ackPower(g.order[0]);
  assert.equal(g.phase, 'nominate');
});

test('appoint power: president bot names a living successor', () => {
  const g = mkBotGame(7);
  setRoles(g, ['liberal', 'fascist', 'fascist', 'hitler', 'liberal', 'liberal', 'liberal']);
  g.chairId = g.order[0];
  g.fascistEnacted = 2;
  g.enactPolicy('fascist', g.order[0], false); // → appoint (7p, #3)
  assert.equal(g.activePower.type, 'appoint');
  const mv = g.botDecide(g.viewFor(g.order[0]), Math.random);
  assert.equal(mv.t, 'power');
  const target = g.byId(mv.targetId);
  assert.ok(target && target.alive && target.id !== g.order[0], 'appoints a living other');
  assert.ok(!g.usePower(g.order[0], mv.targetId).error);
  assert.equal(g.chairId, mv.targetId, 'the appointee presides');
  assert.equal(g.phase, 'nominate');
});

test('execute power: a fascist president never shoots a teammate or Hitler', () => {
  const g = mkBotGame(5);
  setRoles(g, ['fascist', 'liberal', 'liberal', 'hitler', 'liberal']);
  g.chairId = g.order[0];
  g.beginPower('execute', g.order[0]);
  const mv = g.botDecide(g.viewFor(g.order[0]), Math.random);
  assert.equal(mv.t, 'power');
  const target = g.byId(mv.targetId);
  assert.ok(target.role !== 'fascist' && target.role !== 'hitler', 'fascist spares its own bench');
  assert.ok(!g.usePower(g.order[0], mv.targetId).error);
  assert.equal(target.alive, false, 'the target is executed');
});

// ---- 7. A bot never acts on hidden info it cannot see -----------------------
test('a liberal bot only knows roles from its own inspections', () => {
  const g = mkBotGame(5);
  setRoles(g, ['fascist', 'hitler', 'liberal', 'liberal', 'liberal']);
  const libId = g.order[2];
  const v = g.viewFor(libId);
  // The view must not reveal any other role to a liberal (engine guarantee).
  assert.ok(v.players.filter((p) => p.id !== libId).every((p) => p.role === null),
    'liberal view hides every other role');
  // ...so the bot cannot "cheat" by nominating on secret knowledge.
  g.chairId = libId; g.nominee = null; g.phase = 'nominate';
  const mv = g.botDecide(g.viewFor(libId), Math.random);
  assert.ok(g.eligibleDeputies().includes(mv.deputyId), 'still picks a legal nominee');
});

// ---- summary ---------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
