// Engine rules tests for Sealed. Run with: npm test  (PORT 3006 service unaffected)
import { Game, CARDS } from './game.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗ ' + m); } };
const eq = (a, b, m) => ok(a === b, `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);

// Build a started 2-or-3-player game, then force a deterministic board so we can
// exercise each effect without fighting the shuffle.
function table(names = ['Ann', 'Bo']) {
  const g = new Game('TEST');
  names.forEach((n, i) => g.addPlayer(String(i), n));
  g.start('0');
  return g;
}
// Put the game into a clean play state with explicit hands & deck.
function board(g, hands, { deck = [], turn = 0, setAside = 4 } = {}) {
  g.phase = 'play';
  g.turnIndex = turn;
  // Front-pad so the listed cards are drawn first (draws pop from the end).
  const pad = [];
  while (pad.length + deck.length < 4) pad.push(1);
  g.deck = [...pad, ...deck];
  g.setAside = setAside;
  g.roundResult = null;
  g.players.forEach((p, i) => { p.hand = [...hands[i]]; p.discards = []; p.eliminated = false; p.protected = false; });
}

// ---- lobby & deal ----------------------------------------------------------
{
  const g = table();
  eq(g.players.length, 2, 'two players join the lobby');
  eq(g.phase, 'play', 'host can start; round deals into play');
  eq(g.players[0].hand.length + g.players[1].hand.length, 3, 'opener holds 2, other holds 1');
  ok(g.players.every((p) => p.tokens === 0), 'everyone starts with no Favors');
  ok(g.faceUp.length === 3, 'a 2-player round reveals three letters');
  eq(g.deck.length, 16 - 1 - 3 - 2 - 1, 'deck = 16 - setAside - 3 faceUp - 2 dealt - 1 drawn');
}

// ---- The Guard (rank 1): correct & wrong guess ---------------------------
{
  const g = table();
  board(g, [[1, 3], [5]], { turn: 0 });   // Ann holds Guard(1)+Baron(3); Bo holds Prince(5)
  g.handleMessage('0', { t: 'play', card: 1, target: '1', guess: 5 });
  ok(g.players[1].eliminated, 'Guard: a correct guess eliminates the rival');
}
{
  const g = table();
  board(g, [[1, 3], [5]], { turn: 0 });
  g.handleMessage('0', { t: 'play', card: 1, target: '1', guess: 2 });
  ok(!g.players[1].eliminated, 'Guard: a wrong guess does nothing');
}
{
  const g = table();
  board(g, [[1, 3], [5]], { turn: 0 });
  const r = g.handleMessage('0', { t: 'play', card: 1, target: '1', guess: 1 });
  ok(r.error, 'Guard: cannot guess rank 1 (the Guard)');
}

// ---- The Priest (rank 2): private peek ---------------------------------
{
  const g = table();
  board(g, [[2, 4], [6]], { turn: 0 });
  g.handleMessage('0', { t: 'play', card: 2, target: '1' });
  const view = g.viewFor('0');
  eq(view.privateInfo?.type, 'peek', 'Priest: actor gets a private peek');
  eq(view.privateInfo?.card, 6, 'Priest: peek reveals the rival\'s real letter');
  ok(g.viewFor('1').players.find((p) => p.id === '0').hand === null, 'Priest: peek does not leak to anyone else');
}

// ---- The Baron (rank 3): compare, lower withdraws ------------------------
{
  const g = table();
  board(g, [[3, 7], [2]], { turn: 0 });   // Ann keeps Countess(7) vs Bo's Priest(2)
  g.handleMessage('0', { t: 'play', card: 3, target: '1' });
  ok(g.players[1].eliminated && !g.players[0].eliminated, 'Baron: lower rank is eliminated');
}
{
  const g = table();
  board(g, [[3, 2], [7]], { turn: 0 });   // Ann keeps 2 vs Bo's 7 → Ann loses
  g.handleMessage('0', { t: 'play', card: 3, target: '1' });
  ok(g.players[0].eliminated && !g.players[1].eliminated, 'Baron: the player can lose their own compare');
}
{
  const g = table(['Ann', 'Bo', 'Cy']);
  board(g, [[3, 5], [5], [2]], { turn: 0 });  // tie 5 vs 5
  g.handleMessage('0', { t: 'play', card: 3, target: '1' });
  ok(!g.players[0].eliminated && !g.players[1].eliminated, 'Baron: an equal duel eliminates no one');
}

// ---- The Handmaid (rank 4): immunity --------------------------------------
{
  const g = table(['Ann', 'Bo', 'Cy']);
  board(g, [[4, 1], [3], [2]], { turn: 0 });
  g.handleMessage('0', { t: 'play', card: 4, target: null });
  ok(g.players[0].protected, 'Handmaid: grants immunity');
  // Bo's turn: cannot target the protected Ann
  board(g, [[1], [1, 3], [2]], { turn: 1 });
  g.players[0].protected = true;
  const r = g.handleMessage('1', { t: 'play', card: 1, target: '0', guess: 2 });
  ok(r.error, 'Handmaid: a protected courtier cannot be targeted');
}
{
  // immunity is cleared when your own next turn begins
  const g = table();
  board(g, [[4, 1], [4]], { turn: 0 });
  g.handleMessage('0', { t: 'play', card: 4 });   // Ann protected, turn -> Bo
  ok(g.players[0].protected, 'Handmaid: immunity holds through rivals\' turns');
  g.handleMessage('1', { t: 'play', card: 4 });   // Bo plays Handmaid, turn -> Ann (drawn)
  ok(!g.players[0].protected, 'Handmaid: immunity lifts at the start of your next turn');
}

// ---- The Prince (rank 5): discard & redraw; Princess discard = out -----------
{
  const g = table();
  board(g, [[5, 2], [3]], { turn: 0, deck: [6] });
  g.handleMessage('0', { t: 'play', card: 5, target: '1' });
  ok(!g.players[1].eliminated, 'Prince: forcing a normal discard does not eliminate');
  eq(g.players[1].hand[0], 6, 'Prince: target draws a fresh letter');
  ok(g.players[1].discards.includes(3), 'Prince: the discarded letter is public');
}
{
  const g = table();
  board(g, [[5, 2], [8]], { turn: 0 });
  g.handleMessage('0', { t: 'play', card: 5, target: '1' });
  ok(g.players[1].eliminated, 'Prince: forcing a Princess discard eliminates the target');
}
{
  // Prince may target itself; with empty deck the target draws the set-aside card
  const g = table();
  board(g, [[5, 2], [3]], { turn: 0, deck: [], setAside: 7 });
  // override the auto-pad: drain to empty so the set-aside is used
  g.deck = [];
  g.handleMessage('0', { t: 'play', card: 5, target: '0' });
  eq(g.players[0].hand[0], 7, 'Prince: an empty satchel hands over the set-aside letter');
}

// ---- The King (rank 6): swap hands -----------------------------------
{
  const g = table();
  board(g, [[6, 2], [8]], { turn: 0 });
  g.handleMessage('0', { t: 'play', card: 6, target: '1' });
  eq(g.players[0].hand[0], 8, 'King: actor receives the rival\'s letter');
  eq(g.players[1].hand[0], 2, 'King: rival receives the actor\'s letter');
}

// ---- The Countess (rank 7) forced-discard rule ------------------------------
{
  const g = table();
  board(g, [[7, 5], [2]], { turn: 0 });   // holds Countess + Prince → must play Countess
  const r = g.handleMessage('0', { t: 'play', card: 5, target: '1' });
  ok(r.error, 'Countess: must discard her when held with the Prince');
  const r2 = g.handleMessage('0', { t: 'play', card: 7 });
  ok(!r2.error, 'Countess: playing her is allowed');
}
{
  const g = table();
  board(g, [[7, 6], [2]], { turn: 0 });   // Countess + King → must play Countess
  const r = g.handleMessage('0', { t: 'play', card: 6, target: '1' });
  ok(r.error, 'Countess: must discard her when held with the King');
}
{
  const g = table();
  board(g, [[7, 3], [2]], { turn: 0 });   // Countess + Baron → NOT forced
  const r = g.handleMessage('0', { t: 'play', card: 3, target: '1' });
  ok(!r.error, 'Countess: not forced beside a harmless letter');
}

// ---- The Princess (rank 8): discarding her eliminates you -------------------
{
  const g = table();
  board(g, [[8, 2], [3]], { turn: 0 });
  g.handleMessage('0', { t: 'play', card: 8 });
  ok(g.players[0].eliminated, 'Princess: playing her eliminates you');
}

// ---- targeting when every rival is shielded → no effect --------------------
{
  const g = table(['Ann', 'Bo', 'Cy']);
  board(g, [[1, 2], [3], [4]], { turn: 0 });
  g.players[1].protected = true; g.players[2].protected = true;
  const r = g.handleMessage('0', { t: 'play', card: 1, target: null });
  ok(!r.error && !g.players[1].eliminated && !g.players[2].eliminated, 'Guard fizzles when all rivals are shielded');
  eq(g.players[g.turnIndex].id, '1', 'turn still advances after a fizzle');
}

// ---- round win: last courtier standing -------------------------------------
{
  const g = table();
  board(g, [[1, 3], [5]], { turn: 0 });
  g.handleMessage('0', { t: 'play', card: 1, target: '1', guess: 5 }); // eliminate Bo
  eq(g.phase, 'roundEnd', 'round ends when one courtier remains');
  ok(g.players[0].tokens === 1, 'the survivor earns a Favor');
  ok(g.roundResult.winners.includes('0'), 'round result names the winner');
  eq(g.roundResult.reason, 'last', 'last-standing win is flagged');
  ok(/Ann/.test(g.roundResult.reasonText) && /last/i.test(g.roundResult.reasonText),
    'reasonText is a plain sentence naming the last suitor standing');
  ok(g.roundResult.fallen.some((f) => f.id === '1' && f.card === 5),
    'fallen reveals the knocked-out rival was caught holding the Prince');
}

// ---- round win: highest letter when the satchel empties --------------------
{
  const g = table();
  board(g, [[2, 4], [6]], { turn: 0, deck: [] });
  g.deck = []; // empty so the next draw ends the round by comparison
  g.handleMessage('0', { t: 'play', card: 2, target: '1' }); // Ann keeps 4; deck empty → compare
  eq(g.phase, 'roundEnd', 'an empty satchel ends the round');
  ok(g.roundResult.winners.includes('1'), 'highest held letter (King 6 > 4) wins');
  eq(g.roundResult.reason, 'compare', 'satchel-empty win is a comparison');
  eq(g.roundResult.compare.winnerCard, 6, 'compare records the winning letter');
  eq(g.roundResult.compare.rivalCard, 4, 'compare records the beaten letter');
  ok(g.roundResult.compare.tiebreak === false, 'a clean rank win is not a tiebreak');
  ok(/King/.test(g.roundResult.reasonText) && /beats/.test(g.roundResult.reasonText),
    'reasonText spells out which letter beat which');
}

// ---- round win: tie on rank, broken by letters set aside --------------------
{
  const g = table();
  board(g, [[2, 6], [6]], { turn: 0, deck: [] });
  g.deck = [];
  g.handleMessage('0', { t: 'play', card: 2, target: '1' }); // Ann discards the Priest, keeps King(6) vs Bo's King(6)
  eq(g.phase, 'roundEnd', 'a tied comparison still ends the round');
  ok(g.roundResult.winners.length === 1 && g.roundResult.winners.includes('0'),
    'equal letters: more discarded breaks the tie');
  ok(g.roundResult.compare.tiebreak === true, 'compare flags a discard-sum tiebreak');
  ok(/courted more/.test(g.roundResult.reasonText), 'reasonText explains the tiebreak in plain words');
}

// ---- game win: reaching the Favor goal -------------------------------------
{
  const g = table();
  g.favorGoal = 1;
  board(g, [[1, 3], [5]], { turn: 0 });
  g.handleMessage('0', { t: 'play', card: 1, target: '1', guess: 5 });
  eq(g.phase, 'over', 'reaching the Favor goal ends the soirée');
  eq(g.gameWinnerId, '0', 'the soirée winner is recorded');
}

// ---- redaction: you only ever see your own letter --------------------------
{
  const g = table();
  board(g, [[2, 4], [6]], { turn: 0 });
  const vA = g.viewFor('0');
  ok(Array.isArray(vA.players.find((p) => p.id === '0').hand), 'you see your own hand');
  eq(vA.players.find((p) => p.id === '1').hand, null, 'you never see a rival\'s hand mid-round');
}

// ---- host can deal the next round; non-host cannot -------------------------
{
  const g = table();
  board(g, [[1, 3], [5]], { turn: 0 });
  g.handleMessage('0', { t: 'play', card: 1, target: '1', guess: 5 });
  eq(g.phase, 'roundEnd', 'between rounds we pause at roundEnd');
  ok(g.nextRound('1').error, 'only the host deals the next round');
  ok(!g.nextRound('0').error, 'the host deals the next round');
  eq(g.phase, 'play', 'a fresh round is in play');
}

// ---- deck integrity --------------------------------------------------------
{
  const total = Object.values(CARDS).reduce((a, c) => a + c.count, 0);
  eq(total, 16, 'the deck is exactly 16 letters');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
