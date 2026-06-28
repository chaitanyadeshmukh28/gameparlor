// Intercept engine tests. Run with: npm test
import { Game } from './game.js';
import { WORD_POOL } from './words.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗ ' + m); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Build a fresh, started 2v2 game (a,c = WATCH ALPHA; b,d = WATCH BRAVO).
function startGame() {
  const g = new Game('TEST');
  g.addPlayer('a', 'Ann');
  g.addPlayer('b', 'Bo');
  g.addPlayer('c', 'Cy');
  g.addPlayer('d', 'Di');
  g.start('a');
  return g;
}
// Force the secret codes for a deterministic round (call after each round starts).
function setCodes(g, A, B) { g.codeByTeam = { A, B }; }
// Drive one round to resolution with explicit inputs.
function playRound(g, { cluesA, cluesB, decodeA, decodeB, interceptA, interceptB }) {
  const opA = g.encryptorByTeam.A, opB = g.encryptorByTeam.B;
  g.handleMessage(opA, { t: 'clues', clues: cluesA });
  g.handleMessage(opB, { t: 'clues', clues: cluesB });
  const decA = g.membersOf('A').find((p) => p.id !== opA).id;
  const decB = g.membersOf('B').find((p) => p.id !== opB).id;
  if (decodeA) g.handleMessage(decA, { t: 'guess', kind: 'decode', guess: decodeA });
  if (decodeB) g.handleMessage(decB, { t: 'guess', kind: 'decode', guess: decodeB });
  if (interceptA) g.handleMessage(decA, { t: 'guess', kind: 'intercept', guess: interceptA });
  if (interceptB) g.handleMessage(decB, { t: 'guess', kind: 'intercept', guess: interceptB });
}

// ---- lobby & team balancing ----------------------------------------------
{
  const g = new Game('LOB');
  g.addPlayer('a', 'Ann'); g.addPlayer('b', 'Bo'); g.addPlayer('c', 'Cy'); g.addPlayer('d', 'Di');
  ok(g.membersOf('A').length === 2 && g.membersOf('B').length === 2, 'watches auto-balance to 2v2');
  // Switch a player's watch in the lobby.
  ok(!g.handleMessage('d', { t: 'team', team: 'A' }).error, 'players can switch watch in lobby');
  ok(g.membersOf('A').length === 3, 'switching watch updates membership');
  g.handleMessage('d', { t: 'team', team: 'B' });
  // Cannot start unbalanced.
  const g2 = new Game('UNB');
  g2.addPlayer('w', 'W'); g2.addPlayer('x', 'X'); g2.addPlayer('y', 'Y');
  g2.handleMessage('w', { t: 'team', team: 'A' }); g2.handleMessage('x', { t: 'team', team: 'A' });
  g2.handleMessage('y', { t: 'team', team: 'A' });
  ok(!!g2.start('w').error, 'cannot start with an empty watch');
}

// ---- keyword dealing & code generation -----------------------------------
{
  const g = startGame();
  ok(g.phase === 'encrypt', 'game starts in the transmission phase');
  ok(g.teamData.A.keywords.length === 4 && g.teamData.B.keywords.length === 4, 'each watch gets 4 keywords');
  const all = [...g.teamData.A.keywords, ...g.teamData.B.keywords];
  ok(new Set(all).size === 8, '8 dealt keywords are all distinct');
  ok(all.every((w) => WORD_POOL.includes(w)), 'keywords come from the pool');
  for (const t of ['A', 'B']) {
    const code = g.codeByTeam[t];
    ok(code.length === 3 && new Set(code).size === 3 && code.every((n) => n >= 1 && n <= 4),
      `${t} code is a valid 3-of-4 permutation`);
  }
}

// ---- view redaction -------------------------------------------------------
{
  const g = startGame();
  setCodes(g, [1, 2, 3], [4, 3, 2]);
  const opA = g.encryptorByTeam.A;          // Ann
  const vOp = g.viewFor(opA);
  ok(eq(vOp.yourCode, [1, 2, 3]), 'operator sees their own code');
  ok(vOp.teams.A.keywords && vOp.teams.A.keywords.length === 4, 'you see your own watch keywords');
  ok(vOp.teams.B.keywords === null, 'enemy keywords are redacted');
  const vDec = g.viewFor('c');               // Cy, decoder on A
  ok(vDec.yourCode === null, 'non-operators never see the code');
  ok(vDec.teams.A.keywords !== null && vDec.teams.B.keywords === null, 'decoder sees own keywords only');
  const vEnemy = g.viewFor('b');             // Bo on team B
  ok(vEnemy.teams.A.keywords === null, "enemy cannot read your watch's keywords");
}

// ---- round 1: own-team decode, no interception ---------------------------
{
  const g = startGame();
  setCodes(g, [1, 2, 3], [4, 3, 2]);
  ok(g.interceptNeeded('A') === false, 'no interception in round 1');
  playRound(g, {
    cluesA: ['x', 'y', 'z'], cluesB: ['p', 'q', 'r'],
    decodeA: [1, 2, 3], decodeB: [1, 2, 3], // B's real code is [4,3,2] → wrong
  });
  ok(g.phase === 'reveal', 'round 1 resolves to reveal');
  ok(g.teamData.A.miscommunications === 0, 'correct decode → no miscommunication');
  ok(g.teamData.B.miscommunications === 1, 'wrong decode → miscommunication token');
  ok(g.teamData.A.interceptions === 0 && g.teamData.B.interceptions === 0, 'no interceptions awarded in round 1');
  ok(g.lastResult.A.decodeOk === true && g.lastResult.B.decodeOk === false, 'lastResult records decode outcomes');
  ok(eq(g.viewFor('b').teams.A.clues, ['x', 'y', 'z']), 'clues are public to the enemy');
  const prevOpA = g.encryptorByTeam.A;
  g.handleMessage('a', { t: 'continue' });
  ok(g.phase === 'encrypt' && g.roundNo === 2, 'continue advances to round 2');
  ok(g.encryptorByTeam.A !== prevOpA, 'operator role rotates each round');
}

// ---- interception + win by 2 interceptions -------------------------------
{
  const g = startGame();
  setCodes(g, [1, 2, 3], [4, 3, 2]);
  playRound(g, { cluesA: ['1', '2', '3'], cluesB: ['1', '2', '3'], decodeA: [1, 2, 3], decodeB: [4, 3, 2] });
  g.handleMessage('a', { t: 'continue' });
  // Round 2: A intercepts B's code [2,1,4]; both decode own correctly.
  setCodes(g, [1, 2, 3], [2, 1, 4]);
  playRound(g, {
    cluesA: ['1', '2', '3'], cluesB: ['1', '2', '3'],
    decodeA: [1, 2, 3], decodeB: [2, 1, 4],
    interceptA: [2, 1, 4], interceptB: [3, 1, 2], // A right, B wrong
  });
  ok(g.teamData.A.interceptions === 1, 'correct interception awards a token');
  ok(g.teamData.B.interceptions === 0, 'wrong interception awards nothing');
  g.handleMessage('a', { t: 'continue' });
  // Round 3: A intercepts again → 2 interceptions → A wins.
  setCodes(g, [1, 2, 3], [3, 4, 1]);
  playRound(g, {
    cluesA: ['1', '2', '3'], cluesB: ['1', '2', '3'],
    decodeA: [1, 2, 3], decodeB: [3, 4, 1],
    interceptA: [3, 4, 1], interceptB: [1, 2, 3],
  });
  ok(g.teamData.A.interceptions === 2, 'second interception accrues');
  ok(g.phase === 'over' && g.winner === 'A', '2 interceptions wins the game');
  ok(/intercepted/i.test(g.outcome.reason) && /wins/i.test(g.outcome.reason), 'outcome reason explains the interception win');
  // When over, BOTH watches' keywords are revealed to everyone.
  const fin = g.viewFor('b'); // Bo is on B; should now see A's keywords too
  ok(fin.teams.A.keywords && fin.teams.A.keywords.length === 4 && fin.teams.B.keywords, 'both watches keywords revealed at game over');
  ok(fin.outcome && fin.outcome.winner === 'A', 'outcome is exposed in the view');
}

// ---- lose by 2 miscommunications -----------------------------------------
{
  const g = startGame();
  setCodes(g, [1, 2, 3], [4, 3, 2]);
  playRound(g, { cluesA: ['1', '2', '3'], cluesB: ['1', '2', '3'], decodeA: [4, 1, 2], decodeB: [4, 3, 2] });
  ok(g.teamData.A.miscommunications === 1, 'first miscommunication recorded');
  g.handleMessage('a', { t: 'continue' });
  // Round 2: A miscommunicates again → 2 → WATCH BRAVO wins.
  setCodes(g, [1, 2, 3], [4, 3, 2]);
  playRound(g, {
    cluesA: ['1', '2', '3'], cluesB: ['1', '2', '3'],
    decodeA: [3, 2, 1], decodeB: [4, 3, 2],
    interceptA: [1, 2, 4], interceptB: [1, 2, 4],
  });
  ok(g.teamData.A.miscommunications === 2, 'second miscommunication recorded');
  ok(g.phase === 'over' && g.winner === 'B', '2 miscommunications loses (enemy wins)');
  ok(/garbled/i.test(g.outcome.reason) && /WATCH BRAVO wins/i.test(g.outcome.reason), 'outcome reason explains the miscommunication loss');
}

// ---- guess hidden from the enemy until reveal ----------------------------
{
  const g = startGame();
  setCodes(g, [1, 2, 3], [4, 3, 2]);
  g.handleMessage(g.encryptorByTeam.A, { t: 'clues', clues: ['a', 'b', 'c'] });
  g.handleMessage(g.encryptorByTeam.B, { t: 'clues', clues: ['d', 'e', 'f'] });
  const decA = g.membersOf('A').find((p) => p.id !== g.encryptorByTeam.A).id;
  g.handleMessage(decA, { t: 'guess', kind: 'decode', guess: [1, 2, 3] });
  const enemy = g.viewFor('b');
  ok(enemy.yourGuesses.decode === null, "enemy view shows only its own watch's pending guess");
  const ally = g.viewFor(decA);
  ok(eq(ally.yourGuesses.decode, [1, 2, 3]), 'your watch can see its own pending guess');
}

// ---- operator-only transmission + input validation -----------------------
{
  const g = startGame();
  const decA = g.membersOf('A').find((p) => p.id !== g.encryptorByTeam.A).id;
  ok(!!g.handleMessage(decA, { t: 'clues', clues: ['x', 'y', 'z'] }).error, 'non-operator cannot transmit clues');
  ok(!!g.handleMessage(g.encryptorByTeam.A, { t: 'clues', clues: ['x', 'y'] }).error, 'must supply exactly 3 clues');
  ok(!!g.handleMessage(g.encryptorByTeam.A, { t: 'guess', kind: 'decode', guess: [1, 1, 2] }).error,
    'guess slots must be distinct');
}

// ---- max-round tiebreak ---------------------------------------------------
{
  const g = startGame();
  for (let r = 1; r <= 8; r++) {
    setCodes(g, [1, 2, 3], [1, 2, 3]);
    const inputs = {
      cluesA: ['1', '2', '3'], cluesB: ['1', '2', '3'],
      decodeA: [1, 2, 3], decodeB: [1, 2, 3],
    };
    if (r >= 2) {
      inputs.interceptA = r === 2 ? [1, 2, 3] : [4, 3, 2]; // A intercepts once (round 2 only)
      inputs.interceptB = [4, 3, 2];
    }
    playRound(g, inputs);
    if (g.phase === 'reveal') g.handleMessage('a', { t: 'continue' });
  }
  ok(g.phase === 'over', 'game ends at the round limit');
  ok(g.teamData.A.interceptions === 1 && g.teamData.B.interceptions === 0, 'tiebreak setup: A leads on interceptions');
  ok(g.winner === 'A', 'round-limit tiebreak favors more interceptions');
  ok(/Round 8 reached/i.test(g.outcome.reason) && /most interceptions/i.test(g.outcome.reason), 'tiebreak reason names the round limit and the deciding stat');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
