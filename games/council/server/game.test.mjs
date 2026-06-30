// The Council — engine tests. Run: `npm test` (node server/game.test.mjs).
// Pure-logic tests; no network. The e2e Playwright pass uses PORT=3004 separately.
import assert from 'node:assert';
import {
  Game, FASCIST_COUNT, POWER_TABLE, LIBERAL_WIN, FASCIST_WIN,
} from './game.js';

let passed = 0, failed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log(`  ok  ${name}`); }
  catch (e) { failed++; console.error(`FAIL  ${name}\n      ${e.message}`); }
};

// ---- helpers ---------------------------------------------------------------
function mkGame(n) {
  const g = new Game('TEST');
  for (let i = 0; i < n; i++) g.addPlayer(`p${i}`, `P${i}`);
  g.setup();
  return g;
}
// Force a deterministic role layout: roles[] aligned to seating order.
function setRoles(g, roles) {
  g.order.forEach((id, i) => {
    const p = g.byId(id);
    p.role = roles[i];
    p.team = roles[i] === 'liberal' ? 'good' : 'bad';
  });
}
function voteAll(g, voteFn) {
  for (const id of g.order) {
    const p = g.byId(id);
    if (p.alive) g.castVote(id, voteFn(id));
  }
}

// ---- 1. Role distribution by player count ----------------------------------
test('role distribution matches table for 5–10 players', () => {
  for (let n = 5; n <= 10; n++) {
    for (let trial = 0; trial < 40; trial++) {
      const g = mkGame(n);
      const roles = g.players.map((p) => p.role);
      const fasc = roles.filter((r) => r === 'fascist').length;
      const hit = roles.filter((r) => r === 'hitler').length;
      const lib = roles.filter((r) => r === 'liberal').length;
      assert.equal(hit, 1, `n=${n}: exactly one Hitler`);
      assert.equal(fasc, FASCIST_COUNT[n], `n=${n}: ${FASCIST_COUNT[n]} fascists`);
      assert.equal(lib, n - FASCIST_COUNT[n] - 1, `n=${n}: liberal count`);
      assert.equal(fasc + hit + lib, n, 'roles sum to player count');
      assert.equal(g.hitler().team, 'bad');
    }
  }
});

test('knowledge: fascists know each other and Hitler; liberals know nothing', () => {
  const g = mkGame(5);
  setRoles(g, ['fascist', 'hitler', 'liberal', 'liberal', 'liberal']);
  const facView = g.gameView('p0');
  const known = facView.players.filter((p) => p.role).map((p) => p.id).sort();
  assert.deepEqual(known, ['p0', 'p1'], 'fascist sees self + Hitler (fascist bench)');
  // Hitler at 5–6 players knows the fascists.
  const hitView = g.gameView('p1');
  assert.ok(hitView.players.find((p) => p.id === 'p0').role === 'fascist', 'Hitler sees fascist at 5p');
  // Liberal sees only self.
  const libView = g.gameView('p2');
  const libKnown = libView.players.filter((p) => p.role).map((p) => p.id);
  assert.deepEqual(libKnown, ['p2'], 'liberal sees only own role');
});

test('knowledge: at 7+ players Hitler does NOT know the fascists', () => {
  const g = mkGame(7);
  setRoles(g, ['hitler', 'fascist', 'fascist', 'liberal', 'liberal', 'liberal', 'liberal']);
  const hitView = g.gameView('p0');
  const known = hitView.players.filter((p) => p.role).map((p) => p.id);
  assert.deepEqual(known, ['p0'], 'Hitler blind to allies at 7p');
  // But fascists still see the whole fascist bench incl. Hitler.
  const facView = g.gameView('p1');
  const facKnown = facView.players.filter((p) => p.role).map((p) => p.id).sort();
  assert.deepEqual(facKnown, ['p0', 'p1', 'p2']);
});

test('view never leaks an unknown role to a liberal mid-game', () => {
  const g = mkGame(8);
  const lib = g.players.find((p) => p.role === 'liberal');
  const v = g.gameView(lib.id);
  for (const p of v.players) {
    if (p.id !== lib.id) assert.equal(p.role, null);
  }
});

// ---- 2. Voting & election tracker ------------------------------------------
test('gameView is safe during the lobby phase (before setup)', () => {
  const g = new Game('TEST');
  g.addPlayer('p0', 'P0');
  g.addPlayer('p1', 'P1');
  const v = g.viewFor('p0');
  assert.equal(v.phase, 'lobby');
  assert.equal(v.players.length, 2);
});

test('vote passes on strict majority and begins the legislative session', () => {
  const g = mkGame(5);
  assert.equal(g.phase, 'nominate');
  g.nominate('p0', 'p1');
  assert.equal(g.phase, 'vote');
  voteAll(g, () => 'ja');
  assert.equal(g.phase, 'voteReveal');
  assert.ok(g.lastElection.passed);
  g.ackReveal('p2');
  assert.equal(g.phase, 'legislativeChair');
  assert.equal(g.lastGov.chairId, 'p0');
  assert.equal(g.lastGov.deputyId, 'p1');
});

test('tie fails the vote (strict majority required)', () => {
  const g = mkGame(6);
  g.nominate('p0', 'p1');
  voteAll(g, (id) => (['p0', 'p1', 'p2'].includes(id) ? 'ja' : 'nein'));
  assert.equal(g.lastElection.passed, false);
});

test('election tracker forces a policy after three failed votes', () => {
  const g = mkGame(5);
  g.drawPile = ['liberal', 'fascist', 'fascist', 'fascist', 'liberal', 'liberal'];
  const start = g.liberalEnacted;
  for (let i = 0; i < 2; i++) {
    g.nominate(g.chairId, g.eligibleDeputies()[0]);
    voteAll(g, () => 'nein');
    g.ackReveal('p0');
    assert.equal(g.phase, 'nominate');
  }
  assert.equal(g.failedVotes, 2);
  g.nominate(g.chairId, g.eligibleDeputies()[0]);
  voteAll(g, () => 'nein');
  g.ackReveal('p0');
  assert.equal(g.failedVotes, 0, 'tracker resets after chaos');
  assert.equal(g.liberalEnacted, start + 1, 'top policy force-enacted');
  assert.equal(g.phase, 'nominate');
});

test('disconnected living players do not stall the vote (auto-Nein)', () => {
  const g = mkGame(5);
  g.byId('p3').connected = false;
  g.byId('p4').connected = false;
  g.nominate('p0', 'p1');
  voteAll(g, () => 'ja');
  assert.equal(g.phase, 'voteReveal', 'resolves without the disconnected ballots');
  assert.ok(g.lastElection.passed);
});

// ---- 3. Policy draw / enact -------------------------------------------------
test('president discards one of three in secret; chancellor enacts one of two', () => {
  const g = mkGame(5);
  g.drawPile = ['liberal', 'fascist', 'liberal', 'fascist', 'fascist'];
  g.nominate('p0', 'p1');
  voteAll(g, () => 'ja');
  g.ackReveal('p0');
  assert.deepEqual(g.draw3, ['liberal', 'fascist', 'liberal']);
  const discardBefore = g.discardPile.length;
  g.chairDiscard('p0', 1);
  assert.equal(g.discardPile.length, discardBefore + 1);
  assert.deepEqual(g.deputy2, ['liberal', 'liberal']);
  assert.equal(g.phase, 'legislativeDeputy');
  g.deputyEnact('p1', 0);
  assert.equal(g.liberalEnacted, 1);
  assert.equal(g.discardPile.length, discardBefore + 2, 'the non-enacted policy is discarded');
  assert.equal(g.phase, 'nominate', 'round advances after enactment');
  assert.equal(g.chairId, 'p1', 'president rotates to the next living seat');
});

test('a full no-power round returns to nomination with a new president', () => {
  const g = mkGame(5);
  g.drawPile = ['liberal', 'liberal', 'liberal', 'liberal', 'liberal', 'liberal'];
  g.nominate('p0', 'p1');
  voteAll(g, () => 'ja');
  g.ackReveal('p0');
  g.chairDiscard('p0', 0);
  g.deputyEnact('p1', 0);
  assert.equal(g.phase, 'nominate');
  assert.equal(g.chairId, 'p1');
  assert.equal(g.liberalEnacted, 1);
});

test('president draw and chancellor hand are secret to everyone else', () => {
  const g = mkGame(5);
  g.drawPile = ['liberal', 'liberal', 'liberal', 'fascist', 'fascist'];
  g.nominate('p0', 'p1');
  voteAll(g, () => 'ja');
  g.ackReveal('p0');
  assert.ok(g.gameView('p0').draw3, 'president sees their draw');
  assert.equal(g.gameView('p1').draw3, undefined, 'chancellor cannot see the president draw');
  assert.equal(g.gameView('p2').draw3, undefined, 'bystanders cannot see the draw');
  g.chairDiscard('p0', 0);
  assert.ok(g.gameView('p1').deputy2, 'chancellor sees their two');
  assert.equal(g.gameView('p0').deputy2, undefined, 'president cannot see chancellor hand');
  assert.equal(g.gameView('p2').deputy2, undefined, 'bystanders cannot see the chancellor hand');
});

test('only the president drafts and only the chancellor enacts', () => {
  const g = mkGame(5);
  g.drawPile = ['liberal', 'liberal', 'liberal', 'fascist', 'fascist'];
  g.nominate('p0', 'p1');
  voteAll(g, () => 'ja');
  g.ackReveal('p0');
  assert.ok(g.chairDiscard('p1', 0).error, 'non-president cannot draft');
  g.chairDiscard('p0', 0);
  assert.ok(g.deputyEnact('p0', 0).error, 'non-chancellor cannot enact');
  assert.ok(!g.deputyEnact('p1', 0).error);
});

// ---- 4. Executive power triggers -------------------------------------------
test('power table triggers the right power at each fascist threshold (9p)', () => {
  const g = mkGame(9);
  setRoles(g, ['liberal', 'fascist', 'liberal', 'liberal', 'hitler',
               'liberal', 'fascist', 'fascist', 'liberal']);
  g.enactPolicy('fascist', 'p0', false); // #1 => inspect
  assert.equal(g.phase, 'power');
  assert.equal(g.activePower.type, 'inspect');
  g.usePower('p0', 'p1'); // p1 is a fascist
  assert.equal(g.gameView('p0').power.result, 'bad', 'inspect reveals the fascist team');
  assert.equal(g.gameView('p2').power.result, null, 'others see the power but not its result');
  g.ackPower('p0');
  assert.equal(g.phase, 'nominate');
  assert.equal(POWER_TABLE[9][1], 'inspect');
});

test('chaos enactment never grants a power', () => {
  const g = mkGame(9);
  g.fascistEnacted = 0;
  g.enactPolicy('fascist', null, true); // forced via chaos => #1
  assert.equal(g.fascistEnacted, 1);
  assert.notEqual(g.phase, 'power', 'forced policy skips executive powers');
});

test('survey power lets the president peek the top three (5–6 players)', () => {
  const g = mkGame(5);
  g.drawPile = ['liberal', 'fascist', 'liberal', 'fascist', 'fascist'];
  g.fascistEnacted = 2;
  g.enactPolicy('fascist', 'p0', false); // -> 3 -> survey
  assert.equal(g.activePower.type, 'survey');
  assert.deepEqual(g.gameView('p0').power.top3, ['liberal', 'fascist', 'liberal']);
  assert.equal(g.gameView('p1').power.top3, null, 'others cannot see the survey');
  g.ackPower('p0');
  assert.equal(g.phase, 'nominate');
});

test('special election names a new president then rotation resumes correctly', () => {
  const g = mkGame(7);
  setRoles(g, ['liberal', 'fascist', 'fascist', 'hitler', 'liberal', 'liberal', 'liberal']);
  g.chairId = 'p0';
  g.fascistEnacted = 2;
  g.enactPolicy('fascist', 'p0', false); // #3 => appoint (7p)
  assert.equal(g.activePower.type, 'appoint');
  g.usePower('p0', 'p4');
  assert.equal(g.chairId, 'p4', 'appointed player presides over the special election');
  assert.equal(g.phase, 'nominate');
  g.nominate('p4', 'p1');
  voteAll(g, () => 'nein');
  g.ackReveal('p0');
  assert.equal(g.chairId, 'p1', 'presidency returns to the normal rotation');
});

// ---- 5. Every win condition ------------------------------------------------
test('WIN: liberals enact five Liberal policies', () => {
  const g = mkGame(5);
  g.liberalEnacted = LIBERAL_WIN - 1;
  const r = g.enactPolicy('liberal', 'p0', false);
  assert.equal(g.phase, 'over');
  assert.equal(g.winner, 'good');
  assert.ok(r.ended);
  assert.ok(/Liberals win/.test(g.winReason));
});

test('WIN: fascists enact six Fascist policies', () => {
  const g = mkGame(5);
  g.fascistEnacted = FASCIST_WIN - 1;
  const r = g.enactPolicy('fascist', 'p0', false);
  assert.equal(g.phase, 'over');
  assert.equal(g.winner, 'bad');
  assert.ok(r.ended);
  assert.ok(/Fascists win/.test(g.winReason));
});

test('WIN: liberals execute Hitler', () => {
  const g = mkGame(5);
  setRoles(g, ['liberal', 'hitler', 'fascist', 'liberal', 'liberal']);
  g.chairId = 'p0';
  g.beginPower('execute', 'p0');
  g.usePower('p0', 'p1');
  assert.equal(g.phase, 'over');
  assert.equal(g.winner, 'good');
  assert.ok(/executed/.test(g.winReason));
});

test('executing a non-Hitler continues the game', () => {
  const g = mkGame(5);
  setRoles(g, ['liberal', 'hitler', 'fascist', 'liberal', 'liberal']);
  g.chairId = 'p0';
  g.beginPower('execute', 'p0');
  g.usePower('p0', 'p2'); // a fascist, not Hitler
  assert.equal(g.phase, 'nominate');
  assert.equal(g.byId('p2').alive, false);
  assert.equal(g.livingCount(), 4);
});

test('WIN: Hitler elected Chancellor once three Fascist policies are down', () => {
  const g = mkGame(5);
  setRoles(g, ['liberal', 'hitler', 'fascist', 'liberal', 'liberal']);
  g.chairId = 'p0';
  g.fascistEnacted = 3;
  g.nominate('p0', 'p1');
  voteAll(g, () => 'ja');
  g.ackReveal('p0');
  assert.equal(g.phase, 'over');
  assert.equal(g.winner, 'bad');
  assert.ok(/elected Chancellor/.test(g.winReason));
});

test('NO early win: Hitler elected Chancellor with fewer than three Fascist policies is safe', () => {
  const g = mkGame(5);
  setRoles(g, ['liberal', 'hitler', 'fascist', 'liberal', 'liberal']);
  g.chairId = 'p0';
  g.fascistEnacted = 2;
  g.drawPile = ['liberal', 'liberal', 'liberal', 'liberal', 'liberal'];
  g.nominate('p0', 'p1');
  voteAll(g, () => 'ja');
  g.ackReveal('p0');
  assert.equal(g.phase, 'legislativeChair', 'no win — game proceeds to legislation');
});

test('game over reveals every role and names Hitler', () => {
  const g = mkGame(7);
  setRoles(g, ['liberal', 'fascist', 'fascist', 'hitler', 'liberal', 'liberal', 'liberal']);
  g.fascistEnacted = FASCIST_WIN - 1;
  g.enactPolicy('fascist', 'p0', false); // fascists win
  assert.equal(g.phase, 'over');
  const v = g.gameView('p4');
  assert.ok(v.players.every((p) => p.role && p.team), 'all roles revealed at game over');
  assert.equal(v.hitlerId, 'p3', 'Hitler named in the over view');
  assert.ok(/Fascists win/.test(v.winReason), 'win reason states the path');
});

// ---- veto ------------------------------------------------------------------
test('veto: unlocked at five Fascist policies; mutual veto advances the tracker', () => {
  const g = mkGame(5);
  setRoles(g, ['liberal', 'liberal', 'fascist', 'hitler', 'liberal']); // p1 not Hitler
  g.drawPile = ['fascist', 'fascist', 'fascist', 'liberal', 'liberal', 'liberal'];
  g.fascistEnacted = 5;
  g.nominate('p0', 'p1');
  voteAll(g, () => 'ja');
  g.ackReveal('p0');
  g.chairDiscard('p0', 0);
  assert.ok(!g.proposeVeto('p1').error, 'chancellor may move to veto');
  const before = g.failedVotes;
  g.answerVeto('p0', true);
  assert.equal(g.failedVotes, before + 1, 'veto counts as a failed election');
  assert.equal(g.phase, 'nominate');
});

test('veto is rejected before five Fascist policies', () => {
  const g = mkGame(5);
  setRoles(g, ['liberal', 'liberal', 'fascist', 'hitler', 'liberal']); // p1 not Hitler
  g.drawPile = ['liberal', 'liberal', 'liberal', 'fascist', 'fascist'];
  g.fascistEnacted = 4;
  g.nominate('p0', 'p1');
  voteAll(g, () => 'ja');
  g.ackReveal('p0');
  g.chairDiscard('p0', 0);
  assert.ok(g.proposeVeto('p1').error, 'veto locked until 5 fascist policies');
});

// ---- reconnect: stable ids + per-seat token --------------------------------
test('reconnect keeps the player id stable and positional state intact', () => {
  const g = mkGame(5);
  const pres = g.chairId;
  const tok = g.byId(pres).token;
  assert.ok(tok, 'a seat token is minted on first join');
  g.removePlayer(pres);                       // president closes their tab
  assert.equal(g.byId(pres).connected, false);
  const rejoined = g.addPlayer('brand-new-uuid', g.byId(pres).name, tok);
  assert.equal(rejoined.id, pres, 'id is unchanged on reconnect (not reassigned)');
  assert.ok(g.order.includes(pres), 'seating order still references the seat');
  assert.equal(g.chairId, pres, 'chairId still resolves to a real player');
  assert.equal(rejoined.connected, true);
  // The reconnected president is not locked out — they can still nominate.
  assert.ok(!g.nominate(pres, g.eligibleDeputies()[0]).error, 'reconnected president can still act');
});

test('reconnect requires the seat token and refuses a live seat', () => {
  const g = mkGame(5);
  const name = g.byId('p1').name;
  const tok = g.byId('p1').token;
  g.removePlayer('p1');
  assert.deepEqual(g.addPlayer('x', name), { error: 'bad-token' }, 'missing token refused');
  assert.deepEqual(g.addPlayer('x', name, 'wrong'), { error: 'bad-token' }, 'wrong token refused');
  assert.equal(g.addPlayer('x', name, tok).id, 'p1', 'correct token reclaims the seat');
  assert.deepEqual(g.addPlayer('y', name, tok), { error: 'seat-occupied' }, 'a connected seat cannot be hijacked');
});

test('the seat token is never exposed in any player view', () => {
  const g = mkGame(5);
  assert.ok(g.viewFor('p0').players.every((p) => p.token === undefined), 'token absent from base view');
  assert.ok(g.gameView('p0').players.every((p) => p.token === undefined), 'token absent from game view');
});

// ---- ballot resilience: timeout, disconnect, double-cast -------------------
test('ballot timeout resolves the slate with outstanding ballots as Nein', () => {
  const g = mkGame(5);
  g.nominate('p0', 'p1');
  g.castVote('p0', 'ja');
  g.castVote('p1', 'ja');
  assert.equal(g.phase, 'vote', 'still waiting on silent members');
  g.ballotTimeout();
  assert.equal(g.phase, 'voteReveal', 'the timeout resolves the vote');
  assert.equal(g.lastElection.passed, false, 'silent members count as Nein → slate fails');
});

test('a disconnect by the last outstanding voter resolves the election', () => {
  const g = mkGame(5);
  g.nominate('p0', 'p1');
  ['p0', 'p1', 'p2', 'p3'].forEach((id) => g.castVote(id, 'ja'));
  assert.equal(g.phase, 'vote', 'still pending on p4');
  g.removePlayer('p4'); // p4 drops mid-vote → auto-Nein, no connected member pending
  assert.equal(g.phase, 'voteReveal', 'resolves once no connected member is pending');
  assert.ok(g.lastElection.passed, '4 Ja vs p4 auto-Nein → passes');
});

test('a cast ballot is sealed — a second vote is rejected', () => {
  const g = mkGame(5);
  g.nominate('p0', 'p1');
  assert.ok(!g.castVote('p2', 'ja').error, 'first ballot accepted');
  assert.ok(g.castVote('p2', 'nein').error, 'second ballot refused');
  assert.equal(g.votes['p2'], 'ja', 'the original ballot stands');
});

// ---- summary ---------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
