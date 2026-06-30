// Coup — authoritative game engine.
// Pure logic: no networking here. The server drives it; clients only ever
// receive a per-player view (see CoupGame.viewFor).

export const CHARACTERS = ['duke', 'assassin', 'captain', 'ambassador', 'contessa'];

// Static metadata used for validation + the client UI.
export const ACTIONS = {
  income:      { coins: +1, needsTarget: false, claim: null,         challengeable: false, blockable: false },
  foreign_aid: { coins: +2, needsTarget: false, claim: null,         challengeable: false, blockable: true,  blockChars: ['duke'] },
  coup:        { coins: -7, needsTarget: true,  claim: null,         challengeable: false, blockable: false },
  tax:         { coins: +3, needsTarget: false, claim: 'duke',       challengeable: true,  blockable: false },
  assassinate: { coins: -3, needsTarget: true,  claim: 'assassin',   challengeable: true,  blockable: true,  blockChars: ['contessa'] },
  steal:       { coins: 0,  needsTarget: true,  claim: 'captain',    challengeable: true,  blockable: true,  blockChars: ['captain', 'ambassador'] },
  exchange:    { coins: 0,  needsTarget: false, claim: 'ambassador', challengeable: true,  blockable: false },
};

const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export class CoupGame {
  constructor(code) {
    this.code = code;
    this.phase = 'lobby';            // lobby | turn | response | lose | exchange | over
    this.players = [];               // {id,name,coins,influence:[{char,revealed}],connected,eliminated}
    this.hostId = null;
    this.deck = [];
    this.turnIndex = 0;
    this.pending = null;             // current action context
    this.pendingLoss = null;        // {playerId, then}
    this.pendingExchange = null;     // {playerId, cards:[chars], keep:int}
    this.winner = null;
    this.log = [];
    this.seq = 0;                    // increments on every state change
  }

  // ---- lobby ---------------------------------------------------------------
  addPlayer(id, name) {
    if (this.phase !== 'lobby') {
      // allow reconnect by name
      const existing = this.players.find((p) => p.name === name);
      if (existing) { existing.id = id; existing.connected = true; return existing; }
      return null;
    }
    if (this.players.length >= 6) return null;
    if (this.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) return null;
    const p = { id, name, coins: 0, influence: [], connected: true, eliminated: false };
    this.players.push(p);
    if (!this.hostId) this.hostId = id;
    this.note(`${name} joined the table.`);
    return p;
  }

  removePlayer(id) {
    const p = this.byId(id);
    if (!p) return;
    if (this.phase === 'lobby') {
      this.players = this.players.filter((x) => x.id !== id);
      if (this.hostId === id) this.hostId = this.players[0]?.id ?? null;
    } else {
      p.connected = false; // keep their cards; they can rejoin by name
    }
  }

  start(id) {
    if (id !== this.hostId) return { error: 'Only the host can start the game.' };
    if (this.phase !== 'lobby') return { error: 'The game has already started.' };
    if (this.players.length < 2) return { error: 'Need at least 2 players.' };

    this.deck = shuffle(CHARACTERS.flatMap((c) => [c, c, c]));
    for (const p of this.players) {
      p.coins = 2;
      p.eliminated = false;
      p.influence = [{ char: this.deck.pop(), revealed: false }, { char: this.deck.pop(), revealed: false }];
    }
    this.turnIndex = 0;
    this.phase = 'turn';
    this.pending = this.pendingLoss = this.pendingExchange = null;
    this.winner = null;
    this.note(`The game begins. ${this.current().name} acts first.`);
    return {};
  }

  resetToLobby(id) {
    if (id !== this.hostId) return { error: 'Only the host can return to the lobby.' };
    this.phase = 'lobby';
    this.pending = this.pendingLoss = this.pendingExchange = null;
    this.winner = null;
    this.deck = [];
    this.turnIndex = 0;
    this.players = this.players.filter((p) => p.connected);
    for (const p of this.players) { p.coins = 0; p.influence = []; p.eliminated = false; }
    this.note('Back to the lobby. Ready for another round.');
    return {};
  }

  // ---- helpers -------------------------------------------------------------
  byId(id) { return this.players.find((p) => p.id === id); }
  current() { return this.players[this.turnIndex]; }
  alive(p) { return p.influence.filter((c) => !c.revealed).length; }
  isAlive(p) { return this.alive(p) > 0; }
  hasCard(p, char) { return p.influence.some((c) => !c.revealed && c.char === char); }
  note(text) { this.log.push({ text, ts: this.seq }); if (this.log.length > 120) this.log.shift(); }

  replaceCard(p, char) {
    const idx = p.influence.findIndex((c) => !c.revealed && c.char === char);
    if (idx === -1) return;
    this.deck.push(char);
    shuffle(this.deck);
    p.influence[idx] = { char: this.deck.pop(), revealed: false };
  }

  // ---- action declaration --------------------------------------------------
  declare(id, action, targetId) {
    if (this.phase !== 'turn') return { error: 'Not the action phase.' };
    const actor = this.current();
    if (actor.id !== id) return { error: "It isn't your turn." };
    const meta = ACTIONS[action];
    if (!meta) return { error: 'Unknown action.' };

    if (actor.coins >= 10 && action !== 'coup')
      return { error: 'With 10 or more coins you must launch a coup.' };
    if (action === 'coup' && actor.coins < 7) return { error: 'A coup costs 7 coins.' };
    if (action === 'assassinate' && actor.coins < 3) return { error: 'Assassination costs 3 coins.' };

    let target = null;
    if (meta.needsTarget) {
      target = this.byId(targetId);
      if (!target || !this.isAlive(target)) return { error: 'Choose a living opponent.' };
      if (target.id === actor.id) return { error: 'You cannot target yourself.' };
    }

    // Immediate, unblockable, unchallengeable actions.
    if (action === 'income') { actor.coins += 1; this.note(`${actor.name} takes Income (+1).`); return this.endTurn(); }
    if (action === 'coup') {
      actor.coins -= 7;
      this.note(`${actor.name} launches a coup against ${target.name}.`);
      return this.queueLoss(target.id, 'endTurn');
    }

    // Set up a contested action.
    this.pending = {
      actor: actor.id,
      action,
      target: target ? target.id : null,
      claim: meta.claim,
      challengeable: meta.challengeable,
      blockable: meta.blockable,
      blockChars: meta.blockChars || [],
      block: null,
    };
    if (action === 'assassinate') actor.coins -= 3; // paid up front, refunded only if bluff is caught
    if (action === 'foreign_aid') this.note(`${actor.name} reaches for Foreign Aid (+2).`);
    else this.note(`${actor.name} claims ${cap(meta.claim)} to ${verb(action)}${target ? ' ' + target.name : ''}.`);

    this.openWindow('open');
    return {};
  }

  // ---- response windows ----------------------------------------------------
  // mode: 'open' (challenge action and/or block), 'block' (block-only after a
  // failed challenge), 'block_challenge' (challenge the declared block).
  openWindow(mode) {
    const pd = this.pending;
    pd._mode = mode;
    if (mode === 'open') {
      pd._responders = this.others(pd.actor);
    } else if (mode === 'block') {
      pd._responders = (this.blockerIds()).filter((bid) => bid !== pd.actor);
    } else if (mode === 'block_challenge') {
      pd._responders = this.players.filter((p) => this.isAlive(p) && p.id !== pd.block.blocker).map((p) => p.id);
    }
    this.phase = 'response';
    // Auto-pass disconnected responders so the table never stalls on an absentee.
    pd._responders = pd._responders.filter((rid) => {
      const p = this.byId(rid);
      return p && this.isAlive(p) && p.connected;
    });
    // Snapshot everyone asked in this window so clients can show who has yet to respond.
    pd._eligible = [...pd._responders];
    if (pd._responders.length === 0) this.onAllPass();
    return {};
  }

  others(actorId) {
    return this.players.filter((p) => this.isAlive(p) && p.id !== actorId).map((p) => p.id);
  }
  blockerIds() {
    const pd = this.pending;
    if (!pd.blockable) return [];
    if (pd.action === 'foreign_aid') return this.others(pd.actor);
    return pd.target ? [pd.target] : []; // steal / assassinate: only the target may block
  }

  respond(id, kind, blockChar) {
    if (this.phase !== 'response' || !this.pending) return { error: 'Nothing to respond to.' };
    const pd = this.pending;
    if (!pd._responders.includes(id)) return { error: 'You have no response to make right now.' };
    const me = this.byId(id);

    if (kind === 'pass') {
      pd._responders = pd._responders.filter((r) => r !== id);
      if (pd._responders.length === 0) this.onAllPass();
      return {};
    }

    if (kind === 'challenge') {
      if (pd._mode === 'block_challenge') return this.resolveBlockChallenge(id);
      if (!pd.challengeable) return { error: 'This action cannot be challenged.' };
      return this.resolveActionChallenge(id);
    }

    if (kind === 'block') {
      if (pd._mode === 'block_challenge') return { error: 'You cannot block a block.' };
      const eligible = this.blockerIds();
      if (!eligible.includes(id)) return { error: 'You are not the target of this action.' };
      if (!pd.blockChars.includes(blockChar)) return { error: 'That character cannot block this.' };
      pd.block = { blocker: id, claim: blockChar };
      this.note(`${me.name} blocks with ${cap(blockChar)}.`);
      this.openWindow('block_challenge');
      return {};
    }
    return { error: 'Unknown response.' };
  }

  onAllPass() {
    const pd = this.pending;
    if (pd._mode === 'block_challenge') {
      // The block went unchallenged — it stands, the action is cancelled.
      this.note(`The block holds. ${cap(ACTIONS[pd.action] && pd.action)} is stopped.`);
      return this.cancelAction();
    }
    // 'open' or 'block': nobody intervened — the action resolves.
    return this.applyAction();
  }

  resolveActionChallenge(challengerId) {
    const pd = this.pending;
    const actor = this.byId(pd.actor);
    const challenger = this.byId(challengerId);
    this.note(`${challenger.name} challenges ${actor.name}'s ${cap(pd.claim)}.`);
    if (this.hasCard(actor, pd.claim)) {
      // Bluff was real — challenger is wrong.
      this.note(`${actor.name} reveals ${cap(pd.claim)}. ${challenger.name} loses the challenge.`);
      this.replaceCard(actor, pd.claim);
      return this.queueLoss(challengerId, 'proceedAfterClaim');
    }
    // Caught bluffing.
    this.note(`${actor.name} was bluffing! The ${cap(pd.claim)} was a lie.`);
    if (pd.action === 'assassinate') actor.coins += 3; // refund — the assassination never happened
    return this.queueLoss(actor.id, 'cancelAction');
  }

  resolveBlockChallenge(challengerId) {
    const pd = this.pending;
    const blocker = this.byId(pd.block.blocker);
    const challenger = this.byId(challengerId);
    this.note(`${challenger.name} challenges ${blocker.name}'s ${cap(pd.block.claim)}.`);
    if (this.hasCard(blocker, pd.block.claim)) {
      this.note(`${blocker.name} reveals ${cap(pd.block.claim)}. The block stands.`);
      this.replaceCard(blocker, pd.block.claim);
      return this.queueLoss(challengerId, 'cancelAction');
    }
    this.note(`${blocker.name} was bluffing the block!`);
    return this.queueLoss(pd.block.blocker, 'applyAction');
  }

  proceedAfterClaim() {
    const pd = this.pending;
    if (pd.blockable && this.blockerIds().some((bid) => { const p = this.byId(bid); return p && this.isAlive(p); })) {
      return this.openWindow('block');
    }
    return this.applyAction();
  }

  applyAction() {
    const pd = this.pending;
    const actor = this.byId(pd.actor);
    const target = pd.target ? this.byId(pd.target) : null;
    switch (pd.action) {
      case 'foreign_aid': actor.coins += 2; this.note(`${actor.name} takes Foreign Aid (+2).`); break;
      case 'tax':         actor.coins += 3; this.note(`${actor.name} collects Tax (+3).`); break;
      case 'steal': {
        const amt = Math.min(2, target.coins);
        target.coins -= amt; actor.coins += amt;
        this.note(`${actor.name} steals ${amt} from ${target.name}.`);
        break;
      }
      case 'assassinate':
        this.note(`${actor.name}'s assassination succeeds against ${target.name}.`);
        return this.queueLoss(target.id, 'endTurn');
      case 'exchange': {
        const drawn = [this.deck.pop(), this.deck.pop()].filter(Boolean);
        const aliveCards = actor.influence.filter((c) => !c.revealed).map((c) => c.char);
        this.pendingExchange = { playerId: actor.id, cards: [...aliveCards, ...drawn], keep: aliveCards.length };
        this.phase = 'exchange';
        this.note(`${actor.name} exchanges with the court deck.`);
        return {};
      }
      default: break;
    }
    return this.endTurn();
  }

  cancelAction() { return this.endTurn(); }

  exchangeFor(id) {
    return this.pendingExchange && this.pendingExchange.playerId === id ? this.pendingExchange : null;
  }

  finishExchange(id, keepIndexes) {
    if (this.phase !== 'exchange' || !this.pendingExchange) return { error: 'No exchange in progress.' };
    const ex = this.pendingExchange;
    if (ex.playerId !== id) return { error: 'Not your exchange.' };
    if (!Array.isArray(keepIndexes) || keepIndexes.length !== ex.keep)
      return { error: `Choose exactly ${ex.keep} card${ex.keep > 1 ? 's' : ''} to keep.` };
    const uniq = [...new Set(keepIndexes)];
    if (uniq.length !== ex.keep || uniq.some((i) => i < 0 || i >= ex.cards.length))
      return { error: 'Invalid selection.' };

    const player = this.byId(id);
    const kept = uniq.map((i) => ex.cards[i]);
    const returned = ex.cards.filter((_, i) => !uniq.includes(i));
    // Keep revealed (dead) cards as-is; rebuild the living influence.
    const dead = player.influence.filter((c) => c.revealed);
    player.influence = [...dead, ...kept.map((char) => ({ char, revealed: false }))];
    this.deck.push(...returned);
    shuffle(this.deck);
    this.pendingExchange = null;
    this.note(`${player.name} returns ${returned.length} cards to the deck.`);
    return this.endTurn();
  }

  // ---- losing influence ----------------------------------------------------
  queueLoss(playerId, then) {
    const p = this.byId(playerId);
    const aliveCount = this.alive(p);
    if (aliveCount === 0) return this.continue(then);          // already out
    if (aliveCount === 1) {                                     // no choice
      const card = p.influence.find((c) => !c.revealed);
      card.revealed = true;
      this.note(`${p.name} reveals ${cap(card.char)} and loses influence.`);
      this.checkEliminated(p);
      return this.afterLoss(then);
    }
    this.pendingLoss = { playerId, then };
    this.phase = 'lose';
    return {};
  }

  loseInfluence(id, cardIndex) {
    if (this.phase !== 'lose' || !this.pendingLoss) return { error: 'No influence to surrender.' };
    if (this.pendingLoss.playerId !== id) return { error: 'Not your influence to lose.' };
    const p = this.byId(id);
    const card = p.influence[cardIndex];
    if (!card || card.revealed) return { error: 'Choose a face-down card.' };
    card.revealed = true;
    this.note(`${p.name} reveals ${cap(card.char)} and loses influence.`);
    this.checkEliminated(p);
    const then = this.pendingLoss.then;
    this.pendingLoss = null;
    return this.afterLoss(then);
  }

  checkEliminated(p) {
    if (!p.eliminated && this.alive(p) === 0) { p.eliminated = true; this.note(`${p.name} is out of the game.`); }
  }

  afterLoss(then) {
    if (this.checkWin()) return {};
    return this.continue(then);
  }

  continue(then) {
    switch (then) {
      case 'endTurn':           return this.endTurn();
      case 'cancelAction':      return this.cancelAction();
      case 'applyAction':       return this.applyAction();
      case 'proceedAfterClaim': return this.proceedAfterClaim();
      default:                  return this.endTurn();
    }
  }

  checkWin() {
    const living = this.players.filter((p) => this.isAlive(p));
    if (living.length <= 1 && this.phase !== 'lobby') {
      this.phase = 'over';
      this.winner = living[0]?.id ?? null;
      this.pending = this.pendingLoss = this.pendingExchange = null;
      if (this.winner) this.note(`${this.byId(this.winner).name} is the last one standing. Victory!`);
      return true;
    }
    return false;
  }

  endTurn() {
    this.pending = null; this.pendingLoss = null;
    if (this.checkWin()) return {};
    let next = this.turnIndex;
    for (let i = 0; i < this.players.length; i++) {
      next = (next + 1) % this.players.length;
      if (this.isAlive(this.players[next])) break;
    }
    this.turnIndex = next;
    this.phase = 'turn';
    this.note(`It is ${this.current().name}'s turn.`);
    return {};
  }

  // ---- per-player view -----------------------------------------------------
  viewFor(id) {
    this.seq++;
    const me = this.byId(id);
    return {
      code: this.code,
      phase: this.phase,
      you: id,
      isHost: this.hostId === id,
      turn: this.players[this.turnIndex]?.id ?? null,
      winner: this.winner,
      deckCount: this.deck.length,
      seq: this.seq,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        coins: p.coins,
        connected: p.connected,
        eliminated: p.eliminated,
        influenceCount: this.alive(p),
        // Reveal a card's identity only if it's dead, or it belongs to the viewer.
        cards: p.influence.map((c) => ({
          revealed: c.revealed,
          char: c.revealed || p.id === id ? c.char : null,
        })),
      })),
      pending: this.pending ? {
        actor: this.pending.actor,
        action: this.pending.action,
        target: this.pending.target,
        claim: this.pending.claim,
        mode: this.pending._mode,
        block: this.pending.block,
        responders: this.pending._responders || [],
        eligible: this.pending._eligible || [],
        blockChars: this.blockerIds().includes(id) ? this.pending.blockChars : [],
        canBlock: this.pending._mode !== 'block_challenge' && this.blockerIds().includes(id) && (this.pending._responders || []).includes(id),
        canChallenge: ((this.pending._mode === 'block_challenge') || this.pending.challengeable) && (this.pending._responders || []).includes(id),
      } : null,
      pendingLoss: this.pendingLoss ? { playerId: this.pendingLoss.playerId } : null,
      // Exchange choices are private to the player making them.
      exchange: this.pendingExchange && this.pendingExchange.playerId === id
        ? { cards: this.pendingExchange.cards, keep: this.pendingExchange.keep } : null,
      log: this.log.slice(-40),
    };
  }
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const verb = (a) => ({ tax: 'collect tax', assassinate: 'assassinate', steal: 'steal from', exchange: 'exchange' }[a] || a);
