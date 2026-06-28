// Cipher engine tests. Run with: npm test  (also: PORT=3003 node server/game.test.mjs)
import { Game, other } from './game.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗ ' + m); } };
const eq = (a, b, m) => ok(a === b, `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);

// Build a 4-player, fully-seated, started game. Host is the first player ('rs').
function startedGame() {
  const g = new Game('TEST');
  g.addPlayer('rs', 'RedSpy'); g.addPlayer('ro', 'RedOp');
  g.addPlayer('bs', 'BlueSpy'); g.addPlayer('bo', 'BlueOp');
  g.seat('rs', 'red', 'spymaster'); g.seat('ro', 'red', 'operative');
  g.seat('bs', 'blue', 'spymaster'); g.seat('bo', 'blue', 'operative');
  const res = g.start('rs');
  ok(!res.error, `game starts cleanly${res.error ? ': ' + res.error : ''}`);
  return g;
}
const spyOf = (team) => (team === 'red' ? 'rs' : 'bs');
const opOf = (team) => (team === 'red' ? 'ro' : 'bo');
const tileOf = (g, type) => g.board.findIndex((t) => t.type === type && !t.revealed);
// A valid clue word guaranteed NOT to be on the random board.
const cw = (g) => { let w = 'CLUEAA'; while (g.board.some((t) => !t.revealed && t.word === w)) w += 'A'; return w; };

// ---- 1. key generation counts ---------------------------------------------
{
  const g = startedGame();
  const count = (t) => g.board.filter((x) => x.type === t).length;
  eq(g.board.length, 25, 'board has 25 tiles');
  eq(count('assassin'), 1, 'exactly one assassin');
  eq(count('neutral'), 7, 'exactly seven bystanders');
  eq(count(g.startingTeam), 9, 'starting team holds 9 agents');
  eq(count(other(g.startingTeam)), 8, 'second team holds 8 agents');
  eq(count('red') + count('blue') + count('neutral') + count('assassin'), 25, 'types sum to 25');
  ok(new Set(g.board.map((t) => t.word)).size === 25, 'all 25 words are unique');
  eq(g.turn, g.startingTeam, 'starting team moves first');
  eq(g.turnRole, 'clue', 'turn opens awaiting a clue');
}

// ---- 2. spymaster-only key redaction --------------------------------------
{
  const g = startedGame();
  const opView = g.viewFor('ro');
  const spyView = g.viewFor('rs');
  ok(opView.board.every((t) => t.type === null), 'operative sees NO tile identities pre-reveal');
  ok(spyView.board.every((t) => t.type !== null), 'spymaster receives the full key');
  // Reveal one tile, then the operative should see exactly that one.
  const team = g.turn;
  const idx = tileOf(g, team);
  g.giveClue(spyOf(team), cw(g), 2);
  g.guess(opOf(team), idx);
  const after = g.viewFor(opOf(team));
  eq(after.board[idx].type, team, 'operative sees a tile only after it is revealed');
  eq(after.board.filter((t) => t.type !== null).length, 1, 'still exactly one identity exposed');
}

// ---- 3. clue validation ----------------------------------------------------
{
  const g = startedGame();
  const team = g.turn;
  ok(g.giveClue(opOf(team), 'BEACON', 1).error, 'operatives cannot give clues');
  ok(g.giveClue(spyOf(other(team)), 'BEACON', 1).error, 'off-team spymaster cannot give clues');
  ok(g.giveClue(spyOf(team), 'two words', 1).error, 'multi-word clue rejected');
  ok(g.giveClue(spyOf(team), 'BEACON', 0).error, 'count below 1 rejected');
  ok(g.giveClue(spyOf(team), 'BEACON', 99).error, 'count above remaining rejected');
  const onBoard = g.board[0].word;
  ok(g.giveClue(spyOf(team), onBoard, 1).error, 'cannot reuse a word on the board');
  eq(g.giveClue(spyOf(team), cw(g), 2).error, undefined, 'a valid clue is accepted');
  eq(g.turnRole, 'guess', 'a valid clue moves to the guessing phase');
  eq(g.clue.guessesAllowed, 3, 'guesses allowed = clue number + 1');
  ok(g.guess(spyOf(team), tileOf(g, team)).error, 'spymaster may not guess');
}

// ---- 4. correct guess continues, limit ends the turn -----------------------
{
  const g = startedGame();
  const team = g.turn;
  g.giveClue(spyOf(team), cw(g), 1); // allowed = 2
  const a = tileOf(g, team); g.guess(opOf(team), a);
  eq(g.turn, team, 'a correct guess keeps the turn');
  eq(g.turnRole, 'guess', 'still guessing after a correct hit');
  const b = tileOf(g, team); g.guess(opOf(team), b);
  eq(g.turn, other(team), 'reaching the guess limit ends the turn');
  eq(g.turnRole, 'clue', 'turn passes back to a clue');
}

// ---- 5. neutral & enemy guesses end the turn -------------------------------
{
  const g = startedGame();
  const team = g.turn;
  g.giveClue(spyOf(team), cw(g), 3);
  g.guess(opOf(team), tileOf(g, 'neutral'));
  eq(g.turn, other(team), 'guessing a bystander ends the turn');
}
{
  const g = startedGame();
  const team = g.turn;
  const enemy = other(team);
  const before = g.teamRemaining(enemy);
  g.giveClue(spyOf(team), cw(g), 3);
  g.guess(opOf(team), tileOf(g, enemy));
  eq(g.turn, enemy, 'guessing the enemy ends the turn');
  eq(g.teamRemaining(enemy), before - 1, 'an enemy tile helps the enemy');
}

// ---- 6. stopping requires a guess -----------------------------------------
{
  const g = startedGame();
  const team = g.turn;
  g.giveClue(spyOf(team), cw(g), 3);
  ok(g.endGuessing(opOf(team)).error, 'cannot stop before guessing at least once');
  g.guess(opOf(team), tileOf(g, team));
  eq(g.endGuessing(opOf(team)).error, undefined, 'may stop after one guess');
  eq(g.turn, other(team), 'stopping passes the turn');
}

// ---- 7. assassin = instant loss -------------------------------------------
{
  const g = startedGame();
  const team = g.turn;
  g.giveClue(spyOf(team), cw(g), 2);
  g.guess(opOf(team), tileOf(g, 'assassin'));
  eq(g.phase, 'over', 'touching the assassin ends the game');
  eq(g.winner, other(team), 'the other team wins when you hit the assassin');
  eq(g.endReason, 'assassin', 'assassin loss is recorded');
}

// ---- 8. clearing all your agents wins --------------------------------------
{
  const g = startedGame();
  const team = g.turn;
  const remaining = g.teamRemaining(team);
  g.giveClue(spyOf(team), cw(g), remaining); // allowed = remaining + 1
  let idx;
  while ((idx = tileOf(g, team)) !== -1 && g.phase === 'play') g.guess(opOf(team), idx);
  eq(g.phase, 'over', 'revealing all your agents ends the game');
  eq(g.winner, team, 'clearing your agents wins');
  eq(g.endReason, 'cleared', 'clear win is recorded');
  // Once over, the full key is exposed to everyone, including operatives.
  ok(g.viewFor(opOf(other(team))).board.every((t) => t.type !== null), 'key is revealed at game end');
}

// ---- 9. setup validation ---------------------------------------------------
{
  const g = new Game('BAD');
  g.addPlayer('a', 'A'); g.addPlayer('b', 'B'); g.addPlayer('c', 'C'); g.addPlayer('d', 'D');
  // Unbalanced: 3 red, 1 blue.
  g.seat('a', 'red', 'spymaster'); g.seat('b', 'red', 'operative');
  g.seat('c', 'red', 'operative'); g.seat('d', 'blue', 'spymaster');
  ok(g.start('a').error, 'unbalanced teams cannot start');
  eq(g.phase, 'lobby', 'failed start stays in the lobby');
  // Two spymasters on red.
  g.seat('a', 'red', 'spymaster'); g.seat('b', 'red', 'spymaster');
  g.seat('c', 'blue', 'spymaster'); g.seat('d', 'blue', 'operative');
  ok(g.start('a').error, 'two spymasters on a team cannot start');
  // No spymaster on red.
  g.seat('a', 'red', 'operative'); g.seat('b', 'red', 'operative');
  ok(g.start('a').error, 'a team with no spymaster cannot start');
  // Valid roster: red a(spy) b(op), blue c(spy) d(op).
  g.seat('a', 'red', 'spymaster');
  eq(g.start('a').error, undefined, 'a valid roster starts');
}

// ---- 10. reconnect keeps the seat & cleanup keeps picks --------------------
{
  const g = startedGame();
  g.removePlayer('ro'); // operative drops
  eq(g.byId('ro').connected, false, 'a mid-game leaver keeps their seat');
  g.addPlayer('ro2', 'RedOp'); // rejoin by name
  eq(g.byId('ro2').team, 'red', 'reconnect restores team');
  eq(g.byId('ro2').role, 'operative', 'reconnect restores role');
  g.resetToLobby('rs');
  eq(g.phase, 'lobby', 'host can return to the lobby');
  eq(g.byId('rs').team, 'red', 'team picks survive a return to the lobby');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
