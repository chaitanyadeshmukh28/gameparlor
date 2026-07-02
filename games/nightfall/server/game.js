// Nightfall — authoritative game engine (mechanics based on One Night Ultimate
// Werewolf, with entirely original role names & flavor). Pure logic; the server
// drives it and every client only ever receives a per-player redacted view
// (see gameView). Secret information NEVER crosses the wire to non-owners.
//
// Roles (standard One Night Ultimate Werewolf):
//   werewolf      — wolves wake together; a lone wolf may glimpse one center card.
//   seer          — view one player's card OR two of the center cards.
//   robber        — swap your card with a player's, then see your new role.
//   troublemaker  — swap two OTHER players' cards (without looking).
//   insomniac     — at night's end, look at your own (possibly changed) card.
//   villager      — no night action.
//   tanner        — no night action; wins ONLY if eliminated.

import { BaseGame } from './base-game.js';

export const VILLAGE_ROLES = ['seer', 'robber', 'troublemaker', 'insomniac', 'villager'];
const WAKE_ORDER = ['werewolf', 'seer', 'robber', 'troublemaker', 'insomniac'];

const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Build the role deck for a player count. Total cards = players + 3 center.
// Always 2 werewolves (3 at the largest tables); add specials, fill villagers.
export function buildRoleList(numPlayers) {
  const total = numPlayers + 3;
  const roles = [];
  const wolves = total >= 10 ? 3 : 2;
  for (let i = 0; i < wolves; i++) roles.push('werewolf');
  roles.push('seer', 'robber', 'troublemaker');
  if (total >= 7) roles.push('insomniac');
  if (total >= 8) roles.push('tanner');
  while (roles.length < total) roles.push('villager');
  return roles; // length === total
}

const compositionOf = (deal) => {
  const comp = {};
  for (const r of deal) comp[r] = (comp[r] || 0) + 1;
  return comp;
};

export class Game extends BaseGame {
  constructor(code) {
    super(code);
    this.minPlayers = 3;
    this.maxPlayers = 8;
    this.centerCount = 3;
    this._initRound();
  }

  _initRound() {
    this.cards = [];          // live role assignment; mutated by night swaps
    this.dealt = [];          // snapshot of the deal (drives wake order)
    this.centerIdx = [];      // indexes into cards[] that are center cards
    this.wakeQueue = [];      // [{ role, playerId }] in fixed wake order
    this.stepIndex = 0;
    this.activeStep = null;
    this.votes = {};          // playerId -> targetId
    this.dayEndsAt = null;    // ms timestamp for the discussion timer
    this.result = null;
  }

  // ---- setup -------------------------------------------------------------
  setup() {
    const n = this.players.length;
    const roles = shuffle(buildRoleList(n));
    this.cards = roles;
    this.dealt = [...roles];
    this.centerIdx = [n, n + 1, n + 2];
    this.players.forEach((p, i) => {
      p.seat = i;
      p.dealtRole = roles[i];
      p.info = [];     // private night knowledge (only ever sent to this player)
      p.ready = false;
      p.missedTurn = false;
    });

    // Werewolves learn each other up front.
    const wolves = this.players.filter((p) => p.dealtRole === 'werewolf');
    for (const w of wolves) {
      const names = wolves.filter((x) => x.id !== w.id).map((x) => x.name);
      w.info.push({ k: 'wolves', names, lone: wolves.length === 1 });
    }

    // Wake schedule: by dealt role, fixed order, seat order within a role.
    this.wakeQueue = [];
    for (const role of WAKE_ORDER) {
      this.players.filter((p) => p.dealtRole === role).forEach((p) => this.wakeQueue.push({ role, playerId: p.id }));
    }
    this.stepIndex = 0;
    this.votes = {};
    this.dayEndsAt = null;
    this.result = null;
    this.phase = 'night';
    this.note('Night falls over the village.');
    this._advanceNight();
    return {};
  }

  cleanup() {
    this._initRound();
    this.players.forEach((p) => { p.info = []; p.ready = false; p.dealtRole = null; p.missedTurn = false; });
  }

  // ---- disconnect handling ----------------------------------------------
  removePlayer(id) {
    const wasActive = this.phase === 'night' && this.activeStep?.playerId === id;
    const p = this.byId(id);
    super.removePlayer(id);
    if (wasActive) {
      if (p) p.missedTurn = true;   // dropped mid-turn — they never got to act
      this.stepIndex++; this._advanceNight();
    }
    else if (this.phase === 'day') this._maybeAllReady();
    else if (this.phase === 'vote') this._maybeResolveVotes();
  }

  // ---- night -------------------------------------------------------------
  _advanceNight() {
    while (this.stepIndex < this.wakeQueue.length) {
      const step = this.wakeQueue[this.stepIndex];
      const p = this.byId(step.playerId);
      if (!p || !p.connected) { if (p) p.missedTurn = true; this.stepIndex++; continue; } // never stall on an absentee
      this.activeStep = step;
      this.phase = 'night';
      return;
    }
    this.activeStep = null;
    this._startDay();
  }

  seatOf(id) { return this.byId(id)?.seat; }

  nightAction(id, msg) {
    if (this.phase !== 'night' || !this.activeStep) return { error: 'It is not the night phase.' };
    if (this.activeStep.playerId !== id) return { error: 'It is not your turn to wake.' };
    const me = this.byId(id);
    const role = this.activeStep.role;

    if (msg.skip && role !== 'insomniac') {
      me.info.push({ k: 'skip', role });
    } else {
      switch (role) {
        case 'werewolf': {
          const lone = me.info.find((x) => x.k === 'wolves')?.lone;
          if (lone && Number.isInteger(msg.center)) {
            const c = msg.center;
            if (c < 0 || c >= this.centerCount) return { error: 'Choose a valid center card.' };
            me.info.push({ k: 'wolf-peek', role: this.cards[this.centerIdx[c]], slot: c });
          }
          break;
        }
        case 'seer': {
          if (msg.mode === 'player') {
            const t = this.byId(msg.target);
            if (!t || t.id === id) return { error: 'Choose another player to read.' };
            me.info.push({ k: 'seer-player', name: t.name, role: this.cards[t.seat] });
          } else if (msg.mode === 'center') {
            const idxs = Array.isArray(msg.center) ? [...new Set(msg.center)] : [];
            if (idxs.length !== 2 || idxs.some((c) => c < 0 || c >= this.centerCount))
              return { error: 'Choose two different center cards.' };
            me.info.push({ k: 'seer-center', slots: idxs, roles: idxs.map((c) => this.cards[this.centerIdx[c]]) });
          } else {
            return { error: 'Read a player or two center cards.' };
          }
          break;
        }
        case 'robber': {
          const t = this.byId(msg.target);
          if (!t || t.id === id) return { error: 'Choose another player to rob.' };
          const a = me.seat, b = t.seat;
          [this.cards[a], this.cards[b]] = [this.cards[b], this.cards[a]];
          me.info.push({ k: 'robber', name: t.name, role: this.cards[a] }); // your new role
          break;
        }
        case 'troublemaker': {
          const a = this.byId(msg.a), b = this.byId(msg.b);
          if (!a || !b || a.id === b.id) return { error: 'Choose two different players.' };
          if (a.id === id || b.id === id) return { error: 'You cannot swap your own card.' };
          [this.cards[a.seat], this.cards[b.seat]] = [this.cards[b.seat], this.cards[a.seat]];
          me.info.push({ k: 'troublemaker', a: a.name, b: b.name });
          break;
        }
        case 'insomniac': {
          me.info.push({ k: 'insomniac', role: this.cards[me.seat] });
          break;
        }
        default: break;
      }
    }

    this.stepIndex++;
    this._advanceNight();
    return {};
  }

  // ---- day ---------------------------------------------------------------
  _startDay() {
    this.phase = 'day';
    this.dayEndsAt = null;
    this.players.forEach((p) => { p.ready = false; });
    this.note('Dawn breaks. The village debates.');
  }

  startTimer(id, seconds) {
    if (this.phase !== 'day') return { error: 'There is nothing to time right now.' };
    if (id !== this.hostId) return { error: 'Only the host can start the timer.' };
    const s = Math.max(30, Math.min(600, Number(seconds) || 180));
    this.dayEndsAt = Date.now() + s * 1000;
    return {};
  }

  toggleReady(id) {
    if (this.phase !== 'day') return { error: 'You can only ready up during the day.' };
    const p = this.byId(id);
    if (!p) return { error: 'You are not seated.' };
    p.ready = !p.ready;
    this._maybeAllReady();
    return {};
  }

  _maybeAllReady() {
    if (this.phase !== 'day') return;
    const live = this.players.filter((p) => p.connected);
    if (live.length > 0 && live.every((p) => p.ready)) this._startVote();
  }

  callVote(id) {
    if (this.phase !== 'day') return { error: 'It is not the day phase.' };
    const expired = this.dayEndsAt && Date.now() >= this.dayEndsAt;
    if (id !== this.hostId && !expired) return { error: 'Only the host can call the vote early.' };
    this._startVote();
    return {};
  }

  // ---- vote --------------------------------------------------------------
  _startVote() {
    this.phase = 'vote';
    this.votes = {};
    this.players.forEach((p) => { p.ready = false; });
    this.note('The village casts its votes.');
  }

  castVote(id, targetId) {
    if (this.phase !== 'vote') return { error: 'It is not the voting phase.' };
    const me = this.byId(id);
    const t = this.byId(targetId);
    if (!me) return { error: 'You are not seated.' };
    if (!t) return { error: 'Choose someone to accuse.' };
    if (t.id === id) return { error: 'You cannot vote for yourself.' };
    this.votes[id] = targetId;
    this._maybeResolveVotes();
    return {};
  }

  _maybeResolveVotes() {
    if (this.phase !== 'vote') return;
    const live = this.players.filter((p) => p.connected);
    if (live.length > 0 && live.every((p) => this.votes[p.id])) this._resolveVotes();
  }

  _resolveVotes() {
    const counts = {};
    for (const target of Object.values(this.votes)) counts[target] = (counts[target] || 0) + 1;
    const max = Object.values(counts).reduce((m, v) => Math.max(m, v), 0);
    // A player needs at least two votes to be eliminated; ties at the top all die.
    const deaths = max >= 2 ? Object.keys(counts).filter((t) => counts[t] === max) : [];

    const finalOf = (p) => this.cards[p.seat];
    const wolvesInPlay = this.players.filter((p) => finalOf(p) === 'werewolf');
    const deadWolves = deaths.filter((d) => finalOf(this.byId(d)) === 'werewolf');
    const deadTanners = this.players.filter((p) => deaths.includes(p.id) && finalOf(p) === 'tanner');

    let villageWins = false;
    let werewolfWins = false;
    if (wolvesInPlay.length === 0) {
      // No werewolves among players — the village wins only if nobody dies.
      villageWins = deaths.length === 0;
    } else if (deadWolves.length > 0) {
      villageWins = true;                 // a wolf was caught
    } else if (deadTanners.length > 0) {
      villageWins = false;                // tanner died, no wolf — the outcast alone wins
      werewolfWins = false;               // the pack is denied
    } else {
      werewolfWins = true;                // no wolf died, no tanner died
    }

    const winners = new Set();
    if (villageWins) this.players.forEach((p) => { if (VILLAGE_ROLES.includes(finalOf(p))) winners.add(p.id); });
    if (werewolfWins) wolvesInPlay.forEach((p) => winners.add(p.id));
    deadTanners.forEach((p) => winners.add(p.id)); // a slain outcast always wins

    let team = 'none';
    if (villageWins) team = 'village';
    else if (werewolfWins) team = 'werewolf';
    else if (deadTanners.length > 0) team = 'outcast';

    // A plain-language one-sentence explanation of the outcome.
    const join = (arr) => arr.join(' & ');
    const deadNames = deaths.map((d) => this.byId(d).name);
    const wolfDeadNames = deaths.filter((d) => finalOf(this.byId(d)) === 'werewolf').map((d) => this.byId(d).name);
    const tannerDeadNames = deadTanners.map((p) => p.name);
    let reason;
    if (deaths.length === 0) {
      reason = wolvesInPlay.length === 0
        ? 'No Werewolves were in play and no one was eliminated — the Village wins.'
        : 'No one was eliminated while a Werewolf walked among you — the Werewolves win.';
    } else if (wolfDeadNames.length > 0) {
      reason = tannerDeadNames.length > 0
        ? `A Werewolf (${join(wolfDeadNames)}) and the Tanner (${join(tannerDeadNames)}) were both voted out — the Village and the Tanner win.`
        : `A Werewolf (${join(wolfDeadNames)}) was voted out — the Village wins.`;
    } else if (tannerDeadNames.length > 0) {
      reason = `The Tanner (${join(tannerDeadNames)}) baited the village into a hanging — the Tanner wins.`;
    } else if (wolvesInPlay.length > 0) {
      reason = `No Werewolf was eliminated (${join(deadNames)} died instead) — the Werewolves win.`;
    } else {
      reason = `No Werewolves were in play, but the village eliminated ${join(deadNames)} — nobody wins.`;
    }

    this.result = {
      deaths,
      counts,
      votes: { ...this.votes },
      villageWins,
      werewolfWins,
      team,
      reason,
      winners: [...winners],
      reveal: this.players.map((p) => ({ id: p.id, name: p.name, seat: p.seat, dealt: p.dealtRole, final: finalOf(p), changed: p.dealtRole !== finalOf(p) })),
      center: this.centerIdx.map((idx) => this.cards[idx]),
      nightActions: this._nightRecap(),
    };
    this.phase = 'result';
    this.note('The truth comes to light.');
  }

  // A public, ordered recap of what happened in the night (revealed at the end).
  _nightRecap() {
    const recap = [];
    const wolfNames = this.players.filter((p) => p.dealtRole === 'werewolf').map((p) => p.name);
    if (wolfNames.length) recap.push({ k: 'wolves', names: wolfNames });
    for (const p of this.players) {
      const peek = (p.info || []).find((x) => x.k === 'wolf-peek');
      if (peek) recap.push({ k: 'wolf-peek', actor: p.name, role: peek.role, slot: peek.slot });
    }
    for (const role of ['seer', 'robber', 'troublemaker', 'insomniac']) {
      for (const p of this.players.filter((x) => x.dealtRole === role)) {
        const entry = (p.info || []).find((x) => ['seer-player', 'seer-center', 'robber', 'troublemaker', 'insomniac', 'skip'].includes(x.k));
        if (entry) recap.push({ actor: p.name, ...entry });
      }
    }
    return recap;
  }

  // ---- message routing ---------------------------------------------------
  handleMessage(playerId, msg) {
    switch (msg.t) {
      case 'night':      return this.nightAction(playerId, msg);
      case 'startTimer': return this.startTimer(playerId, msg.seconds);
      case 'ready':      return this.toggleReady(playerId);
      case 'callVote':   return this.callVote(playerId);
      case 'vote':       return this.castVote(playerId, msg.target);
      case 'leave':      return {};
      default:           return { error: 'Unknown action.' };
    }
  }

  // ---- AI player ---------------------------------------------------------
  // Heuristic bot. Decides purely from its own redacted view (the same seam an
  // LLM would use). Returns the next message it should send, or null when it
  // owes no move right now. Only ever returns a legal move for the given view.
  botDecide(view, rng = Math.random) {
    if (!view || !view.me) return null;
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const others = (view.players || []).filter((p) => p.id !== view.you && p.connected !== false);
    const idByName = (name) => (view.players || []).find((p) => p.name === name)?.id ?? null;

    // ---- Night: only the currently-active bot owes an action -------------
    if (view.phase === 'night') {
      if (!view.night?.youAreActive) return null;         // not this bot's wake — wait
      const role = view.night.role;
      switch (role) {
        case 'werewolf': {
          // A lone wolf glimpses one random center card; a pack simply continues.
          if (view.night.context?.lone) return { t: 'night', center: Math.floor(rng() * view.centerCount) };
          return { t: 'night' };
        }
        case 'seer': {
          // Read a random player if there is one; otherwise peek two center cards.
          if (others.length) return { t: 'night', mode: 'player', target: pick(others).id };
          const a = Math.floor(rng() * view.centerCount);
          const b = (a + 1) % view.centerCount;
          return { t: 'night', mode: 'center', center: [a, b] };
        }
        case 'robber': {
          if (others.length) return { t: 'night', target: pick(others).id };
          return { t: 'night', skip: true };
        }
        case 'troublemaker': {
          // Swap two OTHER players' cards; needs at least two others.
          if (others.length >= 2) {
            const a = pick(others);
            const b = pick(others.filter((p) => p.id !== a.id));
            return { t: 'night', a: a.id, b: b.id };
          }
          return { t: 'night', skip: true };
        }
        case 'insomniac':
          return { t: 'night' };                          // always looks at its own card
        default:
          return { t: 'night', skip: true };
      }
    }

    // ---- Day: ready up (once) --------------------------------------------
    if (view.phase === 'day') {
      if (!view.me.ready) return { t: 'ready' };
      return null;
    }

    // ---- Vote: accuse a plausible suspect --------------------------------
    if (view.phase === 'vote') {
      if (view.vote?.youVoted) return null;
      if (!others.length) return null;
      const info = view.me.info || [];
      // A seer who read a player as a werewolf accuses them outright.
      const seen = info.find((x) => x.k === 'seer-player' && x.role === 'werewolf');
      if (seen) { const id = idByName(seen.name); if (id && others.some((o) => o.id === id)) return { t: 'vote', target: id }; }
      // A wolf avoids voting its known pack-mates.
      const packNames = (info.find((x) => x.k === 'wolves')?.names) || [];
      let pool = others.filter((o) => !packNames.includes(o.name));
      if (!pool.length) pool = others;
      return { t: 'vote', target: pick(pool).id };
    }

    return null;
  }

  // ---- per-player redacted view -----------------------------------------
  gameView(id) {
    const me = this.byId(id);
    const view = {
      count: this.players.length,
      centerCount: this.centerCount,
      composition: this.phase === 'lobby'
        ? (this.players.length >= this.minPlayers ? compositionOf(buildRoleList(this.players.length)) : {})
        : compositionOf(this.dealt),
      me: me ? { seat: me.seat, role: me.dealtRole ?? null, info: me.info ?? [], ready: !!me.ready, missedTurn: !!me.missedTurn } : null,
    };

    // Players list — strictly redacted outside the result reveal.
    view.players = this.players.map((p) => {
      const e = { id: p.id, name: p.name, connected: p.connected, isBot: !!p.isBot, isYou: p.id === id };
      if (this.phase === 'day') e.ready = !!p.ready;
      if (this.phase === 'vote') e.voted = !!this.votes[p.id];
      if (this.phase === 'result' && this.result) {
        e.dealt = p.dealtRole;
        e.final = this.cards[p.seat];
        e.dead = this.result.deaths.includes(p.id);
        e.winner = this.result.winners.includes(p.id);
        e.votedFor = this.result.votes[p.id] ?? null;
      }
      return e;
    });

    if (this.phase === 'night') {
      // Reveal NOTHING about who acts or which role to others — only that night is afoot.
      const active = this.activeStep?.playerId === id;
      view.night = { youAreActive: active, role: active ? this.activeStep.role : null };
      if (active) view.night.context = this._nightContext(id);
    }
    if (this.phase === 'day') {
      view.day = { endsAt: this.dayEndsAt, readyCount: this.players.filter((p) => p.ready).length };
    }
    if (this.phase === 'vote') {
      view.vote = {
        youVoted: !!this.votes[id],
        // Count only votes from currently-connected players so the tally can't
        // read "done" while a present player still hasn't voted (QA #6).
        votedCount: this.players.filter((p) => p.connected && this.votes[p.id]).length,
        total: this.players.filter((p) => p.connected).length,
      };
    }
    if (this.phase === 'result') view.result = this.result;

    return view;
  }

  _nightContext(id) {
    const me = this.byId(id);
    const role = this.activeStep.role;
    const ctx = { role };
    if (role === 'werewolf') {
      const w = me.info.find((x) => x.k === 'wolves');
      ctx.partners = w?.names ?? [];
      ctx.lone = !!w?.lone;
    }
    return ctx;
  }
}
