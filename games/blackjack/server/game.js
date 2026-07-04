// Blackjack — authoritative multiplayer engine (original theme: "The Vingt").
// Pure rules logic; no networking. The server drives it and clients only ever
// receive a per-player view (see gameView) — the dealer's hole card is the one
// secret and is revealed only when the dealer plays.
//
// A round: everyone antes a bet from their chips, receives two cards, then in
// seat order chooses to Hit / Stand / Double. When all players have settled the
// dealer reveals the hole and draws to 17. Hands are compared, chips paid out
// (a natural blackjack pays 3:2). First player to reach the chip Goal — or the
// last player still holding chips — wins the night.
import { BaseGame } from './base-game.js';

const SUITS = ['S', 'H', 'D', 'C'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const START_CHIPS = 500;   // everyone's opening stake
const MIN_BET = 10;        // table minimum
const GOAL = 1500;         // reach this to win the night (3× the buy-in)
const DECKS = 4;           // cards drawn from a 4-deck shoe
const RESHUFFLE_AT = 30;   // reshuffle the shoe when it dips below this
const DEALER_STANDS = 17;  // dealer hits until reaching this (stands on all 17)

const shuffle = (arr, rng = Math.random) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Best value of a hand: aces count 11 until that would bust, then 1. `soft`
// means an ace is still counted as 11 (the hand can absorb another card safely).
export function handValue(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 'A') { aces++; total += 11; }
    else if (c.rank === 'K' || c.rank === 'Q' || c.rank === 'J') total += 10;
    else total += Number(c.rank);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return {
    total,
    soft: aces > 0 && total <= 21,
    bust: total > 21,
    blackjack: cards.length === 2 && total === 21,
  };
}

export function buildShoe(decks = DECKS, rng = Math.random) {
  const shoe = [];
  for (let d = 0; d < decks; d++)
    for (const suit of SUITS)
      for (const rank of RANKS) shoe.push({ rank, suit });
  return shuffle(shoe, rng);
}

export class Game extends BaseGame {
  constructor(code) {
    super(code);
    this.minPlayers = 1;      // a solo player vs the house is a valid table
    this.maxPlayers = 6;
    this.config = { minBet: MIN_BET, goal: GOAL, startChips: START_CHIPS };
    this.resetGameState();
  }

  resetGameState() {
    this.shoe = [];
    this.dealer = { hand: [], done: false };
    this.turnIndex = 0;
    this.roundResult = null;   // payout summary shown at round end
    this.gameWinnerId = null;
    this.roundNo = 0;
  }

  // ---- lobby ---------------------------------------------------------------
  addPlayer(id, name) {
    const p = super.addPlayer(id, name);
    if (p && this.phase === 'lobby') this.initPlayer(p);
    return p;
  }

  addBot(name) {
    if (this.phase !== 'lobby') return null;
    if (this.players.length >= this.maxPlayers) return null;
    if (this.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) return null;
    const p = { id: 'bot-' + Math.random().toString(36).slice(2, 10), name, connected: true, isBot: true };
    this.initPlayer(p);
    this.players.push(p);
    if (!this.hostId) this.hostId = p.id;
    this.note(`${name} took a seat.`);
    return p;
  }

  initPlayer(p) {
    p.chips = START_CHIPS;
    p.out = false;
    this.clearRound(p);
  }

  clearRound(p) {
    p.bet = 0;
    p.hand = [];
    p.hasBet = false;
    p.sitOut = false;
    p.stood = false;
    p.busted = false;
    p.doubled = false;
    p.done = false;
    p.result = null;   // 'blackjack' | 'win' | 'push' | 'lose' | 'bust'
    p.delta = 0;
  }

  // ---- setup / lifecycle ---------------------------------------------------
  setup() {
    this.shoe = buildShoe();
    this.roundNo = 0;
    this.gameWinnerId = null;
    for (const p of this.players) { p.chips = START_CHIPS; p.out = false; }
    this.note('The night begins. Place your bets.');
    this.startBetting();
    return {};
  }

  cleanup() { this.resetGameState(); }

  // Pull one card, reshuffling a fresh shoe if we ever run dry.
  draw() {
    if (this.shoe.length === 0) this.shoe = buildShoe();
    return this.shoe.pop();
  }

  startBetting() {
    this.roundNo++;
    this.roundResult = null;
    this.dealer = { hand: [], done: false };
    for (const p of this.players) {
      this.clearRound(p);
      if (p.chips <= 0) { p.out = true; p.sitOut = true; p.hasBet = true; }
    }
    this.phase = 'betting';
  }

  // ---- betting -------------------------------------------------------------
  placeBet(id, amount) {
    if (this.phase !== 'betting') return { error: 'Bets are closed.' };
    const p = this.byId(id);
    if (!p) return { error: 'Unknown player.' };
    if (p.out) return { error: 'You are out of chips.' };
    if (p.hasBet) return { error: 'Your bet is already in.' };
    let bet = Math.floor(Number(amount));
    if (!Number.isFinite(bet)) return { error: 'Enter a valid bet.' };
    if (bet < MIN_BET && p.chips >= MIN_BET) return { error: `The table minimum is ${MIN_BET}.` };
    bet = Math.max(Math.min(bet, p.chips), Math.min(MIN_BET, p.chips));
    p.bet = bet;
    p.hasBet = true;
    this.maybeDeal();
    return {};
  }

  // A player can fold before the deal to sit the round out (keeps their chips).
  sitOut(id) {
    if (this.phase !== 'betting') return { error: 'Bets are closed.' };
    const p = this.byId(id);
    if (!p || p.out) return { error: 'Cannot sit out.' };
    p.sitOut = true;
    p.hasBet = true;
    p.bet = 0;
    this.maybeDeal();
    return {};
  }

  // Deal once every active seat has either bet or sat out. Disconnected humans
  // are auto-sat-out so one dropped player never stalls the table.
  maybeDeal() {
    for (const p of this.players) {
      if (p.out || p.hasBet) continue;
      if (!p.connected && !p.isBot) { p.sitOut = true; p.hasBet = true; p.bet = 0; }
    }
    const pending = this.players.filter((p) => !p.out && !p.hasBet);
    if (pending.length > 0) return;                 // still waiting on someone
    const playing = this.players.filter((p) => p.hasBet && !p.sitOut && p.bet > 0);
    if (playing.length === 0) return;               // nobody anted; keep waiting
    this.deal();
  }

  deal() {
    if (this.shoe.length < RESHUFFLE_AT) this.shoe = buildShoe();
    const seats = this.players.filter((p) => p.hasBet && !p.sitOut && p.bet > 0);
    this.dealer = { hand: [], done: false };
    // Two rounds of dealing: a card to each seat, then the dealer, twice over.
    for (let r = 0; r < 2; r++) {
      for (const p of seats) p.hand.push(this.draw());
      this.dealer.hand.push(this.draw());
    }
    for (const p of seats) {
      const v = handValue(p.hand);
      if (v.blackjack) { p.done = true; p.stood = true; } // naturals stand pat
    }
    this.phase = 'player';
    this.turnIndex = -1;
    this.advanceTurn();
  }

  // ---- player turns --------------------------------------------------------
  seats() { return this.players.filter((p) => p.hasBet && !p.sitOut && p.bet > 0); }
  current() { return this.turnIndex >= 0 ? this.players[this.turnIndex] : null; }

  // Move to the next seat that still owes an action. Auto-stands disconnected
  // humans (bots are driven separately via botDecide). When no seat remains,
  // the dealer plays.
  advanceTurn() {
    let idx = this.turnIndex;
    for (let scan = 0; scan < this.players.length; scan++) {
      idx = (idx + 1) % this.players.length;
      const p = this.players[idx];
      if (!p || !p.hasBet || p.sitOut || p.bet <= 0 || p.done) continue;
      this.turnIndex = idx;
      if (!p.connected && !p.isBot) { this.stand(p.id); return; } // dropped → stand
      return;
    }
    this.turnIndex = -1;
    this.dealerPlay();
  }

  hit(id) {
    const p = this.current();
    if (!p || p.id !== id) return { error: 'It is not your turn.' };
    if (this.phase !== 'player') return { error: 'You cannot hit now.' };
    p.hand.push(this.draw());
    const v = handValue(p.hand);
    if (v.bust) { p.busted = true; p.done = true; this.advanceTurn(); }
    else if (v.total === 21) { p.stood = true; p.done = true; this.advanceTurn(); } // 21 stands
    return {};
  }

  stand(id) {
    const p = this.current();
    if (!p || p.id !== id) return { error: 'It is not your turn.' };
    if (this.phase !== 'player') return { error: 'You cannot stand now.' };
    p.stood = true;
    p.done = true;
    this.advanceTurn();
    return {};
  }

  // Double: match your bet, take exactly one card, then stand.
  double(id) {
    const p = this.current();
    if (!p || p.id !== id) return { error: 'It is not your turn.' };
    if (this.phase !== 'player') return { error: 'You cannot double now.' };
    if (p.hand.length !== 2) return { error: 'You can only double on your first two cards.' };
    if (p.chips < p.bet * 2) return { error: 'Not enough chips to double.' };
    p.bet *= 2;
    p.doubled = true;
    p.hand.push(this.draw());
    const v = handValue(p.hand);
    if (v.bust) p.busted = true;
    p.stood = true;
    p.done = true;
    this.advanceTurn();
    return {};
  }

  // ---- dealer + settlement -------------------------------------------------
  dealerPlay() {
    this.phase = 'dealer';
    const anyLive = this.seats().some((p) => !p.busted);
    if (anyLive) {
      // Draw until reaching the stand value (stands on all 17, hard or soft).
      let guard = 0;
      while (handValue(this.dealer.hand).total < DEALER_STANDS && guard++ < 25)
        this.dealer.hand.push(this.draw());
    }
    this.dealer.done = true;
    this.settle();
  }

  settle() {
    const dv = handValue(this.dealer.hand);
    const dealerBJ = dv.blackjack;
    const rows = [];
    for (const p of this.seats()) {
      const pv = handValue(p.hand);
      let result, delta;
      if (pv.bust) { result = 'bust'; delta = -p.bet; }
      else if (pv.blackjack && !dealerBJ) { result = 'blackjack'; delta = Math.round(p.bet * 1.5); }
      else if (pv.blackjack && dealerBJ) { result = 'push'; delta = 0; }
      else if (dealerBJ) { result = 'lose'; delta = -p.bet; }
      else if (dv.bust) { result = 'win'; delta = p.bet; }
      else if (pv.total > dv.total) { result = 'win'; delta = p.bet; }
      else if (pv.total < dv.total) { result = 'lose'; delta = -p.bet; }
      else { result = 'push'; delta = 0; }
      p.result = result;
      p.delta = delta;
      p.chips += delta;
      rows.push({ id: p.id, name: p.name, result, delta, total: pv.total, bet: p.bet });
    }

    this.roundResult = {
      round: this.roundNo,
      dealer: { total: dv.total, bust: dv.bust, blackjack: dealerBJ },
      rows,
      text: this.describeRound(dv, dealerBJ, rows),
    };
    this.phase = 'roundEnd';
    this.checkGameEnd();
  }

  describeRound(dv, dealerBJ, rows) {
    const dealerLine = dealerBJ
      ? 'The house turns a natural blackjack.'
      : dv.bust
        ? `The house busts at ${dv.total}.`
        : `The house stands on ${dv.total}.`;
    const winners = rows.filter((r) => r.delta > 0);
    if (!rows.length) return dealerLine;
    if (!winners.length) return `${dealerLine} The house takes the table.`;
    const names = winners.map((r) => r.name).join(', ');
    return `${dealerLine} ${names} ${winners.length === 1 ? 'wins' : 'win'} the hand.`;
  }

  checkGameEnd() {
    const solvent = this.players.filter((p) => p.chips > 0);
    const champs = this.players.filter((p) => p.chips >= GOAL);
    if (champs.length) {
      champs.sort((a, b) => b.chips - a.chips);
      this.gameWinnerId = champs[0].id;
      this.phase = 'over';
      this.note(`${champs[0].name} reaches ${champs[0].chips} chips and wins the night!`);
    } else if (this.players.length >= 2 && solvent.length === 1) {
      this.gameWinnerId = solvent[0].id;
      this.phase = 'over';
      this.note(`${solvent[0].name} is the last player with chips — winner!`);
    } else if (solvent.length === 0) {
      this.gameWinnerId = null;
      this.phase = 'over';
      this.note('The house cleaned out the table.');
    }
  }

  next(id) {
    if (this.phase !== 'roundEnd') return { error: 'No round to deal.' };
    if (id !== this.hostId) return { error: 'Only the host can deal the next round.' };
    this.startBetting();
    return {};
  }

  // ---- message router ------------------------------------------------------
  handleMessage(playerId, msg) {
    switch (msg.t) {
      case 'bet':    return this.placeBet(playerId, msg.amount);
      case 'sitout': return this.sitOut(playerId);
      case 'hit':    return this.hit(playerId);
      case 'stand':  return this.stand(playerId);
      case 'double': return this.double(playerId);
      case 'next':   return this.next(playerId);
      default:       return { error: 'Unknown action.' };
    }
  }

  // ---- AI player -----------------------------------------------------------
  // Heuristic bot. Decides purely from its own redacted view (the same seam an
  // LLM could replace). Returns the next message to send (identical to a human
  // client's message) or null when it owes no move right now.
  botDecide(view, rng = Math.random) {
    const you = view.you;
    const me = view.players.find((p) => p.id === you);
    if (!me || me.out) return null;

    if (view.phase === 'betting') {
      if (me.hasBet) return null;
      // Wager roughly an eighth of the stack, to the nearest 5, within limits.
      let bet = Math.round((me.chips * 0.12) / 5) * 5;
      bet += (Math.floor(rng() * 3) - 1) * 5;       // ±5 jitter
      bet = Math.max(view.config.minBet, Math.min(bet, me.chips));
      return { t: 'bet', amount: bet };
    }

    if (view.phase === 'player') {
      if (view.turn !== you || me.done) return null;
      const v = me.value || handValue(me.hand);
      const up = view.dealer.upValue || 0;          // dealer's exposed card value
      // Double on a hard 10 or 11 against a weak-ish dealer, chips permitting.
      if (me.hand.length === 2 && !v.soft && (v.total === 10 || v.total === 11)
          && up <= 9 && me.chips >= me.bet * 2) return { t: 'double' };
      // Basic strategy, simplified: soft 17 or less hits; hard <17 hits vs a
      // strong dealer up-card, otherwise stand on 12+ against a bust-prone card.
      if (v.soft) return v.total <= 17 ? { t: 'hit' } : { t: 'stand' };
      if (v.total >= 17) return { t: 'stand' };
      if (v.total <= 11) return { t: 'hit' };
      // 12–16: stand if the dealer shows a bust card (2–6), else hit.
      return up >= 2 && up <= 6 ? { t: 'stand' } : { t: 'hit' };
    }

    if (view.phase === 'roundEnd') return view.isHost ? { t: 'next' } : null;
    return null;
  }

  // ---- per-player view -----------------------------------------------------
  gameView(id) {
    const reveal = this.phase === 'dealer' || this.phase === 'roundEnd' || this.phase === 'over';
    const dv = handValue(this.dealer.hand);
    const upCard = this.dealer.hand[0] || null;
    return {
      phase: this.phase,
      config: this.config,
      roundNo: this.roundNo,
      shoeCount: this.shoe.length,
      turn: this.current()?.id ?? null,
      gameWinnerId: this.gameWinnerId,
      roundResult: this.roundResult,
      dealer: {
        // The hole card stays face-down until the dealer plays.
        hand: reveal
          ? this.dealer.hand
          : this.dealer.hand.map((c, i) => (i === 0 ? c : null)),
        upValue: upCard ? handValue([upCard]).total : 0,
        value: reveal ? { total: dv.total, soft: dv.soft, bust: dv.bust, blackjack: dv.blackjack } : null,
        done: this.dealer.done,
      },
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        connected: p.connected,
        isBot: !!p.isBot,
        chips: p.chips,
        bet: p.bet,
        out: !!p.out,
        sitOut: !!p.sitOut,
        hasBet: !!p.hasBet,
        stood: !!p.stood,
        busted: !!p.busted,
        doubled: !!p.doubled,
        done: !!p.done,
        result: p.result,
        delta: p.delta,
        // Blackjack hands are open information — everyone sees every hand.
        hand: p.hand,
        value: p.hand.length ? handValue(p.hand) : null,
        isTurn: this.current()?.id === p.id,
      })),
    };
  }
}
