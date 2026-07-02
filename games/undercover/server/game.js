// Undercover — Spyfall-style social deduction, re-themed as a film-noir
// interrogation. One player is the UNDERCOVER agent who does not know the
// location; everyone else shares the location and a cover role. Players grill
// each other until someone calls a vote — or the undercover names the place.
//
// Server-authoritative: gameView() never leaks the location or role to the
// undercover, and never reveals who the undercover is until the round is over.
import { BaseGame } from './base-game.js';
import { LOCATIONS } from './locations.js';

const shuffle = (a) => {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// How many lines of interrogation chatter a bot will contribute per round.
// Bounded so the shared bot-tick always settles (no endless back-and-forth).
const CHATTER_CAP = 2;

// Built-in question/answer TEMPLATES for the (plain-code) bots. This is the
// language seam: swap `_botLine()` for an LLM later and the rest is unchanged.
// Questions are location-agnostic so anyone can ask them.
const BOT_QUESTIONS = [
  'So what keeps you here so late?',
  "You look jumpy — something on your mind?",
  'How well do you actually know this place?',
  "What's your business around here tonight?",
  'Seen anyone acting strange so far?',
  "You sure you belong here, friend?",
  "What were you doing before all this?",
];
// Non-spies KNOW the location + their cover role, so they answer vaguely but
// plausibly — enough to sound like they belong, not enough to hand it over.
const BOT_AGENT_LINES = [
  'A {role} like me? Just working the room.',
  'Around the {loc} you learn to keep quiet.',
  'Same as any other night at the {loc}.',
  "I've got my hands full with the {role} work.",
  'Nothing out of the ordinary — the {loc} runs itself.',
  "Ask anyone here; {role} duty never stops.",
];
// The undercover has no location — deflect, generalize, turn it around.
const BOT_SPY_LINES = [
  "Wouldn't you like to know.",
  'I mind my own business, same as you should.',
  'Same as everyone else in this room, I figure.',
  "You're awfully curious for a stranger.",
  'I go where the work takes me.',
  "Funny — I was about to ask you the same thing.",
];

export class Game extends BaseGame {
  constructor(code) {
    super(code);
    this.minPlayers = 3;
    this.maxPlayers = 8;
    this.durationSec = 480;     // 8 minutes; host-configurable in the lobby
    this.round = 0;
    this.locations = LOCATIONS;
  }

  // ---- lifecycle ---------------------------------------------------------
  setup() {
    for (const p of this.players) if (typeof p.score !== 'number') p.score = 0;
    this.startRound();
  }

  startRound() {
    const active = this.players;
    this.round += 1;

    // Deal: one location, one undercover, distinct cover roles for the rest.
    this.locationIndex = Math.floor(Math.random() * this.locations.length);
    const loc = this.locations[this.locationIndex];
    const spyIdx = Math.floor(Math.random() * active.length);
    const roleBag = shuffle(loc.roles);

    active.forEach((p, i) => {
      p.isSpy = i === spyIdx;
      p.role = p.isSpy ? null : roleBag[i % roleBag.length];
      p.voted = undefined;
      p.chatterCount = 0;
    });

    this.firstAskerId = active[Math.floor(Math.random() * active.length)].id;
    this.accusationsUsed = new Set(); // each player may open one vote per round
    this.vote = null;
    this.outcome = null;
    this.winningSide = null;
    this.lastAccuserId = null;

    this.phase = 'play';
    this._startClock(this.durationSec * 1000);
    this.note(`Round ${this.round}: the interrogation begins.`);
  }

  cleanup() {
    this._clearTimer();
    this.phase = 'lobby';
    this.round = 0;
    this.vote = null;
    this.outcome = null;
    for (const p of this.players) { p.isSpy = false; p.role = null; p.voted = undefined; }
  }

  // ---- the interrogation clock (server-authoritative) --------------------
  _startClock(ms) {
    this._clearTimer();
    this.roundEndsAt = Date.now() + ms;
    this.timerRunning = true;
    this.remainingMs = ms;
    this._arm(ms);
  }
  _pauseClock() {
    if (!this.timerRunning) return;
    this.remainingMs = Math.max(0, (this.roundEndsAt || 0) - Date.now());
    this.timerRunning = false;
    this.roundEndsAt = null;
    this._clearTimer();
  }
  _resumeClock() {
    if (this.timerRunning) return;
    const ms = this.remainingMs ?? 0;
    this.roundEndsAt = Date.now() + ms;
    this.timerRunning = true;
    this._arm(ms);
  }
  _arm(ms) {
    if (typeof this.broadcast !== 'function') return; // tests drive time manually
    this._timer = setTimeout(() => {
      this._timer = null;
      this._onTimeout();
      try { this.broadcast(); } catch { /* room may be gone */ }
    }, Math.max(0, ms));
  }
  _clearTimer() { if (this._timer) { clearTimeout(this._timer); this._timer = null; } }
  _onTimeout() {
    if (this.phase !== 'play') return;
    // Nobody pinned the undercover before the clock ran out — they slip away.
    this._endRound('spy_survived');
  }

  // ---- actions -----------------------------------------------------------
  handleMessage(playerId, msg) {
    const me = this.byId(playerId);
    if (!me) return { error: 'Unknown player.' };

    switch (msg.t) {
      case 'config':      return this._config(me, msg);
      case 'say':         return this._say(me, msg);
      case 'callVote':    return this._callVote(me, msg);
      case 'castVote':    return this._castVote(me, msg);
      case 'declare':     return this._declare(me);
      case 'guess':       return this._guess(me, msg);
      case 'nextRound':   return this._nextRound(me);
      default:            return { error: 'Unknown action.' };
    }
  }

  _config(me, msg) {
    if (this.phase !== 'lobby') return { error: 'Settings are locked once the round begins.' };
    if (me.id !== this.hostId) return { error: 'Only the host can change settings.' };
    if (typeof msg.durationSec === 'number')
      this.durationSec = clamp(Math.round(msg.durationSec), 120, 900);
    return {};
  }

  // Interrogation chatter — a line in the shared case log. Bots use templated
  // Q&A here; humans may chime in too. Bots are capped so the tick settles.
  _say(me, msg) {
    if (this.phase !== 'play') return { error: 'Save it for the interrogation.' };
    const text = typeof msg.text === 'string' ? msg.text.trim().slice(0, 140) : '';
    if (!text) return { error: 'Say something first.' };
    if (me.isBot && (me.chatterCount || 0) >= CHATTER_CAP) return { error: 'Nothing more to add.' };
    me.chatterCount = (me.chatterCount || 0) + 1;
    this.note(`${me.name}: ${text}`);
    return {};
  }

  _callVote(me, msg) {
    if (this.phase !== 'play') return { error: 'You can only accuse during questioning.' };
    if (this.accusationsUsed.has(me.id)) return { error: 'You already called a vote this round.' };
    const target = this.byId(msg.target);
    if (!target) return { error: 'No such suspect.' };
    if (target.id === me.id) return { error: 'You cannot accuse yourself.' };
    if (!target.connected) return { error: 'That suspect has left the table.' };

    this.accusationsUsed.add(me.id);
    this.lastAccuserId = me.id;
    this._pauseClock();
    // The accuser implicitly votes to convict; everyone but the accused weighs in.
    for (const p of this.players) p.voted = p.id === me.id ? true : undefined;
    this.vote = { accuserId: me.id, accusedId: target.id };
    this.phase = 'vote';
    this.note(`${me.name} accuses ${target.name}.`);
    this._maybeResolveVote();
    return {};
  }

  _castVote(me, msg) {
    if (this.phase !== 'vote' || !this.vote) return { error: 'No vote is open.' };
    if (me.id === this.vote.accusedId) return { error: 'The accused does not vote.' };
    if (me.id === this.vote.accuserId) return { error: 'You opened this vote.' };
    if (me.voted !== undefined) return { error: 'You already voted.' };
    me.voted = !!msg.agree;
    this._maybeResolveVote();
    return {};
  }

  _eligibleVoters() {
    return this.players.filter((p) => p.id !== this.vote.accusedId && p.connected);
  }

  _maybeResolveVote() {
    const voters = this._eligibleVoters();
    // Any dissent ends it immediately — conviction must be unanimous.
    if (voters.some((p) => p.voted === false)) return this._failVote();
    if (voters.every((p) => p.voted === true)) return this._convict();
  }

  _failVote() {
    const accused = this.byId(this.vote.accusedId);
    this.note(`The table is not unanimous. ${accused?.name ?? 'The suspect'} walks — for now.`);
    this.vote = null;
    for (const p of this.players) p.voted = undefined;
    this.phase = 'play';
    this._resumeClock();
    return {};
  }

  _convict() {
    const accused = this.byId(this.vote.accusedId);
    if (accused?.isSpy) this._endRound('caught');
    else this._endRound('wrongful');
    return {};
  }

  _declare(me) {
    if (this.phase !== 'play') return { error: 'You can only break cover during questioning.' };
    if (!me.isSpy) return { error: 'Only the spy can name the location.' };
    this._pauseClock();
    this.phase = 'spyGuess';
    this.note(`${me.name} breaks cover and reaches for a location…`);
    return {};
  }

  _guess(me, msg) {
    if (this.phase !== 'spyGuess') return { error: 'Not naming a location right now.' };
    if (!me.isSpy) return { error: 'Only the spy names the location.' };
    if (typeof msg.locationIndex !== 'number' || !this.locations[msg.locationIndex])
      return { error: 'Pick a location from the board.' };
    this._endRound(msg.locationIndex === this.locationIndex ? 'spy_guessed' : 'spy_wrong_guess');
    return {};
  }

  _nextRound(me) {
    if (this.phase !== 'roundOver') return { error: 'The round is still in play.' };
    if (me.id !== this.hostId) return { error: 'Only the host can deal the next round.' };
    this.startRound();
    return {};
  }

  // ---- AI player ---------------------------------------------------------
  // Heuristic bot. Decides purely from its own redacted view (`viewFor(botId)`)
  // — the same seam a future LLM would use. Returns the next legal message to
  // send (the shape a human client sends into handleMessage), or null if the
  // bot owes no move right now.
  botDecide(view, rng = Math.random) {
    const meId = view.you;
    const me = view.players.find((p) => p.id === meId);
    if (!me) return null;

    // The undercover has broken cover and must name the location.
    if (view.phase === 'spyGuess') {
      if (!view.youAreSpy) return null;
      const n = view.board?.length || 0;
      if (!n) return null;
      // No knowledge of the real place — pick a plausible one off the board.
      return { t: 'guess', locationIndex: Math.floor(rng() * n) };
    }

    // An accusation is on the table — weigh in if we're an eligible voter.
    if (view.phase === 'vote' && view.vote) {
      if (!view.vote.youEligible) return null;
      // A wrongful conviction is a win for the undercover (which can't be the
      // one accused here), so it always convicts; agents convict on a hunch.
      const guilty = view.youAreSpy ? true : rng() < 0.7;
      return { t: 'castVote', agree: guilty };
    }

    // Open questioning.
    if (view.phase === 'play') {
      // Trade some in-character interrogation chatter first (bounded per round).
      if (view.youMayChatter && rng() < 0.7) {
        return { t: 'say', text: this._botLine(view, rng) };
      }
      // The undercover eventually gambles on naming the place.
      if (view.youAreSpy) {
        return rng() < 0.35 ? { t: 'declare' } : null;
      }
      // An agent calls a vote on a hunch (one accusation per player per round).
      if (view.canAccuse && rng() < 0.35) {
        const suspects = view.players.filter((p) => p.id !== meId && p.connected);
        if (suspects.length) {
          const target = suspects[Math.floor(rng() * suspects.length)];
          return { t: 'callVote', target: target.id };
        }
      }
      return null;
    }

    // roundOver: dealing the next round is a host/human call — nothing owed.
    return null;
  }

  // Pick a templated interrogation line appropriate to what the bot knows.
  _botLine(view, rng) {
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    if (rng() < 0.5) return pick(BOT_QUESTIONS);
    if (view.youAreSpy) return pick(BOT_SPY_LINES);
    const loc = view.location || 'this place';
    const role = view.yourRole || 'regular';
    return pick(BOT_AGENT_LINES).replaceAll('{loc}', loc).replaceAll('{role}', role);
  }

  // ---- resolution & scoring ---------------------------------------------
  _endRound(outcome) {
    this._clearTimer();
    this.timerRunning = false;
    this.roundEndsAt = null;
    this.outcome = outcome;
    this.vote = null;

    const spy = this.players.find((p) => p.isSpy);
    const nonSpies = this.players.filter((p) => !p.isSpy);

    if (outcome === 'spy_guessed') {
      this.winningSide = 'spy';
      if (spy) spy.score += 4;                 // named the place — a clean getaway
    } else if (outcome === 'spy_survived') {
      this.winningSide = 'spy';
      if (spy) spy.score += 2;                 // ran out the clock unspotted
    } else if (outcome === 'wrongful') {
      this.winningSide = 'spy';
      if (spy) spy.score += 2;                 // table convicted an innocent
    } else if (outcome === 'caught') {
      this.winningSide = 'agents';
      for (const p of nonSpies) p.score += 1;  // the table pinned the undercover
      const accuser = this.byId(this.lastAccuserId);
      if (accuser && !accuser.isSpy) accuser.score += 1; // bonus for the caller
    } else if (outcome === 'spy_wrong_guess') {
      this.winningSide = 'agents';
      for (const p of nonSpies) p.score += 1;  // undercover guessed wrong
    }

    this.phase = 'roundOver';
    this.note(this._outcomeLine());
    return {};
  }

  _outcomeLine() {
    const spy = this.players.find((p) => p.isSpy);
    const loc = this.locations[this.locationIndex]?.name;
    switch (this.outcome) {
      case 'spy_guessed':     return `${spy?.name} named the ${loc}. The spy wins.`;
      case 'spy_survived':    return `Time's up. ${spy?.name} was the spy — and got away.`;
      case 'wrongful':        return `Wrong call. ${spy?.name} was the spy. They win.`;
      case 'caught':          return `${spy?.name} was the spy — and the players caught them.`;
      case 'spy_wrong_guess': return `${spy?.name} guessed wrong. The players win.`;
      default:                return 'The round is over.';
    }
  }

  // One plain sentence explaining exactly who won and why.
  _reasonLine() {
    const spy = this.players.find((p) => p.isSpy);
    const s = spy?.name ?? 'The spy';
    const loc = this.locations[this.locationIndex]?.name ?? 'the location';
    const accuser = this.byId(this.lastAccuserId);
    switch (this.outcome) {
      case 'caught':
        return `The players correctly accused the spy (${s}), so the players win.`;
      case 'spy_wrong_guess':
        return `The spy (${s}) guessed the wrong location — it was ${loc} — so the players win.`;
      case 'spy_guessed':
        return `The spy (${s}) guessed the location (${loc}) correctly, so the spy wins.`;
      case 'spy_survived':
        return `Time ran out and the spy (${s}) was never caught, so the spy wins.`;
      case 'wrongful':
        return `The players accused an innocent${accuser ? ` on ${accuser.name}'s call` : ''} — ${s} was the spy all along — so the spy wins.`;
      default:
        return 'The round is over.';
    }
  }

  // ---- per-player redacted view -----------------------------------------
  gameView(id) {
    const me = this.byId(id);
    const over = this.phase === 'roundOver';
    const iAmSpy = !!me?.isSpy;

    const players = this.players.map((p) => ({
      id: p.id,
      name: p.name,
      connected: p.connected,
      isBot: !!p.isBot,
      score: p.score || 0,
      hasVoted: this.phase === 'vote' ? p.voted !== undefined : false,
      // The undercover's identity stays sealed until the reveal.
      isSpy: over ? !!p.isSpy : false,
      role: over ? (p.isSpy ? null : p.role) : undefined,
    }));

    const view = {
      round: this.round,
      durationSec: this.durationSec,
      phase: this.phase,
      players,
      firstAskerId: this.firstAskerId ?? null,
      firstAskerName: this.byId(this.firstAskerId)?.name ?? null,
      // Public reference board — everyone (even the undercover) sees the full
      // list of possible places; only the *active* one is hidden from the spy.
      board: this.locations.map((l) => l.name),

      // Your sealed dossier. The undercover gets nothing but the stamp.
      youAreSpy: iAmSpy,
      yourRole: over ? (me?.role ?? null) : (iAmSpy ? null : (me?.role ?? null)),
      location: iAmSpy && !over ? null : (this.locations[this.locationIndex]?.name ?? null),

      // Clock: an end-timestamp + server clock so every client agrees.
      serverNow: Date.now(),
      roundEndsAt: this.timerRunning ? this.roundEndsAt : null,
      remainingMs: this.timerRunning
        ? Math.max(0, (this.roundEndsAt || 0) - Date.now())
        : (this.remainingMs ?? this.durationSec * 1000),
      timerRunning: !!this.timerRunning,

      canAccuse: this.phase === 'play' && !!me && !this.accusationsUsed?.has(me.id),
      // Whether you still have interrogation chatter left to contribute.
      youMayChatter: this.phase === 'play' && !!me && (me.chatterCount || 0) < CHATTER_CAP,
    };

    if (this.phase === 'vote' && this.vote) {
      const voters = this._eligibleVoters();
      const yes = voters.filter((p) => p.voted === true).length;
      const no = voters.filter((p) => p.voted === false).length;
      view.vote = {
        accuserId: this.vote.accuserId,
        accuserName: this.byId(this.vote.accuserId)?.name ?? null,
        accusedId: this.vote.accusedId,
        accusedName: this.byId(this.vote.accusedId)?.name ?? null,
        needed: voters.length,
        yes,
        no,
        youEligible: !!me && me.id !== this.vote.accusedId && me.id !== this.vote.accuserId && me.voted === undefined && me.connected,
        youAreAccused: !!me && me.id === this.vote.accusedId,
      };
    }

    if (over) {
      view.outcome = this.outcome;
      view.winningSide = this.winningSide;
      const spy = this.players.find((p) => p.isSpy);
      view.spyId = spy?.id ?? null;
      view.spyName = spy?.name ?? null;
      view.location = this.locations[this.locationIndex]?.name ?? null;
      view.locationIndex = this.locationIndex;
      // Unambiguous, plain-language result for the reveal screen.
      view.winnerLabel = this.winningSide === 'agents' ? 'The players win' : 'The spy wins';
      view.reason = this._reasonLine();
    }

    return view;
  }
}
