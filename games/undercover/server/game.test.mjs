// Undercover engine tests. Run with: npm test
// Pure engine checks — no socket/port needed. (The end-to-end Playwright pass
// runs a live server on PORT=3005; see README.)
import { Game } from './game.js';
import { LOCATIONS } from './locations.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗ ' + m); } };

// Build a started game with N seated players. No broadcast hook ⇒ no real timers.
function startedGame(names) {
  const g = new Game('TEST');
  names.forEach((n, i) => g.addPlayer(String.fromCharCode(97 + i), n));
  g.start('a'); // 'a' is host
  return g;
}
const spyOf = (g) => g.players.find((p) => p.isSpy);
const nonSpies = (g) => g.players.filter((p) => !p.isSpy);

// ── data integrity ───────────────────────────────────────────────────────
ok(LOCATIONS.length === 30, 'there are 30 locations');
ok(LOCATIONS.every((l) => l.roles.length === 7), 'every location has exactly 7 roles');
ok(new Set(LOCATIONS.map((l) => l.name)).size === 30, 'location names are unique');

// ── setup / dealing ──────────────────────────────────────────────────────
{
  const g = startedGame(['Ann', 'Bo', 'Cy', 'Di']);
  ok(g.phase === 'play', 'host can start the round');
  ok(g.players.filter((p) => p.isSpy).length === 1, 'exactly one undercover is dealt');
  ok(nonSpies(g).every((p) => typeof p.role === 'string' && p.role), 'every non-spy gets a cover role');
  ok(spyOf(g).role === null, 'the undercover gets no role');

  const loc = g.locations[g.locationIndex];
  ok(nonSpies(g).every((p) => loc.roles.includes(p.role)), 'cover roles belong to the chosen location');
  // With 3 non-spies and 7 roles, the dealt roles should be distinct.
  const dealt = nonSpies(g).map((p) => p.role);
  ok(new Set(dealt).size === dealt.length, 'cover roles are distinct across non-spies');
}

// ── redaction in gameView ────────────────────────────────────────────────
{
  const g = startedGame(['Ann', 'Bo', 'Cy', 'Di']);
  const spy = spyOf(g);
  const agent = nonSpies(g)[0];

  const spyView = g.viewFor(spy.id);
  ok(spyView.youAreSpy === true, 'spy view: youAreSpy is true');
  ok(spyView.location === null, 'spy view: location is hidden');
  ok(spyView.yourRole === null, 'spy view: role is hidden');

  const agentView = g.viewFor(agent.id);
  ok(agentView.youAreSpy === false, 'agent view: youAreSpy is false');
  ok(agentView.location === g.locations[g.locationIndex].name, 'agent view: sees the location');
  ok(typeof agentView.yourRole === 'string', 'agent view: sees their role');

  // Identity of the spy must NOT leak to anyone mid-round.
  ok(agentView.players.every((p) => p.isSpy === false), 'no view exposes who the spy is mid-round');
  ok(spyView.players.every((p) => p.isSpy === false), 'even the spy view does not flag the spy');

  // The reference board is public to everyone, including the spy.
  ok(spyView.board.length === 30 && agentView.board.length === 30, 'board (all locations) is public to all');
}

// ── accusation: catching the spy ─────────────────────────────────────────
{
  const g = startedGame(['Ann', 'Bo', 'Cy', 'Di']);
  const spy = spyOf(g);
  const accuser = nonSpies(g)[0];
  const before = g.players.reduce((s, p) => s + p.score, 0);

  g.handleMessage(accuser.id, { t: 'callVote', target: spy.id });
  ok(g.phase === 'vote', 'calling a vote opens the vote phase');
  ok(g.timerRunning === false, 'the clock pauses during a vote');

  // Everyone except the accused (and the auto-yes accuser) votes to convict.
  for (const p of g.players) {
    if (p.id === spy.id || p.id === accuser.id) continue;
    g.handleMessage(p.id, { t: 'castVote', agree: true });
  }
  ok(g.phase === 'roundOver', 'unanimous vote resolves the round');
  ok(g.outcome === 'caught', 'convicting the real spy = caught');
  ok(g.winningSide === 'agents', 'the agents win when the spy is caught');
  ok(accuser.score === 2, 'the accuser scores 2 (1 + caller bonus)');
  ok(nonSpies(g).filter((p) => p.id !== accuser.id).every((p) => p.score === 1), 'other agents score 1');
  ok(spy.score === 0, 'the caught spy scores nothing');
  ok(g.players.reduce((s, p) => s + p.score, 0) > before, 'scores changed');

  // Reveal exposes the spy now (and only now).
  const v = g.viewFor(accuser.id);
  ok(v.spyId === spy.id, 'round-over view reveals the spy id');
  ok(v.players.find((p) => p.id === spy.id).isSpy === true, 'round-over view flags the spy');
}

// ── accusation: wrongful conviction ──────────────────────────────────────
{
  const g = startedGame(['Ann', 'Bo', 'Cy', 'Di']);
  const spy = spyOf(g);
  const innocent = nonSpies(g)[0];
  const accuser = nonSpies(g)[1];

  g.handleMessage(accuser.id, { t: 'callVote', target: innocent.id });
  for (const p of g.players) {
    if (p.id === innocent.id || p.id === accuser.id) continue;
    g.handleMessage(p.id, { t: 'castVote', agree: true });
  }
  ok(g.outcome === 'wrongful', 'convicting an innocent = wrongful');
  ok(g.winningSide === 'spy', 'the spy wins a wrongful conviction');
  ok(spy.score === 2, 'the spy scores 2 on a wrongful conviction');
}

// ── accusation: a single dissent fails the vote, clock resumes ───────────
{
  const g = startedGame(['Ann', 'Bo', 'Cy', 'Di']);
  const spy = spyOf(g);
  const accuser = nonSpies(g)[0];
  g.handleMessage(accuser.id, { t: 'callVote', target: spy.id });
  // One "no" anywhere defeats the unanimity requirement.
  const dissenter = g.players.find((p) => p.id !== spy.id && p.id !== accuser.id);
  g.handleMessage(dissenter.id, { t: 'castVote', agree: false });
  ok(g.phase === 'play', 'a single dissent returns to questioning');
  ok(g.timerRunning === true, 'the clock resumes after a failed vote');
  ok(g.outcome === null, 'no outcome is set on a failed vote');
}

// ── one accusation per player per round ──────────────────────────────────
{
  const g = startedGame(['Ann', 'Bo', 'Cy', 'Di']);
  const spy = spyOf(g);
  const accuser = nonSpies(g)[0];
  g.handleMessage(accuser.id, { t: 'callVote', target: spy.id });
  const dissenter = g.players.find((p) => p.id !== spy.id && p.id !== accuser.id);
  g.handleMessage(dissenter.id, { t: 'castVote', agree: false }); // fail → back to play
  const res = g.handleMessage(accuser.id, { t: 'callVote', target: spy.id });
  ok(res && res.error, 'a player cannot open a second vote in the same round');
}

// ── the undercover declares and guesses the location ─────────────────────
{
  const g = startedGame(['Ann', 'Bo', 'Cy', 'Di', 'Ed']);
  const spy = spyOf(g);
  const agent = nonSpies(g)[0];

  ok(g.handleMessage(agent.id, { t: 'declare' }).error, 'only the undercover can declare');
  g.handleMessage(spy.id, { t: 'declare' });
  ok(g.phase === 'spyGuess', 'declaring moves to the guess phase');
  ok(g.timerRunning === false, 'the clock pauses while the spy guesses');

  // Correct guess.
  g.handleMessage(spy.id, { t: 'guess', locationIndex: g.locationIndex });
  ok(g.outcome === 'spy_guessed', 'a correct guess = spy_guessed');
  ok(g.winningSide === 'spy', 'the spy wins by guessing right');
  ok(spy.score === 4, 'a correct location guess scores 4');
}

// ── the undercover guesses wrong ─────────────────────────────────────────
{
  const g = startedGame(['Ann', 'Bo', 'Cy', 'Di']);
  const spy = spyOf(g);
  g.handleMessage(spy.id, { t: 'declare' });
  const wrong = (g.locationIndex + 1) % g.locations.length;
  g.handleMessage(spy.id, { t: 'guess', locationIndex: wrong });
  ok(g.outcome === 'spy_wrong_guess', 'a wrong guess = spy_wrong_guess');
  ok(g.winningSide === 'agents', 'the agents win when the spy guesses wrong');
  ok(nonSpies(g).every((p) => p.score === 1), 'each agent scores 1 on a wrong guess');
}

// ── the clock runs out: the spy slips away ───────────────────────────────
{
  const g = startedGame(['Ann', 'Bo', 'Cy', 'Di']);
  const spy = spyOf(g);
  g._onTimeout(); // simulate the interrogation clock hitting zero
  ok(g.outcome === 'spy_survived', 'time-out = spy_survived');
  ok(g.winningSide === 'spy', 'the spy wins by surviving the clock');
  ok(spy.score === 2, 'surviving the clock scores the spy 2');
}

// ── scores carry across rounds ───────────────────────────────────────────
{
  const g = startedGame(['Ann', 'Bo', 'Cy', 'Di']);
  const spy1 = spyOf(g);
  g._onTimeout();                          // spy +2
  ok(g.phase === 'roundOver', 'round ends');
  g.handleMessage('a', { t: 'nextRound' }); // host deals again
  ok(g.phase === 'play' && g.round === 2, 'host deals the next round, scores intact');
  ok(g.players.find((p) => p.id === spy1.id).score === 2, 'last round score is carried forward');
  ok(g.players.filter((p) => p.isSpy).length === 1, 'still exactly one undercover next round');
}

// ── host-only / config guards ────────────────────────────────────────────
{
  const g = new Game('TEST');
  g.addPlayer('a', 'Ann'); g.addPlayer('b', 'Bo'); g.addPlayer('c', 'Cy');
  g.handleMessage('a', { t: 'config', durationSec: 99999 });
  ok(g.durationSec === 900, 'config clamps the round length to the 900s ceiling');
  g.handleMessage('a', { t: 'config', durationSec: 10 });
  ok(g.durationSec === 120, 'config clamps the round length to the 120s floor');
  ok(g.handleMessage('b', { t: 'config', durationSec: 300 }).error, 'non-host cannot change settings');
  g.start('a');
  ok(g.handleMessage('a', { t: 'config', durationSec: 300 }).error, 'settings lock once the round begins');
}

// ── round-over view: clear winner, plain reason, full reveal of roles ────
{
  const g = startedGame(['Ann', 'Bo', 'Cy', 'Di']);
  const spy = spyOf(g);
  const accuser = nonSpies(g)[0];
  g.handleMessage(accuser.id, { t: 'callVote', target: spy.id });
  for (const p of g.players) {
    if (p.id === spy.id || p.id === accuser.id) continue;
    g.handleMessage(p.id, { t: 'castVote', agree: true });
  }
  const v = g.viewFor(accuser.id);
  ok(v.winnerLabel === 'The players win', 'round-over view states the winner plainly');
  ok(typeof v.reason === 'string' && /\bspy\b/i.test(v.reason) && v.reason.includes(spy.name),
    'round-over view gives a plain reason naming the spy');
  ok(v.spyId === spy.id && v.location === g.locations[g.locationIndex].name,
    'round-over view reveals spy id and the secret location');
  // Every non-spy's cover role is revealed; the spy carries no role.
  const revealed = v.players;
  ok(revealed.filter((p) => !p.isSpy).every((p) => typeof p.role === 'string' && p.role),
    'round-over view reveals every agent\'s cover role');
  ok(revealed.find((p) => p.id === spy.id).role == null,
    'round-over view shows the spy without a cover role');
}

// ── reason wording covers the spy-guess and timeout paths ────────────────
{
  const g = startedGame(['Ann', 'Bo', 'Cy', 'Di']);
  const spy = spyOf(g);
  g.handleMessage(spy.id, { t: 'declare' });
  g.handleMessage(spy.id, { t: 'guess', locationIndex: g.locationIndex });
  const v = g.viewFor(spy.id);
  ok(v.winnerLabel === 'The spy wins' && /correctly/i.test(v.reason),
    'a correct guess reason explains the spy named the location');

  const g2 = startedGame(['Ann', 'Bo', 'Cy', 'Di']);
  g2._onTimeout();
  const v2 = g2.viewFor('a');
  ok(/time ran out/i.test(v2.reason), 'a timeout reason explains the clock ran out');
}

// ── nextRound is host-only and round-over-only ───────────────────────────
{
  const g = startedGame(['Ann', 'Bo', 'Cy']);
  ok(g.handleMessage('a', { t: 'nextRound' }).error, 'cannot deal the next round mid-play');
  g._onTimeout();
  ok(g.handleMessage('b', { t: 'nextRound' }).error, 'only the host can deal the next round');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
