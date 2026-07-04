import { CoupGame } from './game.js';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('  ✗ ' + msg); } };

// Force a player's hand for deterministic tests.
const setHand = (g, name, chars) => {
  const p = g.players.find((x) => x.name === name);
  p.influence = chars.map((c) => ({ char: c, revealed: false }));
};

function newGame() {
  const g = new CoupGame('TEST');
  g.addPlayer('a', 'Ann');
  g.addPlayer('b', 'Bo');
  g.addPlayer('c', 'Cy');
  g.start('a');
  return g;
}

// 1. Income
(() => {
  const g = newGame();
  const before = g.byId('a').coins;
  g.declare('a', 'income');
  ok(g.byId('a').coins === before + 1, 'income gives +1');
  ok(g.current().id === 'b', 'turn advances after income');
})();

// 2. Tax unchallenged
(() => {
  const g = newGame();
  setHand(g, 'Ann', ['duke', 'captain']);
  g.declare('a', 'tax');
  ok(g.phase === 'response', 'tax opens a response window');
  g.respond('b', 'pass'); g.respond('c', 'pass');
  ok(g.byId('a').coins === 5, 'tax gives +3 when unchallenged (2+3)');
  ok(g.current().id === 'b', 'turn advances after tax');
})();

// 3. Tax challenged, claimant honest -> challenger loses a card
(() => {
  const g = newGame();
  setHand(g, 'Ann', ['duke', 'captain']);
  setHand(g, 'Bo', ['contessa', 'contessa']);
  g.declare('a', 'tax');
  g.respond('b', 'challenge');
  ok(g.phase === 'lose' && g.pendingLoss.playerId === 'b', 'wrong challenger must lose influence');
  g.loseInfluence('b', 0);
  ok(g.byId('b').influence.filter((c) => c.revealed).length === 1, 'Bo lost one card');
  ok(g.byId('a').coins === 5, 'honest tax still pays after winning challenge');
})();

// 4. Tax challenged, claimant bluffing -> claimant loses, no coins
(() => {
  const g = newGame();
  setHand(g, 'Ann', ['captain', 'captain']);
  g.declare('a', 'tax');
  g.respond('b', 'challenge');
  ok(g.pendingLoss.playerId === 'a', 'caught bluffer must lose influence');
  g.loseInfluence('a', 0);
  ok(g.byId('a').coins === 2, 'bluffed tax pays nothing');
})();

// 5. Foreign aid blocked by Duke (unchallenged block) -> no coins
(() => {
  const g = newGame();
  g.declare('a', 'foreign_aid');
  g.respond('b', 'block', 'duke');
  ok(g.phase === 'response' && g.pending.block.blocker === 'b', 'block opens a block-challenge window');
  g.respond('a', 'pass'); g.respond('c', 'pass');
  ok(g.byId('a').coins === 2, 'blocked foreign aid yields nothing');
  ok(g.current().id === 'b', 'turn advances after blocked foreign aid');
})();

// 6. Foreign aid block challenged, blocker bluffing -> aid applies
(() => {
  const g = newGame();
  setHand(g, 'Bo', ['captain', 'captain']); // no duke
  g.declare('a', 'foreign_aid');
  g.respond('b', 'block', 'duke');
  g.respond('a', 'challenge');
  ok(g.pendingLoss.playerId === 'b', 'bluffing blocker loses influence');
  g.loseInfluence('b', 0);
  ok(g.byId('a').coins === 4, 'foreign aid applies after block is broken');
})();

// 7. Assassinate unblocked -> target loses card, 3 coins spent
(() => {
  const g = newGame();
  g.byId('a').coins = 5;
  setHand(g, 'Ann', ['assassin', 'duke']);
  g.declare('a', 'assassinate', 'b');
  g.respond('b', 'pass'); g.respond('c', 'pass');
  ok(g.phase === 'lose' && g.pendingLoss.playerId === 'b', 'assassination forces target to lose');
  g.loseInfluence('b', 0);
  ok(g.byId('a').coins === 2, 'assassinate costs 3');
})();

// 8. Assassinate blocked by Contessa (unchallenged) -> target safe, coins gone
(() => {
  const g = newGame();
  g.byId('a').coins = 5;
  setHand(g, 'Ann', ['assassin', 'duke']);
  setHand(g, 'Bo', ['contessa', 'captain']);
  g.declare('a', 'assassinate', 'b');
  g.respond('b', 'block', 'contessa');
  g.respond('a', 'pass'); g.respond('c', 'pass');
  ok(g.byId('b').influence.every((c) => !c.revealed), 'contessa block saves the target');
  ok(g.byId('a').coins === 2, 'coins still spent on blocked assassination');
})();

// 9. Assassinate, assassin caught bluffing -> refund + assassin loses
(() => {
  const g = newGame();
  g.byId('a').coins = 5;
  setHand(g, 'Ann', ['duke', 'captain']); // no assassin
  g.declare('a', 'assassinate', 'b');
  g.respond('b', 'challenge');
  ok(g.pendingLoss.playerId === 'a', 'caught assassin loses influence');
  g.loseInfluence('a', 0);
  ok(g.byId('a').coins === 5, 'caught assassin is refunded the 3 coins');
  ok(g.byId('b').influence.every((c) => !c.revealed), 'target unharmed when assassin bluffs');
})();

// 10. Steal -> moves up to 2 coins
(() => {
  const g = newGame();
  setHand(g, 'Ann', ['captain', 'duke']);
  g.byId('b').coins = 5;
  g.declare('a', 'steal', 'b');
  g.respond('b', 'pass'); g.respond('c', 'pass');
  ok(g.byId('a').coins === 4 && g.byId('b').coins === 3, 'steal moves 2 coins');
})();

// 11. Steal blocked by Ambassador
(() => {
  const g = newGame();
  setHand(g, 'Ann', ['captain', 'duke']);
  setHand(g, 'Bo', ['ambassador', 'duke']);
  g.byId('b').coins = 5;
  g.declare('a', 'steal', 'b');
  g.respond('b', 'block', 'ambassador');
  g.respond('a', 'pass'); g.respond('c', 'pass');
  ok(g.byId('a').coins === 2 && g.byId('b').coins === 5, 'ambassador blocks the steal');
})();

// 12. Coup forces a loss and costs 7
(() => {
  const g = newGame();
  g.byId('a').coins = 7;
  g.declare('a', 'coup', 'b');
  ok(g.phase === 'lose' && g.pendingLoss.playerId === 'b', 'coup forces target loss');
  g.loseInfluence('b', 0);
  ok(g.byId('a').coins === 0, 'coup costs 7');
})();

// 13. Forced coup at 10 coins
(() => {
  const g = newGame();
  g.byId('a').coins = 10;
  const r = g.declare('a', 'income');
  ok(r.error, 'cannot take income with 10+ coins');
})();

// 14. Exchange swaps cards
(() => {
  const g = newGame();
  setHand(g, 'Ann', ['duke', 'captain']);
  g.declare('a', 'exchange');
  g.respond('b', 'pass'); g.respond('c', 'pass');
  ok(g.phase === 'exchange' && g.exchangeFor('a').cards.length === 4, 'exchange offers 4 cards');
  const r = g.finishExchange('a', [0, 1]);
  ok(!r.error && g.alive(g.byId('a')) === 2, 'exchange keeps the right count');
  ok(g.current().id === 'b', 'turn advances after exchange');
})();

// 15. Win detection
(() => {
  const g = newGame();
  g.players = g.players.slice(0, 2);
  setHand(g, 'Ann', ['duke', 'captain']);
  setHand(g, 'Bo', ['contessa']);
  g.byId('a').coins = 7;
  g.declare('a', 'coup', 'b');
  g.loseInfluence('b', 0);
  ok(g.phase === 'over' && g.winner === 'a', 'last player standing wins');
})();

// 16. Private views hide opponents' cards
(() => {
  const g = newGame();
  const view = g.viewFor('a');
  const me = view.players.find((p) => p.id === 'a');
  const them = view.players.find((p) => p.id === 'b');
  ok(me.cards.every((c) => c.char !== null), 'you can see your own cards');
  ok(them.cards.every((c) => c.char === null), "you cannot see opponents' face-down cards");
})();

// N. A challenge win that ENDS the game must not shuffle the winner's proven
//    card — the showdown reveals the card they actually held.
(() => {
  const g = newGame();
  // Make it heads-up: eliminate Cy.
  const cy = g.players.find((p) => p.name === 'Cy');
  cy.influence = [{ char: 'ambassador', revealed: true }, { char: 'ambassador', revealed: true }];
  cy.eliminated = true;
  setHand(g, 'Ann', ['duke', 'captain']);
  setHand(g, 'Bo', ['contessa']);           // Bo has a single influence left

  g.declare('a', 'tax');                     // Ann claims Duke
  g.respond('b', 'challenge');               // Bo challenges and is wrong
  ok(g.phase === 'over' && g.winner === 'a', 'the challenge loss ends the game, defender wins');
  const ann = g.byId('a');
  ok(ann.influence.some((c) => c.char === 'duke' && !c.revealed),
    'winner keeps the proven Duke — it is NOT shuffled away on the winning move');
  const view = g.viewFor('b');               // loser's view at the showdown
  const annCards = view.players.find((p) => p.id === 'a').cards.map((c) => c.char);
  ok(annCards.includes('duke'), 'the showdown reveals the winner’s actual proven card');
})();

// N+1. A challenge win that does NOT end the game still replaces the proven card.
(() => {
  const g = newGame();
  setHand(g, 'Ann', ['duke', 'captain']);
  setHand(g, 'Bo', ['contessa', 'contessa']);   // Bo survives losing one
  g.declare('a', 'tax');
  g.respond('b', 'challenge');
  g.loseInfluence('b', 0);
  ok(g.phase !== 'over', 'the game continues (Bo still has a card)');
  const ann = g.byId('a');
  ok(ann.influence.length === 2, 'winner still holds two influences after the redraw');
  // The proven Duke was shuffled back and a fresh card drawn into that slot;
  // Ann's hand may or may not still be Duke, but the game continued normally.
})();

// N+2. Only the TARGET may block an assassination with a Contessa (official
//      rule) — a bystander cannot interpose one for someone else. Bluffing your
//      OWN Contessa block is allowed (it's checked only if challenged).
(() => {
  const g = newGame();
  setHand(g, 'Ann', ['assassin', 'duke']);
  setHand(g, 'Bo', ['duke', 'ambassador']);       // the target, no Contessa
  setHand(g, 'Cy', ['contessa', 'contessa']);      // a bystander holding Contessas
  g.byId('a').coins = 3;
  g.declare('a', 'assassinate', 'b');
  const bystander = g.respond('c', 'block', 'contessa');
  ok(bystander && bystander.error, 'a bystander cannot block another player’s assassination');
  const own = g.respond('b', 'block', 'contessa'); // the target bluffs their own Contessa
  ok(!own || !own.error, 'the target may block (or bluff) their own assassination with a Contessa');
  ok(g.pending.block && g.pending.block.blocker === 'b', 'the target’s Contessa block is registered');
})();

// Turn clock — an idle turn auto-takes Income.
(() => {
  const g = newGame();
  ok(g.turnDeadline != null, 'a turn clock is armed at game start');
  ok(g.viewFor('a').turnEndsInMs > 0 && g.viewFor('a').turnSeconds === 10, 'the view exposes the 10s clock');
  const who = g.current().id;
  g.turnDeadline = Date.now() - 1;                 // force the clock expired
  g.timeout();
  ok(g.byId(who).coins === 3, 'an idle turn auto-takes Income (2 → 3)');
  ok(g.current().id !== who, 'the turn advances after the auto-action');
})();

// Turn clock — an idle challenge/block window auto-passes; the action resolves.
(() => {
  const g = newGame();
  setHand(g, 'Ann', ['duke', 'captain']);
  g.declare('a', 'tax');
  ok(g.phase === 'response' && g.turnDeadline != null, 'a response window arms the clock');
  g.turnDeadline = Date.now() - 1;
  g.timeout();
  ok(g.byId('a').coins === 5, 'an unchallenged tax resolves when the window times out');
})();

// Turn clock — an idle "lose influence" choice drops the first card.
(() => {
  const g = newGame();
  setHand(g, 'Ann', ['duke', 'captain']);
  setHand(g, 'Bo', ['contessa', 'ambassador']);
  g.byId('a').coins = 7;
  g.declare('a', 'coup', 'b');
  ok(g.phase === 'lose' && g.pendingLoss.playerId === 'b', 'a coup forces the target to choose a card');
  g.turnDeadline = Date.now() - 1;
  g.timeout();
  ok(g.byId('b').influence.filter((c) => c.revealed).length === 1, 'the idle target auto-drops one card');
})();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
