// Quest — engine rules tests. Run with: npm test
// Pure-logic tests (no network). The live e2e check uses PORT 3007 separately.
import { Game, EVIL_COUNT, TEAM_SIZES, ROLES, failsNeeded } from './game.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗ ' + m); } };
const eq = (a, b, m) => ok(a === b, `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const group = (name) => console.log('\n• ' + name);

// ---- helpers -------------------------------------------------------------
function seat(n) {
  const g = new Game('TEST');
  const ids = [];
  for (let i = 0; i < n; i++) { const p = g.addPlayer('p' + i, 'Player' + i); ids.push(p.id); }
  return { g, ids };
}

// Build a started game with a deterministic role assignment.
// roles: array of role keys aligned to player index. leaderIndex forced to 0.
function started(n, roles) {
  const { g, ids } = seat(n);
  g.start(ids[0]);
  if (roles) {
    g.players.forEach((p, i) => { p.role = roles[i]; p.team = ROLES[roles[i]].team; });
  }
  g.leaderIndex = 0;
  // skip the night-reveal acknowledgement
  g.phase = 'propose';
  g.players.forEach((p) => { p.ready = true; });
  return { g, ids };
}

function idsByRole(g, role) { return g.players.filter((p) => p.role === role).map((p) => p.id); }

// Everyone votes; supply a map id->approve (default approve).
function voteAll(g, ids, approveSet) {
  ids.forEach((id) => g.handleMessage(id, { t: 'vote', approve: approveSet ? approveSet.has(id) : true }));
}

// ---- 1. role & knowledge setup by count ----------------------------------
group('Role composition & night knowledge by player count');
for (let n = 5; n <= 10; n++) {
  const { g, ids } = seat(n);
  g.start(ids[0]);
  const evil = g.players.filter((p) => p.team === 'evil');
  const good = g.players.filter((p) => p.team === 'good');
  eq(evil.length, EVIL_COUNT[n], `${n}p: evil count`);
  eq(good.length, n - EVIL_COUNT[n], `${n}p: good count`);
  eq(idsByRole(g, 'assassin').length, 1, `${n}p: exactly one Assassin`);
  eq(idsByRole(g, 'morgana').length, 1, `${n}p: exactly one Sorceress`);
  eq(idsByRole(g, 'merlin').length, 1, `${n}p: exactly one Seer`);
  eq(idsByRole(g, 'percival').length, 1, `${n}p: exactly one Watcher`);
  eq(g.phase, 'reveal', `${n}p: enters night reveal`);
  ok(TEAM_SIZES[n].length === 5, `${n}p: five quest sizes defined`);
}

// Knowledge correctness (fixed roles, 7 players: assassin, sorceress, marauder + seer, watcher, knight, knight)
{
  const roles = ['merlin', 'percival', 'loyal', 'loyal', 'assassin', 'morgana', 'minion'];
  const { g, ids } = started(7, roles);
  const evilIds = g.players.filter((p) => p.team === 'evil').map((p) => p.id).sort();

  const seer = g.players.find((p) => p.role === 'merlin');
  const seerKnow = g.knowledgeFor(seer).ids.slice().sort();
  ok(JSON.stringify(seerKnow) === JSON.stringify(evilIds), 'Seer sees exactly the three evil players');

  const watcher = g.players.find((p) => p.role === 'percival');
  const wKnow = g.knowledgeFor(watcher).ids.slice().sort();
  const seerId = seer.id, sorcId = g.players.find((p) => p.role === 'morgana').id;
  ok(JSON.stringify(wKnow) === JSON.stringify([seerId, sorcId].sort()), 'Watcher sees Seer + Sorceress as two candidates');
  ok(wKnow.includes(seerId), 'Watcher candidate set includes the true Seer');

  const marauder = g.players.find((p) => p.role === 'minion');
  const mKnow = g.knowledgeFor(marauder).ids.slice().sort();
  const otherEvil = evilIds.filter((x) => x !== marauder.id);
  ok(JSON.stringify(mKnow) === JSON.stringify(otherEvil), 'Evil sees fellow conspirators (not self)');

  const knight = g.players.find((p) => p.role === 'loyal');
  eq(g.knowledgeFor(knight).ids.length, 0, 'Loyal Knight knows nothing');

  // Redaction: a knight's view must not reveal anyone else's role/team
  const view = g.gameView(knight.id);
  const leak = view.players.filter((p) => p.id !== knight.id && (p.role || p.team));
  eq(leak.length, 0, 'gameView redacts every other player’s identity');
  eq(view.yourRole.key, 'loyal', 'gameView reveals your own role to you');
}

// ---- 2. proposal + approval voting --------------------------------------
group('Proposal & simultaneous approval vote');
{
  const roles = ['merlin', 'percival', 'loyal', 'assassin', 'morgana'];
  const { g, ids } = started(5, roles); // quest 0 needs team of 2
  eq(g.teamSize(), 2, '5p quest 1 team size = 2');

  // non-leader cannot propose
  ok(g.handleMessage(ids[1], { t: 'propose', team: [ids[0], ids[1]] }).error, 'non-leader blocked from proposing');
  // wrong size rejected
  ok(g.handleMessage(ids[0], { t: 'propose', team: [ids[0]] }).error, 'wrong team size rejected');
  // valid proposal
  eq(g.handleMessage(ids[0], { t: 'propose', team: [ids[0], ids[1]] }).error, undefined, 'valid proposal accepted');
  eq(g.phase, 'vote', 'enters vote phase');

  // votes hidden until all in: partial vote keeps phase
  g.handleMessage(ids[0], { t: 'vote', approve: true });
  eq(g.phase, 'vote', 'still voting before everyone acts');
  const midView = g.gameView(ids[1]);
  eq(midView.lastVote, null, 'no votes revealed mid-vote');
  eq(midView.voteProgress, 1, 'vote progress counts ballots cast');

  // finish: 4 approve, 1 reject -> majority approves
  g.handleMessage(ids[1], { t: 'vote', approve: true });
  g.handleMessage(ids[2], { t: 'vote', approve: true });
  g.handleMessage(ids[3], { t: 'vote', approve: true });
  g.handleMessage(ids[4], { t: 'vote', approve: false });
  eq(g.phase, 'voteReveal', 'all votes in -> reveal');
  eq(g.lastVote.approved, true, 'majority approves');
  g.handleMessage(ids[0], { t: 'proceed' });
  eq(g.phase, 'quest', 'approved team proceeds to the quest');
}

// Tie / minority rejects and passes leadership
{
  const roles = ['merlin', 'percival', 'loyal', 'assassin', 'morgana'];
  const { g, ids } = started(6 - 1, roles); // 5 players
  g.handleMessage(ids[0], { t: 'propose', team: [ids[0], ids[1]] });
  // 2 approve, 3 reject -> rejected
  voteAll(g, ids, new Set([ids[0], ids[1]]));
  eq(g.lastVote.approved, false, 'minority does not approve');
  g.handleMessage(ids[0], { t: 'proceed' });
  eq(g.phase, 'propose', 'rejected -> back to proposing');
  eq(g.leaderIndex, 1, 'leadership advances on rejection');
  eq(g.rejectCount, 1, 'rejection tracker increments');
}

// ---- 3. rejection tracker: 5 rejects = evil win --------------------------
group('Five consecutive rejections — Evil wins');
{
  const roles = ['merlin', 'percival', 'loyal', 'assassin', 'morgana'];
  const { g, ids } = started(5, roles);
  for (let r = 0; r < 5; r++) {
    const leader = g.leader().id;
    g.handleMessage(leader, { t: 'propose', team: [ids[0], ids[1]] });
    voteAll(g, ids, new Set()); // everyone rejects
    g.handleMessage(leader, { t: 'proceed' });
  }
  eq(g.phase, 'over', 'game ends after 5 rejections');
  eq(g.winner, 'evil', 'Evil wins on 5 rejections');
  eq(g.winPath, 'five_rejects', 'win path recorded as five_rejects');
}

// ---- 4. quest success / fail resolution + two-fails rule -----------------
group('Quest resolution & secret success/fail');
function runQuest(g, ids, teamIds, failers) {
  const leader = g.leader().id;
  g.handleMessage(leader, { t: 'propose', team: teamIds });
  voteAll(g, ids); // unanimous approve
  g.handleMessage(leader, { t: 'proceed' });
  // each team member plays a card
  teamIds.forEach((id) => g.handleMessage(id, { t: 'play', success: !failers.has(id) }));
}
{
  const roles = ['merlin', 'percival', 'loyal', 'assassin', 'morgana'];
  const { g, ids } = started(5, roles);
  const assassin = idsByRole(g, 'assassin')[0];
  runQuest(g, ids, [ids[0], assassin], new Set([assassin])); // one fail
  eq(g.phase, 'questReveal', 'quest reveals after all cards in');
  eq(g.lastQuest.failCount, 1, 'one fail counted');
  eq(g.lastQuest.passed, false, 'one fail sinks a single-fail quest');

  // Good cannot betray: a good player playing fail is coerced to success
  const { g: g2, ids: i2 } = started(5, roles);
  runQuest(g2, i2, [i2[0], i2[1]], new Set([i2[0], i2[1]])); // both good attempt fail
  eq(g2.lastQuest.failCount, 0, 'loyal players cannot fail a quest');
  eq(g2.lastQuest.passed, true, 'quest succeeds despite good trying to fail');

  // individual cards are never exposed in the view
  const v = g2.gameView(i2[2]);
  ok(!('cards' in v) && v.lastQuest.failCount === 0 && v.lastQuest.size === 2, 'only the tally is revealed, not who failed');
}

// two-fails rule: quest index 3 with 7+ players needs 2 fails
{
  eq(failsNeeded(3, 7), 2, 'quest 4 needs 2 fails at 7 players');
  eq(failsNeeded(3, 6), 1, 'quest 4 needs 1 fail at 6 players');
  eq(failsNeeded(0, 7), 1, 'quest 1 needs 1 fail');

  const roles = ['merlin', 'percival', 'loyal', 'loyal', 'assassin', 'morgana', 'minion'];
  const { g, ids } = started(7, roles);
  g.questIndex = 3; // 4th quest, team size 4
  eq(g.teamSize(), 4, '7p quest 4 team size = 4');
  eq(g.needed(), 2, '7p quest 4 needs two fails');
  const evil = g.players.filter((p) => p.team === 'evil').map((p) => p.id);
  // team = two evil + two good, ONE fail -> still passes (needs 2)
  runQuest(g, ids, [ids[0], ids[1], evil[0], evil[1]], new Set([evil[0]]));
  eq(g.lastQuest.failCount, 1, 'one betrayal recorded');
  eq(g.lastQuest.passed, true, 'one fail is not enough on quest 4 (7+ players)');

  // now two fails -> fails
  const { g: g3, ids: i3 } = started(7, roles);
  g3.questIndex = 3;
  const evil3 = g3.players.filter((p) => p.team === 'evil').map((p) => p.id);
  runQuest(g3, i3, [i3[0], i3[1], evil3[0], evil3[1]], new Set([evil3[0], evil3[1]]));
  eq(g3.lastQuest.passed, false, 'two fails sink quest 4 at 7 players');
}

// ---- 5. three wins condition -> assassin phase ---------------------------
group('Three quest results decide the game');
function winQuests(g, ids, outcomes) {
  // outcomes: array of true(success)/false(fail) applied in order
  for (const success of outcomes) {
    const leader = g.leader().id;
    const size = g.teamSize();
    const team = ids.slice(0, size);
    const evilOnTeam = g.players.filter((p) => team.includes(p.id) && p.team === 'evil').map((p) => p.id);
    g.handleMessage(leader, { t: 'propose', team });
    voteAll(g, ids);
    g.handleMessage(leader, { t: 'proceed' });
    const failers = new Set();
    if (!success) {
      // ensure an evil player is on the team to fail it
      failers.add(evilOnTeam[0]);
    }
    team.forEach((id) => g.handleMessage(id, { t: 'play', success: !failers.has(id) }));
    g.handleMessage(leader, { t: 'proceed' });
  }
}
{
  // Three failed quests -> evil wins outright
  const roles = ['merlin', 'percival', 'loyal', 'assassin', 'morgana'];
  const { g, ids } = started(5, roles);
  // put an evil player in the first slots so fails are possible
  // reorder ids so index0/1 include an evil for the team
  const evil = g.players.find((p) => p.team === 'evil');
  // ensure team slices contain evil: move evil player to front
  g.players.sort((a, b) => (a.team === 'evil' ? -1 : 1));
  const ord = g.players.map((p) => p.id);
  winQuests(g, ord, [false, false, false]);
  eq(g.phase, 'over', 'three fails ends the game');
  eq(g.winner, 'evil', 'three failed quests -> Evil wins');
  eq(g.winPath, 'three_fails', 'win path recorded as three_fails');
}
{
  // Three successful quests -> assassin phase (not an immediate good win)
  const roles = ['merlin', 'percival', 'loyal', 'assassin', 'morgana'];
  const { g, ids } = started(5, roles);
  winQuests(g, ids, [true, true, true]);
  eq(g.phase, 'assassin', 'three successes trigger the Assassin endgame');
  eq(g.winner, null, 'good has not won yet — Assassin must strike');
  ok(g.gameView(ids[0]).assassin === idsByRole(g, 'assassin')[0], 'view exposes who the Assassin is at this point');
}

// ---- 6. assassin endgame both branches -----------------------------------
group('Assassin’s final strike');
{
  const roles = ['merlin', 'percival', 'loyal', 'assassin', 'morgana'];
  const { g, ids } = started(5, roles);
  winQuests(g, ids, [true, true, true]);
  const assassin = idsByRole(g, 'assassin')[0];
  const seer = idsByRole(g, 'merlin')[0];
  // only assassin may strike
  ok(g.handleMessage(seer, { t: 'assassinate', target: seer }).error, 'non-assassin cannot strike');
  // cannot strike a fellow evil
  ok(g.handleMessage(assassin, { t: 'assassinate', target: idsByRole(g, 'morgana')[0] }).error, 'cannot strike own side');
  // strike the Seer -> evil steals the win
  g.handleMessage(assassin, { t: 'assassinate', target: seer });
  eq(g.phase, 'over', 'assassination ends the game');
  eq(g.winner, 'evil', 'striking the Seer flips victory to Evil');
  eq(g.winPath, 'assassin_hit', 'win path recorded as assassin_hit');
  const vw = g.gameView(seer);
  eq(vw.merlin, seer, 'over view reveals who Merlin was');
  eq(vw.assassinTarget, seer, 'over view reveals the Assassin target');
}
{
  const roles = ['merlin', 'percival', 'loyal', 'assassin', 'morgana'];
  const { g, ids } = started(5, roles);
  winQuests(g, ids, [true, true, true]);
  const assassin = idsByRole(g, 'assassin')[0];
  const knight = idsByRole(g, 'loyal')[0];
  g.handleMessage(assassin, { t: 'assassinate', target: knight });
  eq(g.winner, 'good', 'missing the Seer confirms the realm’s victory');
  eq(g.winPath, 'assassin_miss', 'win path recorded as assassin_miss');
  // at game over, all roles are revealed
  const v = g.gameView(knight.id);
  ok(v.players.every((p) => p.role), 'all identities revealed at game over');
  eq(v.merlin, idsByRole(g, 'merlin')[0], 'over view reveals Merlin to everyone');
}

// ---- summary -------------------------------------------------------------
console.log(`\n${fail === 0 ? '✓ all passing' : '✗ failures'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
