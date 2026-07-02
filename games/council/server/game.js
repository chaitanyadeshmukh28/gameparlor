// The Council — authoritative game engine (a faithful reimplementation of the
// hidden-role legislative game Secret Hitler). Pure logic: no networking. The
// server drives it; clients only ever receive a per-player, role-redacted view.
//
// Factions:
//   liberal — the good majority. Win by enacting Liberal policies or executing Hitler.
//   fascist — the bad minority. They know each other (and know Hitler).
//   hitler  — a fascist the others must elevate to Chancellor. The Liberals' secret target.
//
// A rotating President nominates a Chancellor; the Council votes; if the slate
// passes the President draws 3 policies and discards 1 in secret, and the
// Chancellor enacts 1 of the remaining 2. Fascist policies unlock executive powers.
//
// NOTE: internally the President is tracked as `chairId` and the Chancellor as
// `nominee`/`deputyId` — historical field names; the protocol and UI present them
// as President / Chancellor.
import { BaseGame } from './base-game.js';

// Policy deck composition: 6 Liberal : 11 Fascist.
const LIBERAL_CARDS = 6;
const FASCIST_CARDS = 11;
export const LIBERAL_WIN = 5;     // Liberals win at 5 Liberal policies enacted.
export const FASCIST_WIN = 6;     // Fascists win at 6 Fascist policies enacted.

// Fascist (non-Hitler) count by table size; Hitler is always +1 on the fascist team.
export const FASCIST_COUNT = { 5: 1, 6: 1, 7: 2, 8: 2, 9: 3, 10: 3 };

// Executive powers by player count, keyed on the Fascist-track position reached.
export const POWER_TABLE = {
  5:  { 3: 'survey',  4: 'execute',  5: 'execute' },
  6:  { 3: 'survey',  4: 'execute',  5: 'execute' },
  7:  { 2: 'inspect', 3: 'appoint', 4: 'execute', 5: 'execute' },
  8:  { 2: 'inspect', 3: 'appoint', 4: 'execute', 5: 'execute' },
  9:  { 1: 'inspect', 2: 'inspect', 3: 'appoint', 4: 'execute', 5: 'execute' },
  10: { 1: 'inspect', 2: 'inspect', 3: 'appoint', 4: 'execute', 5: 'execute' },
};
const VETO_UNLOCK = 5; // Veto power available once 5 Fascist policies are enacted.

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
    this.minPlayers = 5;
    this.maxPlayers = 10;
  }

  // ---- setup ---------------------------------------------------------------
  setup() {
    const n = this.players.length;
    if (n < this.minPlayers) return { error: `Need at least ${this.minPlayers} players.` };

    // Assign roles: some Fascists, one Hitler, the rest Liberals.
    const fasc = FASCIST_COUNT[n];
    const roles = [];
    for (let i = 0; i < fasc; i++) roles.push('fascist');
    roles.push('hitler');
    while (roles.length < n) roles.push('liberal');
    shuffle(roles);

    this.order = this.players.map((p) => p.id);   // fixed seating order
    this.players.forEach((p, i) => {
      p.role = roles[i];
      p.team = roles[i] === 'liberal' ? 'good' : 'bad';
      p.alive = true;
    });

    // Policy deck.
    this.drawPile = shuffle([
      ...Array(LIBERAL_CARDS).fill('liberal'),
      ...Array(FASCIST_CARDS).fill('fascist'),
    ]);
    this.discardPile = [];
    this.liberalEnacted = 0;
    this.fascistEnacted = 0;
    this.failedVotes = 0;

    // Round state.
    this.chairId = this.order[0];                  // the President
    this.lastGov = { chairId: null, deputyId: null };
    this.special = null;           // { returnAfterId } when a Special Election is active
    this.nominee = null;           // the nominated Chancellor
    this.votes = {};
    this.lastElection = null;
    this.draw3 = null;             // President's drawn policies (secret)
    this.deputy2 = null;          // Chancellor's two policies (secret)
    this.vetoProposed = false;
    this.lastEnacted = null;      // { policy } for the enact animation
    this.activePower = null;       // { type, chairId, targetId, top3, result }
    this.privateIntel = {};        // playerId -> [{ targetId, team }]
    this.investigatedBy = {};      // presidentId -> [investigated targetIds]
    this.winner = null;            // 'good' | 'bad'
    this.winReason = null;

    this.phase = 'nominate';
    this.note('The Council convenes. The President must nominate a Chancellor.');
    return {};
  }

  cleanup() {
    this.winner = null; this.winReason = null;
    this.drawPile = []; this.discardPile = [];
    this.nominee = null; this.votes = {}; this.lastElection = null;
    this.draw3 = null; this.deputy2 = null; this.activePower = null;
    this.lastEnacted = null; this.special = null;
    this.players.forEach((p) => { delete p.role; delete p.team; delete p.alive; });
  }

  // ---- helpers -------------------------------------------------------------
  living() { return this.players.filter((p) => p.alive); }
  livingCount() { return this.living().length; }
  isAlive(p) { return !!(p && p.alive); }
  seatIndex(id) { return this.order.indexOf(id); }
  hitler() { return this.players.find((p) => p.role === 'hitler'); }

  nextAliveAfter(id) {
    const ord = this.order;
    let idx = ord.indexOf(id);
    for (let i = 0; i < ord.length; i++) {
      idx = (idx + 1) % ord.length;
      const p = this.byId(ord[idx]);
      if (p && p.alive) return p.id;
    }
    return id;
  }

  // Chancellors the President may nominate this round (term limits + alive + not self).
  eligibleDeputies() {
    const aliveCount = this.livingCount();
    const out = [];
    for (const id of this.order) {
      const p = this.byId(id);
      if (!p || !p.alive || id === this.chairId) continue;
      if (id === this.lastGov.deputyId) continue;
      // The last President is term-limited too, but only while >5 players remain.
      if (aliveCount > 5 && id === this.lastGov.chairId) continue;
      out.push(id);
    }
    return out;
  }

  deckCount() { return this.drawPile.length; }

  ensureDeck() {
    if (this.drawPile.length < 3) {
      this.drawPile = shuffle([...this.drawPile, ...this.discardPile]);
      this.discardPile = [];
    }
  }

  // ---- message routing -----------------------------------------------------
  handleMessage(playerId, msg) {
    const me = this.byId(playerId);
    if (!me) return { error: 'Unknown player.' };
    switch (msg.t) {
      case 'nominate':      return this.nominate(playerId, msg.deputyId);
      case 'vote':          return this.castVote(playerId, msg.vote);
      case 'ackReveal':     return this.ackReveal(playerId);
      case 'discard':       return this.chairDiscard(playerId, msg.index);
      case 'enact':         return this.deputyEnact(playerId, msg.index);
      case 'proposeVeto':   return this.proposeVeto(playerId);
      case 'answerVeto':    return this.answerVeto(playerId, msg.agree);
      case 'power':         return this.usePower(playerId, msg.targetId);
      case 'ackPower':      return this.ackPower(playerId);
      default:              return { error: 'Unknown action.' };
    }
  }

  // ---- election ------------------------------------------------------------
  nominate(id, deputyId) {
    if (this.phase !== 'nominate') return { error: 'Not the nomination phase.' };
    if (id !== this.chairId) return { error: 'Only the President may nominate.' };
    if (!this.eligibleDeputies().includes(deputyId)) return { error: 'That Chancellor is not eligible.' };
    this.nominee = deputyId;
    this.votes = {};
    this.phase = 'vote';
    this.note(`${this.byId(id).name} nominates ${this.byId(deputyId).name} as Chancellor.`);
    return {};
  }

  castVote(id, vote) {
    if (this.phase !== 'vote') return { error: 'No vote in progress.' };
    const me = this.byId(id);
    if (!me || !me.alive) return { error: 'Only seated Council members vote.' };
    if (vote !== 'ja' && vote !== 'nein') return { error: 'Invalid ballot.' };
    // A ballot, once cast, is sealed — no flip-flopping until the reveal.
    if (this.votes[id] !== undefined) return { error: 'Ballot already cast.' };
    this.votes[id] = vote;
    // Resolve once every connected living member has voted (disconnected auto-Nein).
    const pending = this.living().filter((p) => p.connected && this.votes[p.id] === undefined);
    if (pending.length === 0) this.resolveVote();
    return {};
  }

  // Server-side ballot timeout (armed by the server, mirrors the reveal timeout):
  // every outstanding ballot is taken as a Nein and the slate is resolved so one
  // silent member can never stall the chamber.
  ballotTimeout() {
    if (this.phase !== 'vote') return {};
    this.resolveVote(); // resolveVote already counts any missing ballot as Nein
    return {};
  }

  // A living member dropped mid-vote. Treat them as an auto-Nein and resolve the
  // slate if no *connected* member is still pending.
  onPlayerDisconnected(id) {
    if (this.phase === 'vote') {
      const pending = this.living().filter((p) => p.connected && this.votes[p.id] === undefined);
      if (pending.length === 0) this.resolveVote();
    }
  }

  resolveVote() {
    const tally = this.living().map((p) => ({
      id: p.id,
      vote: this.votes[p.id] || 'nein', // disconnected / silent => Nein
    }));
    const ja = tally.filter((t) => t.vote === 'ja').length;
    const passed = ja > tally.length - ja; // strict majority; ties fail
    this.lastElection = { chairId: this.chairId, deputyId: this.nominee, tally, ja, passed };
    this.phase = 'voteReveal';
    return {};
  }

  // Any living player (or a client timeout) advances past the ballot reveal.
  ackReveal(id) {
    if (this.phase !== 'voteReveal') return {}; // idempotent
    const el = this.lastElection;
    if (el.passed) {
      this.note(`The slate passes (${el.ja}–${el.tally.length - el.ja}).`);
      // Win check: Hitler elected Chancellor once 3+ Fascist policies are down.
      const dep = this.byId(this.nominee);
      if (dep.role === 'hitler' && this.fascistEnacted >= 3) {
        return this.endGame('bad',
          `Hitler (${dep.name}) was elected Chancellor with ${this.fascistEnacted} Fascist policies down → Fascists win.`);
      }
      this.failedVotes = 0;
      this.beginLegislative();
    } else {
      this.note(`The slate fails (${el.ja}–${el.tally.length - el.ja}).`);
      this.failedVotes += 1;
      if (this.failedVotes >= 3) return this.chaos();
      this.advanceChair();
    }
    return {};
  }

  chaos() {
    this.note('Three slates have collapsed. The Council falls into disorder.');
    this.ensureDeck();
    const policy = this.drawPile.shift();
    this.lastGov = { chairId: null, deputyId: null }; // term limits forgotten
    this.failedVotes = 0;
    const res = this.enactPolicy(policy, null, true);
    if (res && res.ended) return {};
    this.advanceChair();
    return {};
  }

  advanceChair() {
    // Return from a Special Election term, else rotate to the next living seat.
    if (this.special) {
      const back = this.special.returnAfterId;
      this.special = null;
      this.chairId = this.nextAliveAfter(back);
    } else {
      this.chairId = this.nextAliveAfter(this.chairId);
    }
    this.nominee = null;
    this.votes = {};
    this.phase = 'nominate';
    return {};
  }

  // ---- legislative session -------------------------------------------------
  beginLegislative() {
    this.lastGov = { chairId: this.chairId, deputyId: this.nominee };
    this.ensureDeck();
    this.draw3 = [this.drawPile.shift(), this.drawPile.shift(), this.drawPile.shift()];
    this.deputy2 = null;
    this.vetoProposed = false;
    this.phase = 'legislativeChair';
    this.note(`${this.byId(this.chairId).name} draws three policies in secret.`);
    return {};
  }

  chairDiscard(id, index) {
    if (this.phase !== 'legislativeChair') return { error: 'Not the drafting phase.' };
    if (id !== this.chairId) return { error: 'Only the President drafts.' };
    if (!this.draw3 || index < 0 || index >= this.draw3.length) return { error: 'Choose a policy to discard.' };
    const discarded = this.draw3.splice(index, 1)[0];
    this.discardPile.push(discarded);  // secret — never revealed
    this.deputy2 = this.draw3;
    this.draw3 = null;
    this.phase = 'legislativeDeputy';
    this.note(`${this.byId(id).name} passes two policies to the Chancellor.`);
    return {};
  }

  deputyEnact(id, index) {
    if (this.phase !== 'legislativeDeputy') return { error: 'Not the enactment phase.' };
    if (id !== this.nominee) return { error: 'Only the Chancellor enacts.' };
    if (!this.deputy2 || index < 0 || index >= this.deputy2.length) return { error: 'Choose a policy to enact.' };
    const enacted = this.deputy2.splice(index, 1)[0];
    this.discardPile.push(this.deputy2[0]); // the other is discarded, secret
    this.deputy2 = null;
    const res = this.enactPolicy(enacted, this.chairId, false);
    // If no win and no executive power claimed the turn, advance to the next round.
    if (!res.ended && this.phase === 'legislativeDeputy') this.advanceChair();
    return {};
  }

  proposeVeto(id) {
    if (this.phase !== 'legislativeDeputy') return { error: 'Veto only during enactment.' };
    if (this.fascistEnacted < VETO_UNLOCK) return { error: 'Veto power is not yet unlocked.' };
    if (id !== this.nominee) return { error: 'Only the Chancellor may move to veto.' };
    this.vetoProposed = true;
    this.note(`${this.byId(id).name} moves to veto the agenda.`);
    return {};
  }

  answerVeto(id, agree) {
    if (this.phase !== 'legislativeDeputy' || !this.vetoProposed) return { error: 'No veto to answer.' };
    if (id !== this.chairId) return { error: 'Only the President answers a veto.' };
    if (agree) {
      // Both agree: discard the agenda, advance the election tracker.
      this.discardPile.push(...(this.deputy2 || []));
      this.deputy2 = null;
      this.vetoProposed = false;
      this.note('The President consents. The agenda is vetoed.');
      this.failedVotes += 1;
      if (this.failedVotes >= 3) return this.chaos();
      this.advanceChair();
    } else {
      this.vetoProposed = false;
      this.note('The President refuses the veto. The Chancellor must enact.');
    }
    return {};
  }

  // ---- enacting + powers ---------------------------------------------------
  enactPolicy(policy, chairId, fromChaos) {
    this.lastEnacted = { policy, fromChaos };
    if (policy === 'liberal') {
      this.liberalEnacted += 1;
      this.note('A Liberal policy is sealed onto the track.');
      if (this.liberalEnacted >= LIBERAL_WIN) {
        this.endGame('good', `The ${LIBERAL_WIN}th Liberal policy was enacted → Liberals win.`);
        return { ended: true };
      }
    } else {
      this.fascistEnacted += 1;
      this.note('A Fascist policy is sealed onto the track.');
      if (this.fascistEnacted >= FASCIST_WIN) {
        this.endGame('bad', `The ${FASCIST_WIN}th Fascist policy was enacted → Fascists win.`);
        return { ended: true };
      }
    }

    // Chaos enactments never grant powers.
    if (fromChaos || policy !== 'fascist') { return { ended: false }; }

    const power = (POWER_TABLE[this.players.length] || {})[this.fascistEnacted];
    if (power) return this.beginPower(power, chairId);
    return { ended: false };
  }

  beginPower(type, chairId) {
    this.activePower = { type, chairId, targetId: null, top3: null, result: null };
    if (type === 'survey') {
      this.ensureDeck();
      this.activePower.top3 = this.drawPile.slice(0, 3);
    }
    this.phase = 'power';
    this.note(`The President invokes ${POWER_LABEL[type]}.`);
    return { ended: false };
  }

  usePower(id, targetId) {
    if (this.phase !== 'power' || !this.activePower) return { error: 'No power to use.' };
    const ap = this.activePower;
    if (id !== ap.chairId) return { error: 'Only the President wields this power.' };
    const target = this.byId(targetId);

    if (ap.type === 'survey') return { error: 'Acknowledge the survey to continue.' };

    if (!target || !target.alive || target.id === id) return { error: 'Choose another living member.' };

    if (ap.type === 'inspect') {
      const seen = this.investigatedBy[id] || [];
      if (seen.includes(targetId)) return { error: 'You have already inspected that member.' };
      this.investigatedBy[id] = [...seen, targetId];
      const team = target.role === 'liberal' ? 'good' : 'bad';
      ap.targetId = targetId;
      ap.result = team;
      (this.privateIntel[id] = this.privateIntel[id] || []).push({ targetId, team });
      this.note(`${this.byId(id).name} inspects ${target.name}'s allegiance.`);
      return {}; // president acknowledges to continue
    }

    if (ap.type === 'appoint') {
      ap.targetId = targetId;
      this.note(`${this.byId(id).name} calls a special election, naming ${target.name} President.`);
      // Special Election: the appointed player becomes President; rotation resumes
      // from the player after the appointing President afterwards.
      this.special = { returnAfterId: id };
      this.chairId = targetId;
      this.activePower = null;
      this.nominee = null; this.votes = {};
      this.phase = 'nominate';
      return {};
    }

    if (ap.type === 'execute') {
      target.alive = false;
      ap.targetId = targetId;
      this.note(`${this.byId(id).name} executes ${target.name}.`);
      if (target.role === 'hitler') {
        return this.endGame('good', `Hitler (${target.name}) was executed → Liberals win.`);
      }
      this.activePower = null;
      this.advanceChair();
      return {};
    }
    return { error: 'Unknown power.' };
  }

  // President acknowledges a no-target power (survey) or a completed inspect.
  ackPower(id) {
    if (this.phase !== 'power' || !this.activePower) return {};
    const ap = this.activePower;
    if (id !== ap.chairId) return { error: 'Only the President may continue.' };
    if (ap.type === 'survey' || (ap.type === 'inspect' && ap.result)) {
      this.activePower = null;
      this.advanceChair();
    }
    return {};
  }

  endGame(team, reason) {
    this.phase = 'over';
    this.winner = team;
    this.winReason = reason;
    this.activePower = null;
    this.draw3 = null; this.deputy2 = null;
    this.note(reason);
    return { ended: true };
  }

  // ---- AI player -----------------------------------------------------------
  // Heuristic, faction-aware bot. Decides purely from its own redacted view
  // (the same seam an LLM would use), respecting hidden info: a liberal only
  // ever knows what viewFor gives it (own role + any inspections it performed),
  // while fascists see the whole fascist bench (incl. Hitler at 5–6p). Returns
  // the next legal message to send, or null when it owes no move right now.
  botDecide(view, rng = Math.random) {
    if (!view || view.phase === 'over' || view.phase === 'lobby') return null;
    const meId = view.you;
    const me = (view.players || []).find((p) => p.id === meId);
    if (!me) return null;
    const badTeam = view.youTeam === 'bad'; // fascist or Hitler
    const fascCount = view.tracks ? view.tracks.fascist : 0;

    const others = (view.players || []).filter((p) => p.id !== meId && p.alive);
    // Who this bot has learned is bad/good — visible teammates + own inspections.
    const intelBad = new Set((view.privateIntel || []).filter((x) => x.team === 'bad').map((x) => x.targetId));
    const intelGood = new Set((view.privateIntel || []).filter((x) => x.team === 'good').map((x) => x.targetId));
    const knownBad = (p) => p.team === 'bad' || p.role === 'fascist' || p.role === 'hitler' || intelBad.has(p.id);
    const knownGood = (p) => p.team === 'good' || p.role === 'liberal' || intelGood.has(p.id);
    const pick = (arr) => (arr.length ? arr[Math.floor(rng() * arr.length)] : null);

    // ---- Nomination: only the President owes a move. -----------------------
    if (view.phase === 'nominate') {
      if (meId !== view.chairId) return null;
      const elig = (view.eligibleDeputies || []).map((did) => this.byId(did)).filter(Boolean);
      if (!elig.length) return null;
      let choice;
      if (badTeam) {
        // Late game: try to install Hitler as Chancellor for the instant win.
        if (fascCount >= 3) choice = elig.find((p) => p.role === 'hitler');
        // Otherwise prefer a fellow fascist to push the Fascist agenda.
        if (!choice) choice = pick(elig.filter((p) => knownBad(p)));
        // Fall back to a plausible-looking liberal to blend in.
        if (!choice) choice = pick(elig);
      } else {
        // Liberals nominate someone they trust; never a confirmed fascist.
        choice = pick(elig.filter((p) => knownGood(p)))
          || pick(elig.filter((p) => !knownBad(p)))
          || pick(elig);
      }
      return { t: 'nominate', deputyId: choice.id };
    }

    // ---- Voting: every living, un-voted member casts a ballot. -------------
    if (view.phase === 'vote') {
      if (!me.alive || view.yourVote) return null;
      const nominee = (view.players || []).find((p) => p.id === view.nominee);
      const chair = (view.players || []).find((p) => p.id === view.chairId);
      let ja;
      if (badTeam) {
        // Winning slate (Hitler as Chancellor, 3+ fascist policies) → always Ja.
        if (fascCount >= 3 && nominee && nominee.role === 'hitler') ja = true;
        // Back any government containing a fascist teammate.
        else if ((nominee && knownBad(nominee)) || (chair && knownBad(chair))) ja = true;
        // Otherwise vote unpredictably to avoid looking like a bloc.
        else ja = rng() < 0.55;
      } else {
        // Liberals reject a known fascist Chancellor outright.
        if (nominee && knownBad(nominee)) ja = false;
        // Grow cautious once the Fascist track is dangerous (possible Hitler win).
        else if (fascCount >= 3 && nominee && !knownGood(nominee)) ja = rng() < 0.5;
        else ja = rng() < 0.85;
      }
      return { t: 'vote', vote: ja ? 'ja' : 'nein' };
    }

    // ---- Ballot reveal: any living member can advance the table. -----------
    if (view.phase === 'voteReveal') {
      if (!me.alive) return null;
      return { t: 'ackReveal' };
    }

    // ---- Legislative (President drafts 3 → discards 1). --------------------
    if (view.phase === 'legislativeChair') {
      if (meId !== view.chairId || !view.draw3) return null;
      const hand = view.draw3;
      // Liberals bin a Fascist card; fascists bin a Liberal card (to leave the
      // Chancellor a Fascist to enact). Fall back to the first card.
      const wantGone = badTeam ? 'liberal' : 'fascist';
      let idx = hand.indexOf(wantGone);
      if (idx === -1) idx = 0;
      return { t: 'discard', index: idx };
    }

    // ---- Legislative (Chancellor enacts 1 of 2; veto handling). -----------
    if (view.phase === 'legislativeDeputy') {
      // President answering a proposed veto. Always consent — this cleanly ends
      // the round (a failed election) and can never loop.
      if (view.vetoProposed) {
        if (meId !== view.chairId) return null;
        return { t: 'answerVeto', agree: true };
      }
      if (meId !== view.nominee || !view.deputy2) return null;
      const hand = view.deputy2;
      // A Liberal Chancellor forced to enact two Fascist policies moves to veto
      // (only once — the President always consents, so no re-proposal loop).
      if (!badTeam && view.canVeto && hand.every((p) => p === 'fascist')) {
        return { t: 'proposeVeto' };
      }
      const want = badTeam ? 'fascist' : 'liberal';
      let idx = hand.indexOf(want);
      if (idx === -1) idx = 0;
      return { t: 'enact', index: idx };
    }

    // ---- Executive power: only the wielding President owes a move. ---------
    if (view.phase === 'power' && view.power) {
      const pw = view.power;
      if (meId !== pw.chairId) return null;
      if (pw.type === 'survey') return { t: 'ackPower' };
      if (pw.type === 'inspect') {
        if (pw.result) return { t: 'ackPower' }; // already inspected → continue
        // Inspect an un-inspected member; liberals probe the unknown, fascists
        // probe a liberal (result is private either way).
        const seen = new Set((view.privateIntel || []).map((x) => x.targetId));
        const pool = others.filter((p) => !seen.has(p.id));
        let target = badTeam
          ? pick(pool.filter((p) => !knownBad(p)))
          : pick(pool.filter((p) => !knownGood(p) && !knownBad(p)));
        target = target || pick(pool) || pick(others);
        return target ? { t: 'power', targetId: target.id } : { t: 'ackPower' };
      }
      if (pw.type === 'appoint') {
        // Fascists hand the presidency to a teammate; liberals to someone trusted.
        let target = badTeam
          ? (pick(others.filter((p) => knownBad(p))) || pick(others))
          : (pick(others.filter((p) => knownGood(p))) || pick(others.filter((p) => !knownBad(p))) || pick(others));
        return target ? { t: 'power', targetId: target.id } : null;
      }
      if (pw.type === 'execute') {
        let target;
        if (badTeam) {
          // Never shoot a teammate or Hitler; a role we can't see is a Liberal.
          target = pick(others.filter((p) => !knownBad(p))) || pick(others);
        } else {
          // Prefer a confirmed fascist, else a suspicious unknown.
          target = pick(others.filter((p) => knownBad(p)))
            || pick(others.filter((p) => !knownGood(p)))
            || pick(others);
        }
        return target ? { t: 'power', targetId: target.id } : null;
      }
      return { t: 'ackPower' };
    }

    return null;
  }

  // ---- per-player view -----------------------------------------------------
  gameView(id) {
    // Before setup() runs, the generic lobby view is all that's needed.
    if (this.phase === 'lobby' || !this.order) return {};
    const me = this.byId(id);
    const over = this.phase === 'over';
    const n = this.players.length;
    const hitlerKnowsAllies = n <= 6;

    // What roles may THIS viewer see for each player?
    const canSeeRole = (p) => {
      if (over) return true;
      if (!me || !me.role) return false;
      if (p.id === id) return true;
      if (me.role === 'fascist') return p.role !== 'liberal';            // fascists know the fascist bench (incl. Hitler)
      if (me.role === 'hitler' && hitlerKnowsAllies) return p.role === 'fascist'; // small games: Hitler knows the fascists
      return false;
    };

    const players = this.players.map((p) => ({
      id: p.id,
      name: p.name,
      connected: p.connected,
      alive: p.alive ?? true,
      seat: this.seatIndex(p.id),
      isChair: p.id === this.chairId,
      isDeputy: p.id === this.nominee,
      role: canSeeRole(p) ? p.role : null,
      team: canSeeRole(p) ? (p.role === 'liberal' ? 'good' : 'bad') : null,
    }));

    const view = {
      phase: this.phase,
      you: id,
      youRole: me?.role ?? null,
      youTeam: me?.team ?? null,
      players,
      chairId: this.chairId,
      nominee: this.nominee,
      tracks: {
        liberal: this.liberalEnacted,
        fascist: this.fascistEnacted,
        liberalWin: LIBERAL_WIN,
        fascistWin: FASCIST_WIN,
        vetoUnlocked: this.fascistEnacted >= VETO_UNLOCK,
      },
      powerTrack: POWER_TABLE[n] || {},
      failedVotes: this.failedVotes,
      deckCount: this.deckCount(),
      discardCount: this.discardPile ? this.discardPile.length : 0,
      lastEnacted: this.lastEnacted,
      winner: this.winner,
      winReason: this.winReason,
      // At game over, name Hitler outright so the reveal is unambiguous.
      hitlerId: over ? this.hitler()?.id ?? null : null,
      privateIntel: (this.privateIntel?.[id] || []).map((x) => ({
        targetId: x.targetId,
        name: this.byId(x.targetId)?.name,
        team: x.team,
      })),
    };

    // Nomination context for the President.
    if (this.phase === 'nominate') {
      view.eligibleDeputies = id === this.chairId ? this.eligibleDeputies() : [];
    }

    // Voting: show who has cast (not how), and your own ballot.
    if (this.phase === 'vote') {
      view.yourVote = this.votes[id] ?? null;
      view.votedIds = Object.keys(this.votes);
    }

    // Ballot reveal.
    if (this.phase === 'voteReveal' && this.lastElection) {
      view.election = this.lastElection;
    }

    // Legislative — secret hands.
    if (this.phase === 'legislativeChair' && id === this.chairId) {
      view.draw3 = this.draw3;
    }
    if (this.phase === 'legislativeDeputy') {
      if (id === this.nominee) view.deputy2 = this.deputy2;
      view.vetoProposed = this.vetoProposed;
      view.canVeto = this.fascistEnacted >= VETO_UNLOCK;
    }

    // Active executive power.
    if (this.phase === 'power' && this.activePower) {
      const ap = this.activePower;
      view.power = {
        type: ap.type,
        chairId: ap.chairId,
        targetId: ap.targetId,
        result: id === ap.chairId ? ap.result : null,
        top3: id === ap.chairId ? ap.top3 : null,
      };
    }

    return view;
  }
}

const POWER_LABEL = {
  inspect: 'an Inspection of Allegiance',
  appoint: 'a Special Election',
  survey:  'a Survey of the Deck',
  execute: 'an Execution',
};
