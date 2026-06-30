// Nightfall engine tests. Run with: npm test
// Covers: deck building, wake order, werewolf knowledge, seer peeks, robber &
// troublemaker swaps (incl. chained interactions), insomniac final view,
// win determination across every team outcome, vote resolution, redaction,
// and disconnect handling during the night.
import { Game, buildRoleList, VILLAGE_ROLES } from './game.js';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('  ✗ ' + msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);

const NAMES = ['Ann', 'Bo', 'Cy', 'Di', 'Ed', 'Fi', 'Gus', 'Hal'];

// Build a game with a FORCED deal (deterministic) — mirrors Game.setup().
function forceGame(playerRoles, centerRoles) {
  ok(centerRoles.length === 3, 'deal must have 3 center cards');
  const g = new Game('TEST');
  playerRoles.forEach((_, i) => g.addPlayer('p' + i, NAMES[i]));
  const roles = [...playerRoles, ...centerRoles];
  const n = playerRoles.length;
  g.cards = roles;
  g.dealt = [...roles];
  g.centerIdx = [n, n + 1, n + 2];
  g.players.forEach((p, i) => { p.seat = i; p.dealtRole = roles[i]; p.info = []; p.ready = false; });
  const wolves = g.players.filter((p) => p.dealtRole === 'werewolf');
  for (const w of wolves) w.info.push({ k: 'wolves', names: wolves.filter((x) => x.id !== w.id).map((x) => x.name), lone: wolves.length === 1 });
  g.wakeQueue = [];
  for (const role of ['werewolf', 'seer', 'robber', 'troublemaker', 'insomniac'])
    g.players.filter((p) => p.dealtRole === role).forEach((p) => g.wakeQueue.push({ role, playerId: p.id }));
  g.stepIndex = 0; g.votes = {}; g.dayEndsAt = null; g.result = null; g.phase = 'night';
  g._advanceNight();
  return g;
}
const finalRoleOf = (g, seat) => g.cards[seat];

// ---- 1. Deck building ----------------------------------------------------
(() => {
  for (let n = 3; n <= 8; n++) {
    const list = buildRoleList(n);
    eq(list.length, n + 3, `deck for ${n} players has ${n + 3} cards`);
    const wolves = list.filter((r) => r === 'werewolf').length;
    ok(wolves >= 2, `deck for ${n} players has at least 2 werewolves`);
    ok(list.includes('seer') && list.includes('robber') && list.includes('troublemaker'), `deck for ${n} has core specials`);
  }
  ok(!buildRoleList(3).includes('tanner'), 'no outcast at the smallest table');
  ok(buildRoleList(8).includes('tanner'), 'outcast appears at large tables');
  ok(VILLAGE_ROLES.includes('seer'), 'village roster includes the seer');
})();

// ---- 2. Real setup deals everyone a role + 3 center ----------------------
(() => {
  const g = new Game('TEST');
  ['a', 'b', 'c', 'd'].forEach((id, i) => g.addPlayer(id, NAMES[i]));
  g.start('a');
  ok(g.phase === 'night', 'host start moves into the night');
  eq(g.cards.length, 7, 'four players deal seven cards');
  ok(g.players.every((p) => typeof p.dealtRole === 'string'), 'every player holds a dealt role');
  ok(g.centerIdx.length === 3, 'three cards sit in the center');
})();

// ---- 3. Wake order is fixed -----------------------------------------------
(() => {
  const g = forceGame(['werewolf', 'seer', 'robber', 'troublemaker', 'insomniac'], ['villager', 'tanner', 'werewolf']);
  const seen = [];
  let guard = 0;
  while (g.phase === 'night' && guard++ < 20) {
    const id = g.activeStep.playerId;
    const role = g.activeStep.role;
    seen.push(role);
    if (role === 'werewolf') g.nightAction(id, { center: 2 });
    else if (role === 'seer') g.nightAction(id, { mode: 'player', target: 'p2' });
    else if (role === 'robber') g.nightAction(id, { target: 'p0' });
    else if (role === 'troublemaker') g.nightAction(id, { a: 'p0', b: 'p1' });
    else g.nightAction(id, {});
  }
  eq(seen, ['werewolf', 'seer', 'robber', 'troublemaker', 'insomniac'], 'roles wake in the fixed order');
  ok(g.phase === 'day', 'night ends in the day phase');
})();

// ---- 4. Werewolves know each other; lone wolf peeks center ---------------
(() => {
  const g = forceGame(['werewolf', 'werewolf', 'villager'], ['seer', 'robber', 'troublemaker']);
  const a = g.byId('p0').info.find((x) => x.k === 'wolves');
  const b = g.byId('p1').info.find((x) => x.k === 'wolves');
  eq(a.names, ['Bo'], 'wolf Ann sees wolf Bo');
  eq(b.names, ['Ann'], 'wolf Bo sees wolf Ann');
  ok(a.lone === false, 'two wolves are not lone');

  const lone = forceGame(['werewolf', 'villager', 'seer'], ['robber', 'troublemaker', 'werewolf']);
  ok(lone.byId('p0').info.find((x) => x.k === 'wolves').lone, 'a single player-wolf is lone');
  lone.nightAction('p0', { center: 2 });
  eq(lone.byId('p0').info.find((x) => x.k === 'wolf-peek').role, 'werewolf', 'lone wolf glimpses the center werewolf');
})();

// ---- 5. Seer peeks --------------------------------------------------------
(() => {
  const g = forceGame(['seer', 'werewolf', 'villager'], ['robber', 'troublemaker', 'tanner']);
  g.nightAction('p1', { skip: true });              // werewolf wakes first
  g.nightAction('p0', { mode: 'player', target: 'p1' });
  const r = g.byId('p0').info.find((x) => x.k === 'seer-player');
  eq([r.name, r.role], ['Bo', 'werewolf'], 'seer reads a player accurately');

  const g2 = forceGame(['seer', 'werewolf', 'villager'], ['robber', 'troublemaker', 'tanner']);
  g2.nightAction('p1', { skip: true });
  g2.nightAction('p0', { mode: 'center', center: [0, 2] });
  const c = g2.byId('p0').info.find((x) => x.k === 'seer-center');
  eq(c.roles, ['robber', 'tanner'], 'seer reads two center cards accurately');
  ok(g2.nightAction('p0', { mode: 'center', center: [0, 2] }).error, 'seer cannot act twice');
})();

// ---- 6. Robber swaps and learns its new role ------------------------------
(() => {
  const g = forceGame(['robber', 'werewolf', 'villager'], ['seer', 'troublemaker', 'tanner']);
  g.nightAction('p1', { skip: true });              // werewolf wakes first
  g.nightAction('p0', { target: 'p1' });
  eq(finalRoleOf(g, 0), 'werewolf', 'robber ends up holding the stolen werewolf card');
  eq(finalRoleOf(g, 1), 'robber', 'the robbed player now holds the robber card');
  eq(g.byId('p0').info.find((x) => x.k === 'robber').role, 'werewolf', 'robber sees its new (werewolf) role');
})();

// ---- 7. Troublemaker swaps two others without looking ---------------------
(() => {
  const g = forceGame(['troublemaker', 'werewolf', 'villager'], ['seer', 'robber', 'tanner']);
  g.nightAction('p1', { skip: true });              // werewolf wakes first
  g.nightAction('p0', { a: 'p1', b: 'p2' });
  eq(finalRoleOf(g, 1), 'villager', 'troublemaker swap: seat 1 now villager');
  eq(finalRoleOf(g, 2), 'werewolf', 'troublemaker swap: seat 2 now werewolf');
  ok(!g.byId('p0').info.some((x) => 'role' in x), 'troublemaker learns no role');
  ok(g.nightAction('p0', { a: 'p0', b: 'p1' }).error, 'troublemaker cannot act twice / swap its own card');
})();

// ---- 8. Chained robber -> troublemaker -> insomniac (the hard case) -------
(() => {
  // Seats: 0 robber, 1 werewolf, 2 troublemaker, 3 insomniac, 4 villager
  const g = forceGame(['robber', 'werewolf', 'troublemaker', 'insomniac', 'villager'], ['seer', 'tanner', 'villager']);
  g.nightAction('p1', { skip: true });                // werewolf wakes first
  g.nightAction('p0', { target: 'p1' });              // robber takes the werewolf card from seat 1
  g.nightAction('p2', { a: 'p0', b: 'p3' });          // troublemaker swaps seats 0 and 3
  g.nightAction('p3', {});                             // insomniac looks at its (now changed) card
  // Trace: [robber,wolf,TM,insom,vill] -robber 0<->1-> [wolf,robber,TM,insom,vill]
  //        -meddle 0<->3-> [insom,robber,TM,wolf,vill]
  eq(finalRoleOf(g, 0), 'insomniac', 'seat 0 final role after chain');
  eq(finalRoleOf(g, 1), 'robber', 'seat 1 final role after chain');
  eq(finalRoleOf(g, 3), 'werewolf', 'seat 3 final role after chain');
  eq(g.byId('p3').info.find((x) => x.k === 'insomniac').role, 'werewolf', 'insomniac sees its final werewolf card');
  ok(g.byId('p0').info.find((x) => x.k === 'robber').role === 'werewolf', 'robber still believes it took a werewolf');
})();

// ---- 9. Win determination -------------------------------------------------
function resolveWith(finalRoles, votes) {
  const g = new Game('TEST');
  finalRoles.forEach((_, i) => g.addPlayer('p' + i, NAMES[i]));
  const n = finalRoles.length;
  g.cards = [...finalRoles, 'villager', 'villager', 'villager'];
  g.centerIdx = [n, n + 1, n + 2];
  g.players.forEach((p, i) => { p.seat = i; p.dealtRole = finalRoles[i]; });
  g.phase = 'vote';
  g.votes = votes;
  g._resolveVotes();
  return g.result;
}
(() => {
  // a wolf dies -> village wins
  let r = resolveWith(['werewolf', 'villager', 'seer'], { p0: 'p1', p1: 'p0', p2: 'p0' });
  eq(r.team, 'village', 'village wins when a werewolf is eliminated');
  ok(r.winners.includes('p1') && r.winners.includes('p2') && !r.winners.includes('p0'), 'village team members win, the wolf does not');

  // wolf survives, a villager dies -> werewolf wins
  r = resolveWith(['werewolf', 'villager', 'seer'], { p0: 'p1', p1: 'p2', p2: 'p1' });
  eq(r.team, 'werewolf', 'werewolves win when no wolf dies');
  eq(r.winners, ['p0'], 'only the surviving wolf wins');

  // everyone scattered (max 1 vote), wolf in play -> no death -> werewolf wins
  r = resolveWith(['werewolf', 'villager', 'seer'], { p0: 'p1', p1: 'p2', p2: 'p0' });
  eq(r.deaths, [], 'fewer than two votes on anyone kills no one');
  eq(r.team, 'werewolf', 'a hung vote lets the wolf survive');

  // tanner dies, no wolf -> outcast wins alone
  r = resolveWith(['tanner', 'villager', 'seer'], { p0: 'p1', p1: 'p0', p2: 'p0' });
  eq(r.team, 'outcast', 'the outcast wins by dying');
  eq(r.winners, ['p0'], 'only the slain outcast wins, village loses');

  // no wolves in play, nobody dies -> village wins
  r = resolveWith(['tanner', 'villager', 'seer'], { p0: 'p1', p1: 'p2', p2: 'p0' });
  eq(r.team, 'village', 'with no wolves in play, a no-kill is a village win');
  ok(!r.winners.includes('p0'), 'a surviving outcast does not win');

  // tie: wolf AND tanner both die -> village AND outcast win
  r = resolveWith(['werewolf', 'villager', 'seer', 'tanner'], { p1: 'p0', p3: 'p0', p0: 'p3', p2: 'p3' });
  eq(r.deaths.slice().sort(), ['p0', 'p3'], 'top-tied accusations both die');
  ok(r.villageWins && r.winners.includes('p3') && r.winners.includes('p1') && r.winners.includes('p2'), 'village + slain outcast both win on a mixed tie');
})();

// ---- 10. Day -> vote -> result flow --------------------------------------
(() => {
  const g = forceGame(['werewolf', 'villager', 'seer'], ['robber', 'troublemaker', 'tanner']);
  while (g.phase === 'night') g.nightAction(g.activeStep.playerId, { skip: true });
  ok(g.phase === 'day', 'all night actors done -> day');
  ok(g.toggleReady('p0').error === undefined, 'players can ready up');
  g.toggleReady('p1'); g.toggleReady('p2');
  ok(g.phase === 'vote', 'all players ready -> vote phase');
  g.castVote('p0', 'p1'); g.castVote('p1', 'p0');
  ok(g.phase === 'vote', 'voting waits for everyone');
  g.castVote('p2', 'p0');
  ok(g.phase === 'result', 'final vote resolves the round');
  ok(g.castVote('p0', 'p1').error, 'cannot vote after resolution');
})();

// ---- 11. Redaction: secrets never leak over the wire ---------------------
(() => {
  const g = forceGame(['werewolf', 'seer', 'villager'], ['robber', 'troublemaker', 'tanner']);
  const view = g.viewFor('p1'); // Bo the seer, looking at the table
  ok(view.me.role === 'seer', 'you can see your own role');
  ok(view.players.every((p) => !('dealt' in p) && !('final' in p) && !('role' in p)), 'no roles leak in the players list during play');
  const villagerView = g.viewFor('p2'); // a plain villager during the night
  ok(villagerView.night && villagerView.night.role === null && !villagerView.night.context, 'non-active players learn nothing about the active role');
  ok(JSON.stringify(villagerView.players).indexOf('werewolf') === -1, 'a villager view never exposes another player as a werewolf');

  // Drive to result; the full reveal is then public.
  while (g.phase === 'night') g.nightAction(g.activeStep.playerId, { skip: true });
  g.callVote('p0');
  g.castVote('p0', 'p1'); g.castVote('p1', 'p0'); g.castVote('p2', 'p0');
  const rv = g.viewFor('p2');
  ok(rv.result && rv.players.every((p) => 'final' in p && 'dealt' in p), 'the result reveals every card');
})();

// ---- 12. Night never stalls on a disconnect ------------------------------
(() => {
  const g = forceGame(['werewolf', 'seer', 'robber'], ['villager', 'troublemaker', 'tanner']);
  ok(g.activeStep.role === 'werewolf', 'wolf wakes first');
  g.removePlayer('p0'); // the active wolf vanishes mid-action
  ok(g.activeStep && g.activeStep.role === 'seer', 'night advances past a disconnected actor');
  g.removePlayer('p1'); // seer also gone
  ok(g.activeStep.role === 'robber', 'night keeps advancing');
})();

// ---- 13. Result includes a plain reason + a public night recap -----------
(() => {
  // Ann=Seer, Bo=Werewolf, Cy=Robber; center has no extra wolf.
  const g = forceGame(['seer', 'werewolf', 'robber'], ['villager', 'troublemaker', 'tanner']);
  g.nightAction('p1', { skip: true });                 // lone werewolf
  g.nightAction('p0', { mode: 'player', target: 'p1' }); // seer reads Bo (Werewolf)
  g.nightAction('p2', { target: 'p1' });               // robber robs Bo -> Cy becomes Werewolf, Bo becomes Robber
  ok(g.phase === 'day', 'night resolved to day');
  g.toggleReady('p0'); g.toggleReady('p1'); g.toggleReady('p2');
  // Everyone hangs Cy (the final Werewolf).
  g.castVote('p0', 'p2'); g.castVote('p1', 'p2'); g.castVote('p2', 'p0');
  ok(g.phase === 'result', 'reaches the result');
  const r = g.result;
  eq(r.team, 'village', 'village wins (a final werewolf was hanged)');
  ok(/Werewolf \(Cy\) was voted out/.test(r.reason), `reason names the eliminated werewolf (got "${r.reason}")`);

  // started -> ended is exposed in the reveal
  const cy = r.reveal.find((x) => x.name === 'Cy');
  const bo = r.reveal.find((x) => x.name === 'Bo');
  eq([cy.dealt, cy.final, cy.changed], ['robber', 'werewolf', true], "Cy's reveal shows robber -> werewolf");
  eq([bo.dealt, bo.final, bo.changed], ['werewolf', 'robber', true], "Bo's reveal shows werewolf -> robber");

  // night recap is public and ordered
  const kinds = r.nightActions.map((a) => a.k);
  ok(kinds[0] === 'wolves', 'recap leads with the werewolves');
  ok(r.nightActions.some((a) => a.k === 'seer-player' && a.name === 'Bo' && a.role === 'werewolf'), 'recap records the seer reading Bo as a werewolf');
  ok(r.nightActions.some((a) => a.k === 'robber' && a.actor === 'Cy' && a.role === 'werewolf'), 'recap records the robber stealing the werewolf card');
  eq(r.center.length, 3, 'recap exposes the three center cards');

  // No-death, no-wolf case yields the right village reason
  const g2 = forceGame(['villager', 'robber', 'troublemaker'], ['seer', 'insomniac', 'tanner']);
  while (g2.phase === 'night') g2.nightAction(g2.activeStep.playerId, { skip: true });
  g2.toggleReady('p0'); g2.toggleReady('p1'); g2.toggleReady('p2');
  g2.castVote('p0', 'p1'); g2.castVote('p1', 'p2'); g2.castVote('p2', 'p0'); // scattered, no death
  ok(/no one was eliminated — the Village wins/.test(g2.result.reason), 'no-wolf no-death reason reads as a village win');
})();

// ---- 14. Reconnect requires the seat's secret token (no name hijack) ------
(() => {
  const g = new Game('TEST');
  ['a', 'b', 'c'].forEach((id, i) => g.addPlayer(id, NAMES[i]));
  const boToken = g.byId('b').token;
  ok(typeof boToken === 'string' && boToken.length > 0, 'each seat is issued a secret token');
  g.start('a');
  ok(g.phase === 'night', 'host start moves into the night');

  // Attacker knows Bo's name + code but not the token -> rejected every way.
  ok(g.addPlayer('attacker', 'Bo') === null, 'reconnect without a token is rejected');
  ok(g.addPlayer('attacker', 'Bo', 'wrong') === null, 'reconnect with a wrong token is rejected');
  // Right token, but Bo is still online -> cannot displace a live seat.
  ok(g.addPlayer('attacker', 'Bo', boToken) === null, 'a still-connected seat cannot be reclaimed');
  ok(g.byId('b') && g.byId('b').id === 'b', 'the original Bo keeps the seat');

  // Bo drops, then reconnects with the right token -> granted.
  g.removePlayer('b');
  ok(g.byId('b').connected === false, "Bo's seat is marked disconnected, not removed");
  ok(g.addPlayer('attacker', 'Bo', 'wrong') === null, 'still rejected with a wrong token while disconnected');
  const seat = g.addPlayer('bo2', 'Bo', boToken);
  ok(seat && seat.connected === true, 'the correct token reclaims a disconnected seat');
  ok(seat.id === 'bo2' && seat.token === boToken, 'the reclaimed seat keeps its token under the new socket id');
})();

// ---- 15. Host migrates to a connected player when the host drops ----------
(() => {
  const g = forceGame(['werewolf', 'seer', 'villager'], ['robber', 'troublemaker', 'tanner']);
  while (g.phase === 'night') g.nightAction(g.activeStep.playerId, { skip: true });
  g.toggleReady('p0'); g.toggleReady('p1'); g.toggleReady('p2');
  g.castVote('p0', 'p1'); g.castVote('p1', 'p0'); g.castVote('p2', 'p0');
  ok(g.phase === 'result', 'reached the result screen');
  ok(g.hostId === 'p0', 'p0 is the host');
  g.removePlayer('p0');                                   // host leaves at the result
  ok(g.hostId === 'p1', 'the host migrates to the first connected player');
  ok(g.resetToLobby('p1').error === undefined, 'the new host can Play again');
  ok(g.phase === 'lobby', 'the room returns to the lobby under the new host');
})();

// ---- 16. Vote tally counts only currently-connected voters ----------------
(() => {
  const g = forceGame(['werewolf', 'seer', 'villager', 'villager'], ['robber', 'troublemaker', 'tanner']);
  while (g.phase === 'night') g.nightAction(g.activeStep.playerId, { skip: true });
  g.toggleReady('p0'); g.toggleReady('p1'); g.toggleReady('p2'); g.toggleReady('p3');
  ok(g.phase === 'vote', 'all ready -> vote phase');
  g.castVote('p0', 'p1'); g.castVote('p1', 'p0');         // a & b vote
  g.removePlayer('p1');                                   // b votes then drops
  ok(g.phase === 'vote', 'still voting — c and d have not voted');
  const v = g.viewFor('p0').vote;
  eq([v.votedCount, v.total], [1, 3], 'a disconnected voter is dropped from both the tally and the total');
})();

// ---- 17. A skipped night turn is flagged for the reconnecting player ------
(() => {
  const g = forceGame(['werewolf', 'seer', 'robber'], ['villager', 'troublemaker', 'tanner']);
  g.nightAction('p0', { skip: true });                   // lone werewolf acts
  ok(g.activeStep.playerId === 'p1', 'the seer is the active actor');
  g.removePlayer('p1');                                   // seer drops mid-turn
  ok(g.byId('p1').missedTurn === true, 'the dropped active actor is flagged as having missed their turn');
  ok(g.viewFor('p1').me.missedTurn === true, 'the missed-turn flag reaches the player view (shown on reconnect)');
  ok(g.activeStep.playerId === 'p2', 'the night still advances to the next actor');
})();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
