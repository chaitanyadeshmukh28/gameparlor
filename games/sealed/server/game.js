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

  // Seat an AI player. (Overrides BaseGame.addBot, whose id generator relies on
  // an import this variant of base-game.js doesn't carry.) Bots are ordinary
  // player entries flagged isBot:true and are dealt in like anyone else.
  addBot(name) {
    if (this.phase !== 'lobby') return null;
    if (this.players.length >= this.maxPlayers) return null;
    if (this.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) return null;
    const p = { id: 'bot-' + Math.random().toString(36).slice(2, 10), name, connected: true, isBot: true, tokens: 0 };
    this.players.push(p);
    if (!this.hostId) this.hostId = p.id;
    this.note(`${name} joined.`);
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

    // A plain, authoritative sentence explaining WHY the round ended this way,
    // plus the structured compare data the client needs to reveal the showdown.
    const { reasonText, compare } = this.describeRoundEnd(reason, winners, contenders);

    this.roundResult = {
      winners: winners.map((w) => w.id),
      reason,
      reasonText,
      compare,                                 // present only when the satchel emptied
      // Surviving hands, revealed face-up at the showdown.
      hands: contenders.map((p) => ({ id: p.id, card: p.hand[0] ?? null })),
      // Who was knocked out, and the letter they were caught holding (their last
      // discard) — so players can see who fell to what.
      fallen: this.players
        .filter((p) => p.eliminated)
        .map((p) => ({ id: p.id, card: p.discards.length ? p.discards[p.discards.length - 1] : null })),
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

  // Author a single, plain sentence for the round result (shown verbatim to all
  // players) and, for an emptied-satchel comparison, the cards that decided it.
  describeRoundEnd(reason, winners, contenders) {
    const cardName = (r) => (CARDS[r] ? CARDS[r].name : 'letter');
    const list = (arr) => arr.map((p) => p.name).join(' and ');

    if (reason === 'last') {
      if (!winners.length) return { reasonText: 'Every courtier was knocked out — the round closes with no victor.', compare: null };
      return { reasonText: `${winners[0].name} was the last suitor standing.`, compare: null };
    }

    // reason === 'compare': the courier's satchel ran dry; highest letter wins.
    const win = winners[0];
    const winCard = win ? (win.hand[0] ?? 0) : 0;
    // The strongest contender who did not win — the letter the winner beat.
    const rival = [...contenders]
      .filter((p) => !winners.includes(p))
      .sort((a, b) => (b.hand[0] ?? 0) - (a.hand[0] ?? 0))[0] || null;
    const rivalCard = rival ? (rival.hand[0] ?? 0) : 0;
    const tiebreak = rival != null && winCard === rivalCard;

    let reasonText;
    if (winners.length > 1) {
      reasonText = `The courier’s satchel ran dry — ${list(winners)} both held the ${cardName(winCard)} (${winCard}) and share the round.`;
    } else if (!rival) {
      reasonText = `The courier’s satchel ran dry — ${win?.name ?? 'no one'} held the only letter left.`;
    } else if (tiebreak) {
      reasonText = `The courier’s satchel ran dry — ${win.name} and ${rival.name} both held the ${cardName(winCard)} (${winCard}), but ${win.name} had courted more and takes it.`;
    } else {
      reasonText = `The courier’s satchel ran dry — ${win.name} held the higher letter (${cardName(winCard)} ${winCard} beats ${cardName(rivalCard)} ${rivalCard}).`;
    }

    return {
      reasonText,
      compare: {
        winnerId: win?.id ?? null,
        winnerCard: winCard || null,
        rivalId: rival?.id ?? null,
        rivalCard: rivalCard || null,
        tiebreak,
      },
    };
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

  // ---- AI player -----------------------------------------------------------
  // Heuristic bot. Decides purely from its own redacted view (the same seam an
  // LLM could replace). Returns the next message to send (identical to a human
  // client's {t:'play'|'next'}), or null when it owes no move right now.
  botDecide(view, rng = Math.random) {
    const you = view.you;
    const me = view.players.find((p) => p.id === you);
    if (!me) return null;

    // Between rounds: only the host may deal, so a bot host advances the game.
    if (view.phase === 'roundEnd') return view.isHost ? { t: 'next' } : null;

    // Otherwise a bot only ever owes a move on its own play turn.
    if (view.phase !== 'play' || view.turn !== you || me.eliminated) return null;

    const hand = (me.hand || []).slice();
    if (hand.length === 0) return null;

    // Rivals we may legally target (alive and unshielded).
    const others = view.players.filter((p) => p.id !== you && !p.eliminated && !p.protected);

    // ---- which letter to play ----------------------------------------------
    // The Countess (7) is forced beside the King (6) or Prince (5).
    const forcedCountess =
      view.mustPlayCountess || (hand.includes(7) && (hand.includes(6) || hand.includes(5)));
    const rank = forcedCountess ? 7 : this.pickBotCard(hand, others.length > 0);

    // ---- target + guess -----------------------------------------------------
    const targets = rank === 5 ? [me, ...others] : others;
    const needsTarget = [1, 2, 3, 5, 6].includes(rank) && targets.length > 0;
    let target = null;
    let guess = null;
    if (needsTarget) {
      if (rank === 5) {
        // The Prince makes its target discard-and-redraw; never aim it at
        // yourself (you'd bin the letter you kept — the Princess would end you).
        const t = others.length ? this.pickBotTarget(others, rng) : me;
        target = t.id;
      } else {
        target = this.pickBotTarget(targets, rng).id;
      }
      if (rank === 1) guess = this.pickBotGuess(view, rng);
    }

    return { t: 'play', card: rank, target: needsTarget ? target : null, guess: rank === 1 ? guess : null };
  }

  // Choose which of the two held letters to play. Keep the Princess (8) at all
  // costs; otherwise play the lower letter and hold the higher — the classic
  // Love Letter default — while never stranding a Prince you cannot aim.
  pickBotCard(hand, hasRival) {
    if (hand.length === 1) return hand[0];
    const [a, b] = hand;
    if (a === 8) return b;                 // never discard the Princess
    if (b === 8) return a;
    const low = Math.min(a, b);
    const high = Math.max(a, b);
    // A Prince with no legal rival would force a self-discard; play the other.
    if (low === 5 && !hasRival) return high;
    return low;
  }

  // Threaten the front-runner (most Favors); break ties at random.
  pickBotTarget(list, rng = Math.random) {
    const top = Math.max(...list.map((p) => p.tokens || 0));
    const leaders = list.filter((p) => (p.tokens || 0) === top);
    return leaders[Math.floor(rng() * leaders.length)] || list[0];
  }

  // Guard guess: name the non-Guard rank with the most copies still unseen —
  // i.e. the letter a rival most likely holds (never the Guard itself).
  pickBotGuess(view, rng = Math.random) {
    const seen = {};
    for (const p of view.players) for (const d of (p.discards || [])) seen[d] = (seen[d] || 0) + 1;
    const me = view.players.find((p) => p.id === view.you);
    for (const c of (me?.hand || [])) seen[c] = (seen[c] || 0) + 1;
    let best = [], bestRem = -Infinity;
    for (let r = 2; r <= 8; r++) {
      const total = (view.cards?.[r]?.count) ?? CARDS[r]?.count ?? 0;
      const rem = total - (seen[r] || 0);
      if (rem > bestRem) { bestRem = rem; best = [r]; }
      else if (rem === bestRem) best.push(r);
    }
    return best[Math.floor(rng() * best.length)] || 2;
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
          isBot: !!p.isBot,
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
