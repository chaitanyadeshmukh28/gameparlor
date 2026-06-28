// Sealed — authoritative game engine (Love Letter mechanics, original theme).
// Pure logic; no networking. The server drives it and clients only ever receive
// a per-player view (see gameView): your own letter is the only hand revealed.
//
// A round: each courtier holds one letter. On your turn you draw a second and
// play one, resolving its intrigue. Be the last courtier holding a letter — or
// hold the highest when the courier's satchel empties — to win the round and a
// Favor. First to the Favor goal wins the soirée.
import { BaseGame } from './base-game.js';

// The eight letters, by rank. Names/flavor are original; counts & effects are
// the classic 16-card distribution.
export const CARDS = {
  1: { rank: 1, name: 'Guard',     count: 5, tag: 'Rumor',    short: 'Name a rank (2–8) you suspect a rival holds. Guess true and they are out.' },
  2: { rank: 2, name: 'Priest',    count: 2, tag: 'Glance',   short: 'Look at one rival’s hand.' },
  3: { rank: 3, name: 'Baron',     count: 2, tag: 'Compare',  short: 'Compare hands with a rival; the lower hand is out.' },
  4: { rank: 4, name: 'Handmaid',  count: 2, tag: 'Shield',   short: 'You cannot be targeted until your next turn.' },
  5: { rank: 5, name: 'Prince',    count: 2, tag: 'Discard',  short: 'Force a player (even yourself) to discard their hand and redraw.' },
  6: { rank: 6, name: 'King',      count: 1, tag: 'Trade',    short: 'Trade hands with another player.' },
  7: { rank: 7, name: 'Countess',  count: 1, tag: 'Caution',  short: 'If held beside the King or the Prince, she must be the one discarded.' },
  8: { rank: 8, name: 'Princess',  count: 1, tag: 'Devotion', short: 'Should you ever discard her, you are out.' },
};

// Favors needed to win, scaled to table size (classic Love Letter scaling).
const FAVOR_GOAL = { 2: 7, 3: 5, 4: 4, 5: 4, 6: 4 };

const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export class Game extends BaseGame {
  constructor(code) {
    super(code);
    this.minPlayers = 2;
    this.maxPlayers = 6;
    this.resetGameState();
  }

  resetGameState() {
    this.deck = [];
    this.setAside = null;      // one letter removed at round start (hidden)
    this.faceUp = [];          // in a 2-player round, three letters revealed
    this.turnIndex = 0;
    this.lastWinnerIndex = 0;  // who opens the next round
    this.roundResult = null;   // showdown reveal at round end
    this.gameWinnerId = null;
    this.favorGoal = 7;
    this.lastMove = null;      // public summary of the most recent play
    this.privateInfo = {};     // playerId -> transient secret (peek / duel result)
  }

  // ---- lobby ---------------------------------------------------------------
  addPlayer(id, name) {
    const p = super.addPlayer(id, name);
    if (p && this.phase === 'lobby') { p.tokens = 0; }
    return p;
  }

  setup() {
    this.favorGoal = FAVOR_GOAL[this.players.length] ?? 4;
    for (const p of this.players) p.tokens = 0;
    this.lastWinnerIndex = 0;
    this.gameWinnerId = null;
    this.note('The soirée begins.');
    this.startRound(this.lastWinnerIndex);
    return {};
  }

  cleanup() {
    this.resetGameState();
    for (const p of this.players) { p.tokens = 0; }
  }

  // ---- round lifecycle -----------------------------------------------------
  startRound(openerIndex) {
    this.deck = shuffle(buildDeck());
    this.setAside = this.deck.pop();
    this.faceUp = this.players.length === 2 ? [this.deck.pop(), this.deck.pop(), this.deck.pop()] : [];
    this.roundResult = null;
    this.lastMove = null;
    this.privateInfo = {};
    for (const p of this.players) {
      p.hand = [this.deck.pop()];
      p.discards = [];
      p.eliminated = false;
      p.protected = false;
    }
    // The opener may have left between rounds; fall back to the first seat.
    let idx = openerIndex;
    if (!this.players[idx]) idx = 0;
    this.phase = 'play';
    this.beginTurn(idx);
  }

  beginTurn(idx) {
    this.turnIndex = idx;
    const p = this.players[idx];
    p.protected = false;             // immunity lasts only until your own turn
    delete this.privateInfo[p.id];   // clear a stale glance/duel readout
    if (this.deck.length === 0) return this.endRound();
    p.hand.push(this.deck.pop());
    this.phase = 'play';
    this.maybeAutoPlay();
    return {};
  }

  endTurn() {
    const alive = this.players.filter((p) => !p.eliminated);
    if (alive.length <= 1) return this.endRound(alive[0]?.id ?? null);
    let n = this.turnIndex;
    for (let i = 0; i < this.players.length; i++) {
      n = (n + 1) % this.players.length;
      if (!this.players[n].eliminated) break;
    }
    if (this.deck.length === 0) return this.endRound();
    return this.beginTurn(n);
  }

  // winnerId given => last courtier standing. Otherwise compare held letters.
  endRound(winnerId = null) {
    const contenders = this.players.filter((p) => !p.eliminated);
    let winners = [];
    let reason;
    if (winnerId) {
      winners = [this.byId(winnerId)].filter(Boolean);
      reason = 'last';
    } else {
      // Highest held rank wins; ties broken by the sum of letters discarded.
      let best = -1, bestSum = -1;
      for (const p of contenders) {
        const r = p.hand[0] ?? 0;
        const sum = p.discards.reduce((a, b) => a + b, 0);
        if (r > best || (r === best && sum > bestSum)) { best = r; bestSum = sum; winners = [p]; }
        else if (r === best && sum === bestSum) winners.push(p);
      }
      reason = 'compare';
    }
    for (const w of winners) w.tokens = (w.tokens || 0) + 1;
    this.roundResult = {
      winners: winners.map((w) => w.id),
      reason,
      hands: contenders.map((p) => ({ id: p.id, card: p.hand[0] ?? null })),
    };
    if (winners.length === 1) this.note(`${winners[0].name} wins the round and a Favor.`);
    else this.note(`${winners.map((w) => w.name).join(' & ')} share the round.`);

    // remember an opener for the next round (the/a round winner)
    const wIdx = this.players.findIndex((p) => p.id === winners[0]?.id);
    if (wIdx >= 0) this.lastWinnerIndex = wIdx;

    const champ = this.players.find((p) => (p.tokens || 0) >= this.favorGoal);
    if (champ) {
      // Highest token holder takes the soirée (round winner breaks any tie).
      const top = Math.max(...this.players.map((p) => p.tokens || 0));
      const tied = winners.filter((w) => (w.tokens || 0) === top);
      this.gameWinnerId = (tied[0] || this.players.find((p) => (p.tokens || 0) === top)).id;
      this.phase = 'over';
      this.note(`${this.byId(this.gameWinnerId).name} wins the soirée!`);
    } else {
      this.phase = 'roundEnd';
    }
    return {};
  }

  nextRound(id) {
    if (this.phase !== 'roundEnd') return { error: 'No round to deal.' };
    if (id !== this.hostId) return { error: 'Only the host can deal the next round.' };
    this.startRound(this.lastWinnerIndex);
    return {};
  }

  // ---- the turn ------------------------------------------------------------
  current() { return this.players[this.turnIndex]; }

  validTargets(actor, rank) {
    const others = this.players.filter(
      (p) => p.id !== actor.id && !p.eliminated && !p.protected,
    );
    if (rank === 5) return [actor, ...others]; // the Prince may target itself
    return others;
  }

  // Force the Countess (7) when held with King (6) or Prince (5).
  countessForced(hand) {
    return hand.includes(7) && (hand.includes(6) || hand.includes(5));
  }

  handleMessage(playerId, msg) {
    if (msg.t === 'play') return this.play(playerId, msg);
    if (msg.t === 'next') return this.nextRound(playerId);
    return { error: 'Unknown action.' };
  }

  play(id, { card, target, guess }) {
    if (this.phase !== 'play') return { error: 'It is not the play phase.' };
    const actor = this.current();
    if (!actor || actor.id !== id) return { error: 'It is not your turn.' };
    const rank = Number(card);
    if (!actor.hand.includes(rank)) return { error: 'You do not hold that letter.' };
    if (this.countessForced(actor.hand) && rank !== 7)
      return { error: 'You must discard the Countess.' };
    return this.resolve(actor, rank, target, guess);
  }

  // Remove `rank` from the actor's hand into their discard pile, then run it.
  resolve(actor, rank, targetId, guess) {
    const i = actor.hand.indexOf(rank);
    actor.hand.splice(i, 1);
    actor.discards.push(rank);
    const card = CARDS[rank];

    const targets = this.validTargets(actor, rank);
    const needsTarget = [1, 2, 3, 5, 6].includes(rank) && targets.length > 0;
    let target = null;
    if (needsTarget) {
      target = targets.find((p) => p.id === targetId);
      if (!target) { actor.hand.push(rank); actor.discards.pop(); return { error: 'Choose a valid courtier.' }; }
    }
    if (rank === 1 && target) {
      const g = Number(guess);
      if (!(g >= 2 && g <= 8)) { actor.hand.push(rank); actor.discards.pop(); return { error: 'Name a rank from 2 to 8.' }; }
    }

    const noTarget = [1, 2, 3, 6].includes(rank) && targets.length === 0;
    this.lastMove = { actorId: actor.id, rank, targetId: target?.id ?? null, guess: rank === 1 ? Number(guess) : null, fizzled: noTarget };

    if (noTarget) {
      this.note(`${actor.name} plays ${card.name}, but every rival is shielded.`);
      return this.endTurn();
    }

    switch (rank) {
      case 1: { // Guard — guess a rank
        const g = Number(guess);
        this.note(`${actor.name} accuses ${target.name} of holding ${CARDS[g].name}.`);
        if (target.hand[0] === g) { this.note(`Correct — ${target.name} is undone.`); this.eliminate(target); }
        else this.note(`Wrong — ${target.name} reveals nothing.`);
        break;
      }
      case 2: { // Priest — peek
        this.privateInfo[actor.id] = { type: 'peek', targetId: target.id, card: target.hand[0] };
        this.note(`${actor.name} steals a glance at ${target.name}’s letter.`);
        break;
      }
      case 3: { // Baron — compare
        const a = actor.hand[0], b = target.hand[0];
        this.privateInfo[actor.id] = { type: 'duel', targetId: target.id, yours: a, theirs: b };
        this.privateInfo[target.id] = { type: 'duel', targetId: actor.id, yours: b, theirs: a };
        this.note(`${actor.name} duels ${target.name}.`);
        if (a > b) { this.note(`${target.name} holds the lesser heart and withdraws.`); this.eliminate(target); }
        else if (b > a) { this.note(`${actor.name} holds the lesser heart and withdraws.`); this.eliminate(actor); }
        else this.note('Their hearts are matched — both remain.');
        break;
      }
      case 4: { // Handmaid — immunity
        actor.protected = true;
        this.note(`${actor.name} plays the Handmaid and cannot be touched.`);
        break;
      }
      case 5: { // Prince — discard & redraw
        const dumped = target.hand[0];
        target.discards.push(dumped);
        target.hand = [];
        this.note(`${actor.name} makes ${actor.id === target.id ? 'themselves' : target.name} discard ${CARDS[dumped].name}.`);
        if (dumped === 8) { this.note(`${target.name} discards the Princess and is out.`); this.eliminate(target, true); }
        else {
          const fresh = this.deck.length > 0 ? this.deck.pop() : this.setAside;
          if (this.deck.length === 0) this.setAside = null;
          target.hand = [fresh];
        }
        break;
      }
      case 6: { // King — swap
        const a = actor.hand[0], b = target.hand[0];
        actor.hand = [b]; target.hand = [a];
        this.privateInfo[actor.id] = { type: 'swap', targetId: target.id, card: b };
        this.note(`${actor.name} trades letters with ${target.name}.`);
        break;
      }
      case 7: { // Countess — no effect
        this.note(`${actor.name} discards the Countess.`);
        break;
      }
      case 8: { // Princess — discarding her ends you
        this.note(`${actor.name} discards the Princess and is out.`);
        this.eliminate(actor, true);
        break;
      }
      default: break;
    }
    return this.endTurn();
  }

  // alreadyDiscarded: the eliminating card is already in discards (Princess case)
  eliminate(p, alreadyDiscarded = false) {
    if (p.eliminated) return;
    if (!alreadyDiscarded && p.hand.length) { p.discards.push(...p.hand); }
    p.hand = [];
    p.eliminated = true;
  }

  // ---- disconnected courtiers don't stall the table ------------------------
  maybeAutoPlay() {
    let guardN = 0;
    while (this.phase === 'play') {
      const actor = this.current();
      if (!actor || actor.connected) return;
      if (guardN++ > this.players.length + 2) return; // safety
      const move = this.pickAutoMove(actor);
      this.resolve(actor, move.card, move.target, move.guess);
    }
  }

  pickAutoMove(actor) {
    let rank;
    if (this.countessForced(actor.hand)) rank = 7;
    else {
      // Prefer not to self-destruct on the Princess; play the lower remaining.
      const opts = actor.hand.filter((r) => r !== 8);
      rank = (opts.length ? opts : actor.hand).sort((a, b) => a - b)[0];
    }
    const targets = this.validTargets(actor, rank);
    const t = targets.find((p) => p.id !== actor.id) || targets[0];
    return { card: rank, target: t?.id, guess: 2 + Math.floor(Math.random() * 7) };
  }

  // ---- per-player view -----------------------------------------------------
  gameView(id) {
    const showdown = this.phase === 'roundEnd' || this.phase === 'over';
    return {
      phase: this.phase,
      turn: this.players[this.turnIndex]?.id ?? null,
      deckCount: this.deck.length,
      setAsideCount: this.setAside != null ? 1 : 0,
      faceUp: this.faceUp,                 // public (only present in 2-player)
      favorGoal: this.favorGoal,
      gameWinnerId: this.gameWinnerId,
      roundResult: this.roundResult,
      lastMove: this.lastMove,
      mustPlayCountess: this.current()?.id === id && this.phase === 'play' && this.countessForced(this.byId(id)?.hand || []),
      privateInfo: this.privateInfo[id] ?? null,
      cards: CARDS,
      players: this.players.map((p) => {
        const hand = p.hand || [];
        const reveal = showdown && this.roundResult?.hands.find((h) => h.id === p.id);
        return {
          id: p.id,
          name: p.name,
          connected: p.connected,
          eliminated: !!p.eliminated,
          protected: !!p.protected,
          tokens: p.tokens || 0,
          handCount: hand.length,
          discards: p.discards || [],     // always public
          // Your own letters are visible; others only at the showdown.
          hand: p.id === id ? hand : (reveal ? [reveal.card].filter((c) => c != null) : null),
        };
      }),
    };
  }
}

function buildDeck() {
  const deck = [];
  for (const k of Object.keys(CARDS)) {
    for (let i = 0; i < CARDS[k].count; i++) deck.push(Number(k));
  }
  return deck;
}
