// Engine rules tests for Blackjack. Run with: npm test
import { Game, handValue, buildShoe } from './game.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗ ' + m); } };
const eq = (a, b, m) => ok(a === b, `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);

const card = (rank, suit = 'S') => ({ rank, suit });

// A started game with N connected players (host is '0').
function table(n = 2) {
  const g = new Game('TEST');
  for (let i = 0; i < n; i++) g.addPlayer(String(i), 'P' + i);
  g.start('0');
  return g;
}

// Force a player-phase board with explicit hands, dealer hand, bets and the
// card that the next hit/draw will pull (drawn from the end of the shoe).
function board(g, hands, dealer, { turn = 0, next = [], bets } = {}) {
  g.phase = 'player';
  g.players.forEach((p, i) => {
    g.clearRound(p);
    p.hand = hands[i].slice();
    p.bet = bets ? bets[i] : 50;
    p.hasBet = true;
    p.sitOut = false;
  });
  g.dealer = { hand: dealer.slice(), done: false };
  g.turnIndex = turn;
  g.shoe = next.slice().reverse(); // last listed is popped first
}

// ---- hand values -----------------------------------------------------------
{
  eq(handValue([card('A'), card('K')]).total, 21, 'A+K is 21');
  ok(handValue([card('A'), card('K')]).blackjack, 'A+K is a natural blackjack');
  ok(!handValue([card('A'), card('7'), card('3')]).blackjack, 'three-card 21 is not a natural');
  eq(handValue([card('10'), card('9'), card('3')]).total, 22, '10+9+3 busts at 22');
  ok(handValue([card('10'), card('9'), card('3')]).bust, 'over 21 is a bust');
  eq(handValue([card('A'), card('6')]).total, 17, 'A+6 is a soft 17');
  ok(handValue([card('A'), card('6')]).soft, 'A+6 counts the ace as 11 (soft)');
  eq(handValue([card('A'), card('6'), card('K')]).total, 17, 'A+6+K drops the ace to 1 → hard 17');
  ok(!handValue([card('A'), card('6'), card('K')]).soft, 'A+6+K is hard');
  eq(handValue([card('A'), card('A'), card('9')]).total, 21, 'two aces: one 11 one 1 (+9) = 21');
}

// ---- shoe ------------------------------------------------------------------
{
  const shoe = buildShoe(4);
  eq(shoe.length, 208, 'a 4-deck shoe has 208 cards');
  const aces = shoe.filter((c) => c.rank === 'A').length;
  eq(aces, 16, '16 aces in a 4-deck shoe');
}

// ---- lobby & chips ---------------------------------------------------------
{
  const g = table(2);
  eq(g.phase, 'betting', 'starting the game opens betting');
  ok(g.players.every((p) => p.chips === 500), 'everyone starts with 500 chips');
  eq(g.addBot('Ada'), null, 'a bot cannot be seated mid-game');
  eq(g.players.length, 2, 'no bot seated after the game has begun');
}
{
  const g = new Game('TEST');
  g.addPlayer('0', 'P0');
  const bot = g.addBot('Ada');
  ok(bot && bot.isBot && bot.chips === 500, 'a bot seated in the lobby gets a stack');
  eq(g.players.length, 2, 'the bot joins the table');
}

// ---- betting → deal --------------------------------------------------------
{
  const g = table(2);
  ok(g.placeBet('0', 5).error, 'a bet below the table minimum is rejected');
  ok(!g.placeBet('0', 50).error, 'a valid bet is accepted');
  eq(g.phase, 'betting', 'still betting while a seat has not acted');
  g.placeBet('1', 75);
  eq(g.phase, 'player', 'the deal begins once every seat has bet');
  eq(g.players[0].hand.length, 2, 'each player is dealt two cards');
  eq(g.dealer.hand.length, 2, 'the dealer holds two cards');
  ok(g.current(), 'a player is on turn');
}
{
  const g = table(1);
  const p = g.players[0];
  g.placeBet('0', 1000); // more than the stack
  eq(p.bet, 500, 'a bet is clamped to the available chips');
}

// ---- player actions --------------------------------------------------------
{
  const g = table(1);
  board(g, [[card('10'), card('6')]], [card('9'), card('7')], { next: [card('K')] });
  g.hit('0');
  ok(g.players[0].busted, 'hitting 10+6 into a King busts at 26');
  ok(g.players[0].done, 'a bust ends the seat');
}
{
  // 5+6+10 = 21 → stands, not bust
  const g = table(1);
  board(g, [[card('5'), card('6')]], [card('9'), card('7')], { next: [card('10')] });
  g.hit('0');
  ok(!g.players[0].busted && g.players[0].done, 'hitting to exactly 21 auto-stands');
}
{
  const g = table(1);
  board(g, [[card('10'), card('8')]], [card('9'), card('7')]);
  g.stand('0');
  ok(g.players[0].stood && g.players[0].done, 'standing settles the seat');
  ok(g.phase === 'roundEnd' || g.phase === 'over', 'the dealer plays once the last seat stands');
}
{
  const g = table(1);
  const p = g.players[0];
  board(g, [[card('5'), card('6')]], [card('10'), card('7')], { next: [card('9')] });
  g.double('0');
  eq(p.bet, 100, 'doubling matches the original bet');
  ok(p.doubled && p.done, 'doubling takes one card then stands');
  eq(p.hand.length, 3, 'a doubled hand has exactly three cards');
}
{
  const g = table(1);
  const p = g.players[0];
  p.chips = 60;
  board(g, [[card('5'), card('6')]], [card('10'), card('7')], { bets: [50] });
  ok(g.double('0').error, 'cannot double without chips to cover it');
}

// ---- dealer draws to 17 ----------------------------------------------------
{
  const g = table(1);
  // Dealer 9+6 = 15, must draw; give a 10 → 25 bust, then settle.
  board(g, [[card('10'), card('9')]], [card('9'), card('6')], { next: [card('10')] });
  g.stand('0');
  ok(g.roundResult.dealer.bust, 'the dealer draws on 15 and busts');
  eq(g.players[0].result, 'win', 'a standing player beats a busted dealer');
}
{
  const g = table(1);
  // Dealer already at 18 (stands), player 20 wins.
  board(g, [[card('10'), card('10')]], [card('10'), card('8')]);
  g.stand('0');
  eq(g.dealer.hand.length, 2, 'the dealer stands on 18 and draws nothing');
  eq(g.players[0].result, 'win', '20 beats 18');
}

// ---- settlement outcomes ---------------------------------------------------
function settleCase(playerHand, dealerHand, bet = 100) {
  const g = table(1);
  const p = g.players[0];
  p.chips = 500;
  g.phase = 'player';
  g.clearRound(p);
  p.hand = playerHand; p.bet = bet; p.hasBet = true;
  p.stood = true; p.done = true;
  g.dealer = { hand: dealerHand, done: false };
  g.turnIndex = -1;
  g.dealerPlay();
  return { p, g };
}
{
  const { p } = settleCase([card('A'), card('K')], [card('10'), card('7')]);
  eq(p.result, 'blackjack', 'a natural blackjack is recognized');
  eq(p.delta, 150, 'a natural blackjack pays 3:2');
}
{
  const { p } = settleCase([card('A'), card('K')], [card('A'), card('K')]);
  eq(p.result, 'push', 'natural vs natural is a push');
  eq(p.delta, 0, 'a push returns the bet');
}
{
  const { p } = settleCase([card('10'), card('9')], [card('10'), card('9')]);
  eq(p.result, 'push', 'equal totals push');
}
{
  const { p } = settleCase([card('10'), card('9'), card('5')], [card('10'), card('8')]);
  eq(p.result, 'bust', 'a busted player loses');
  eq(p.delta, -100, 'a bust forfeits the bet');
}
{
  const { p } = settleCase([card('10'), card('9')], [card('A'), card('K')]);
  eq(p.result, 'lose', 'a non-natural 19 loses to a dealer natural');
}

// ---- chips accrue over a round & game end ----------------------------------
{
  const { p, g } = settleCase([card('A'), card('K')], [card('10'), card('7')]);
  eq(p.chips, 650, 'winnings are added to the stack');
  eq(g.phase, 'roundEnd', 'a win short of the goal pauses at round end');
  ok(g.next('1').error, 'only the host deals the next round');
  ok(!g.next('0').error, 'the host deals the next round');
  eq(g.phase, 'betting', 'the next round opens betting again');
}
{
  const g = table(1);
  const p = g.players[0];
  p.chips = 1450;
  g.phase = 'player';
  g.clearRound(p);
  p.hand = [card('A'), card('K')]; p.bet = 100; p.hasBet = true; p.stood = true; p.done = true;
  g.dealer = { hand: [card('10'), card('7')], done: false };
  g.turnIndex = -1;
  g.dealerPlay();
  eq(g.phase, 'over', 'reaching the chip goal ends the night');
  eq(g.gameWinnerId, p.id, 'the player who reached the goal wins');
}
{
  // Two players; one busts to zero chips → the other is last standing.
  const g = table(2);
  g.players[0].chips = 0;
  g.players[1].chips = 300;
  g.startBetting();
  ok(g.players[0].out, 'a broke player is marked out at the next betting');
  // Force an end-check with only one solvent player.
  g.checkGameEnd();
  eq(g.phase, 'over', 'a single solvent player ends the game');
  eq(g.gameWinnerId, g.players[1].id, 'the last player with chips wins');
}

// ---- bot decisions ---------------------------------------------------------
{
  const g = table(1);
  const view = g.viewFor('0');
  const bet = g.botDecide({ ...view, you: '0' });
  ok(bet && bet.t === 'bet' && bet.amount >= g.config.minBet, 'a bot places a legal bet');
}
{
  const g = table(1);
  board(g, [[card('10'), card('6')]], [card('9'), card('7')], { turn: 0 });
  const view = g.viewFor('0');
  const move = g.botDecide(view);
  ok(move && (move.t === 'hit' || move.t === 'stand'), 'a bot acts on its turn');
  // hard 16 vs dealer up 9 → basic strategy hits
  eq(move.t, 'hit', 'a bot hits hard 16 against a strong dealer up-card');
}
{
  const g = table(1);
  board(g, [[card('10'), card('9')]], [card('9'), card('7')], { turn: 0 });
  const move = g.botDecide(g.viewFor('0'));
  eq(move.t, 'stand', 'a bot stands on 19');
}

// ---- dealer stands on 17 (casino rule) -------------------------------------
{
  const g = table(1);
  board(g, [[card('10'), card('9')]], [card('10'), card('7')]); // dealer hard 17
  g.stand('0');
  eq(g.dealer.hand.length, 2, 'the dealer stands on a hard 17 and draws nothing');
  eq(g.roundResult.dealer.total, 17, 'the dealer total is 17');
}
{
  const g = table(1);
  board(g, [[card('10'), card('9')]], [card('A'), card('6')]); // dealer soft 17
  g.stand('0');
  eq(g.dealer.hand.length, 2, 'the dealer stands on a soft 17 too');
  eq(g.roundResult.dealer.total, 17, 'the soft 17 stands at 17');
}

// ---- host-configurable turn clock ------------------------------------------
{
  const g = new Game('TEST');
  g.addPlayer('0', 'P0');
  g.addPlayer('1', 'P1');
  eq(g.config.turnSeconds, 20, 'the default clock is 20s');
  ok(g.setConfig('1', { turnSeconds: 30 }).error, 'only the host can change settings');
  ok(!g.setConfig('0', { turnSeconds: 30 }).error, 'the host sets the clock');
  eq(g.config.turnSeconds, 30, 'the clock updates to 30s');
  g.setConfig('0', { turnSeconds: 999 });
  eq(g.config.turnSeconds, 30, 'an invalid clock value is ignored');
  g.setConfig('0', { turnSeconds: 0 });
  eq(g.config.turnSeconds, 0, 'the clock can be turned off');
  g.start('0');
  ok(g.setConfig('0', { turnSeconds: 20 }).error, 'settings lock once the game starts');
}
{
  const g = table(2);
  ok(g.turnDeadline != null, 'a clock is armed when betting opens');
  const view = g.viewFor('0');
  ok(view.turnEndsInMs != null && view.turnEndsInMs > 0, 'the view exposes remaining time');
  eq(view.turnSeconds, 20, 'the view carries the configured seconds');
}
{
  const g = new Game('TEST');
  g.addPlayer('0', 'P0');
  g.setConfig('0', { turnSeconds: 0 });
  g.start('0');
  eq(g.turnDeadline, null, 'no clock is armed when the timer is off');
  eq(g.viewFor('0').turnEndsInMs, null, 'the view reports no clock');
}

// ---- timeout auto-resolves ------------------------------------------------
{
  // Betting timeout: a player who never bets is folded, the table still deals.
  const g = table(2);
  g.placeBet('0', 50);                 // P0 bets, P1 stalls
  g.turnDeadline = Date.now() - 1;     // force the clock expired
  g.timeout();
  ok(g.players[1].sitOut, 'a player who runs out the betting clock folds the hand');
  eq(g.phase, 'player', 'the table deals once the clock resolves the stragglers');
}
{
  // Player timeout: the active player is stood.
  const g = table(1);
  board(g, [[card('5'), card('6')]], [card('10'), card('8')]);
  g.armDeadline();
  g.turnDeadline = Date.now() - 1;
  g.timeout();
  ok(g.players[0].stood || g.players[0].done, 'running out the turn clock stands the player');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
