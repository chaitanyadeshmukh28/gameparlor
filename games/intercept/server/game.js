// Intercept — authoritative game engine (mechanics inspired by Decrypto).
// Two watches (teams) each hold four secret keywords in numbered slots. Every
// round each watch's Encryptor receives a secret 3-digit code (a permutation of
// three of {1,2,3,4}) and transmits one clue per digit about the matching
// keyword. Each watch then decodes its OWN code while trying to INTERCEPT the
// enemy's. 2 interceptions win; 2 miscommunications lose.
//
// Server is authoritative: a watch's keywords are revealed only to that watch,
// the active code only to the round's Encryptor. Clues are public (that is the
// whole game); decode/intercept guesses stay hidden until the round resolves.

import { BaseGame } from './base-game.js';
import { WORD_POOL } from './words.js';

const TEAMS = ['A', 'B'];
const TEAM_META = {
  A: { name: 'WATCH ALPHA', trace: 'green' },
  B: { name: 'WATCH BRAVO', trace: 'cyan' },
};
const MAX_ROUNDS = 8;
const CLUE_MAX = 28;

const other = (t) => (t === 'A' ? 'B' : 'A');
const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
// Random permutation of three distinct slots from {1,2,3,4}, order significant.
const randCode = () => shuffle([1, 2, 3, 4]).slice(0, 3);
const eqCode = (a, b) =>
  Array.isArray(a) && Array.isArray(b) && a.length === 3 && a.every((v, i) => v === b[i]);

// ---- bot clue language (PLAIN CODE) --------------------------------------
// A deterministic keyword→clue map is the seam a future LLM can replace. For
// now it is a tiny built-in association table with a first-letters fallback,
// so a keyword always yields the SAME clue — which lets a teammate bot invert
// it back to a slot. Clues stay short/lowercase (legal per the engine's rules).
const CLUE_ASSOC = {
  ANCHOR: 'ship', LANTERN: 'lamp', COMPASS: 'north', HARBOR: 'port', BEACON: 'signal',
  CONVOY: 'fleet', ENGINE: 'motor', PROPELLER: 'blade', PERISCOPE: 'scope', TORPEDO: 'missile',
  BUNKER: 'shelter', TRENCH: 'ditch', RATION: 'food', CANTEEN: 'flask', HELMET: 'headgear',
  BOOT: 'footwear', WIRE: 'cable', STATIC: 'noise', CIPHER: 'code', MORSE: 'dots',
  DYNAMO: 'power', VALVE: 'flow', PISTON: 'cylinder', GEARBOX: 'gears', RUDDER: 'steer',
  KEEL: 'hull', MAST: 'pole', SAIL: 'canvas', TIDE: 'ocean', CURRENT: 'flow',
  REEF: 'coral', LAGOON: 'pool', MOUNTAIN: 'peak', VALLEY: 'dale', GLACIER: 'ice',
  CANYON: 'gorge', DESERT: 'sand', MEADOW: 'field', FOREST: 'woods', SWAMP: 'marsh',
  THUNDER: 'storm', BLIZZARD: 'snow', CYCLONE: 'wind', DRIZZLE: 'rain', EMBER: 'coal',
  CINDER: 'ash', FROST: 'chill', AURORA: 'lights', MARKET: 'bazaar', FACTORY: 'plant',
  FOUNDRY: 'forge', WAREHOUSE: 'depot', STATION: 'depot2', PLATFORM: 'stage', TUNNEL: 'passage',
  BRIDGE: 'span', LADDER: 'rungs', HINGE: 'joint', LATCH: 'catch', ANVIL: 'iron',
  HAMMER: 'mallet', CHISEL: 'carve', WRENCH: 'spanner', PLIERS: 'grip', COPPER: 'metal',
  NICKEL: 'coin', COBALT: 'blue', GRANITE: 'stone', MARBLE: 'slab', AMBER: 'resin',
  QUARTZ: 'crystal', PEARL: 'gem', WHISTLE: 'toot', DRUM: 'beat', TRUMPET: 'brass',
  VIOLIN: 'strings', ORGAN: 'pipes', CHIME: 'ring', GONG: 'clang', HARP: 'pluck',
  FALCON: 'hawk', OTTER: 'river', BADGER: 'burrow', STALLION: 'horse', WALRUS: 'tusks',
  PANTHER: 'cat', HORNET: 'sting', MAGPIE: 'bird', ORCHARD: 'apples', VINEYARD: 'grapes',
  PASTURE: 'graze', GRANARY: 'grain', WINDMILL: 'sails', SCARECROW: 'straw', HARVEST: 'reap',
  PLOW: 'furrow', KETTLE: 'boil', SKILLET: 'pan', CELLAR: 'basement', PANTRY: 'larder',
  CANDLE: 'wick', MATCHBOX: 'strike', TEAPOT: 'brew', GOBLET: 'cup', PARCEL: 'package',
  STAMP: 'postage', LEDGER: 'accounts', INKWELL: 'ink', QUILL: 'feather', SATCHEL: 'bag',
  LOCKET: 'pendant', TELEGRAM: 'wire2', COMET: 'tail', METEOR: 'shooting', CRATER: 'hole',
  NEBULA: 'cloud', ORBIT: 'circle', ECLIPSE: 'shadow', GALAXY: 'stars', PULSAR: 'spin',
  CASTLE: 'fort', TURRET: 'tower', MOAT: 'water', DUNGEON: 'cell', RAMPART: 'wall',
  GARRISON: 'troops', CITADEL: 'stronghold', BARRACKS: 'quarters',
};
// Pure, deterministic clue for a keyword (no rng → invertible by a teammate).
function clueFor(word) {
  const w = String(word || '').toUpperCase();
  return CLUE_ASSOC[w] || w.toLowerCase().slice(0, 4) || 'signal';
}
// Best-effort decode of your OWN watch: match each public clue back to the
// keyword slot that would have produced it. Always returns 3 distinct slots.
function decodeGuess(team) {
  const kw = team.keywords || [];
  const clues = team.clues || [];
  const used = new Set();
  const guess = [];
  for (const clue of clues) {
    let slot = null;
    for (let s = 1; s <= 4; s++) {
      if (!used.has(s) && clueFor(kw[s - 1]) === clue) { slot = s; break; }
    }
    if (slot == null) for (let s = 1; s <= 4; s++) if (!used.has(s)) { slot = s; break; }
    used.add(slot);
    guess.push(slot);
  }
  return guess;
}
// Heuristic interception of the ENEMY watch (keywords unknown): match a clue to
// a slot whose PUBLIC history board once carried it, else guess a free slot.
function interceptGuess(team, rng) {
  const clues = team.clues || [];
  const board = team.board || [[], [], [], []];
  const used = new Set();
  const guess = [];
  for (const clue of clues) {
    let slot = null;
    for (let s = 1; s <= 4; s++) {
      if (!used.has(s) && (board[s - 1] || []).some((e) => e.clue === clue)) { slot = s; break; }
    }
    if (slot == null) {
      const free = [1, 2, 3, 4].filter((s) => !used.has(s));
      slot = free[Math.floor(rng() * free.length)];
    }
    used.add(slot);
    guess.push(slot);
  }
  return guess;
}

export class Game extends BaseGame {
  constructor(code) {
    super(code);
    this.minPlayers = 4;
    this.maxPlayers = 8;
    this.maxRounds = MAX_ROUNDS;
    this.resetState();
  }

  resetState() {
    this.roundNo = 0;
    this.codeByTeam = { A: null, B: null };
    this.cluesByTeam = { A: null, B: null };       // null until that watch transmits
    this.encryptorByTeam = { A: null, B: null };
    this.guesses = { A: { decode: null, intercept: null }, B: { decode: null, intercept: null } };
    this.history = [];                              // [{round, team, clues, code}] public after reveal
    this.lastResult = null;
    this.winner = null;
    this.outcome = null;                            // {winner, reason} once the duel ends
    this.teamData = {
      A: { ...TEAM_META.A, keywords: [], interceptions: 0, miscommunications: 0, encPtr: -1, board: [[], [], [], []] },
      B: { ...TEAM_META.B, keywords: [], interceptions: 0, miscommunications: 0, encPtr: -1, board: [[], [], [], []] },
    };
  }

  // ---- lobby: balance watches as players arrive --------------------------
  addPlayer(id, name) {
    const p = super.addPlayer(id, name);
    if (p && p.team === undefined) {
      const a = this.membersOf('A').length;
      const b = this.membersOf('B').length;
      p.team = a <= b ? 'A' : 'B';
    }
    return p;
  }

  // Bots are added by the shared plumbing ({t:'addBot'}). We implement the seat
  // here (rather than BaseGame.addBot) so we can balance the bot onto a watch,
  // mirroring addPlayer's team assignment.
  addBot(name) {
    if (this.phase !== 'lobby') return null;
    if (this.players.length >= this.maxPlayers) return null;
    if (this.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) return null;
    const p = { id: 'bot-' + Math.random().toString(36).slice(2, 10), name, connected: true, isBot: true };
    const a = this.membersOf('A').length;
    const b = this.membersOf('B').length;
    p.team = a <= b ? 'A' : 'B';
    this.players.push(p);
    if (!this.hostId) this.hostId = p.id;
    this.note(`${name} joined.`);
    return p;
  }

  membersOf(t) { return this.players.filter((p) => p.team === t); }
  connectedMembers(t) { return this.membersOf(t).filter((p) => p.connected); }

  // ---- setup -------------------------------------------------------------
  setup() {
    for (const t of TEAMS) {
      if (this.membersOf(t).length < 2)
        return { error: 'Each watch needs at least two operators. Balance the teams.' };
    }
    const pool = shuffle([...WORD_POOL]);
    this.resetState();
    for (const t of TEAMS) {
      this.teamData[t].keywords = [pool.pop(), pool.pop(), pool.pop(), pool.pop()];
    }
    this.startRound();
    return {};
  }

  pickEncryptor(t) {
    const members = this.membersOf(t);
    if (members.length === 0) return null;
    const td = this.teamData[t];
    for (let i = 1; i <= members.length; i++) {
      const idx = (td.encPtr + i) % members.length;
      if (members[idx].connected) { td.encPtr = idx; return members[idx].id; }
    }
    // Everyone disconnected — keep the seat, pick next in rotation anyway.
    td.encPtr = (td.encPtr + 1) % members.length;
    return members[td.encPtr].id;
  }

  startRound() {
    this.roundNo += 1;
    this.codeByTeam = { A: randCode(), B: randCode() };
    this.cluesByTeam = { A: null, B: null };
    this.guesses = { A: { decode: null, intercept: null }, B: { decode: null, intercept: null } };
    this.encryptorByTeam = { A: this.pickEncryptor('A'), B: this.pickEncryptor('B') };
    this.lastResult = null;
    this.phase = 'encrypt';
    this.note(`Round ${this.roundNo}: encryptors receive their codes.`);
  }

  // ---- eligibility -------------------------------------------------------
  canDecode(p) {
    return this.phase === 'guess' && p.connected && this.encryptorByTeam[p.team] !== p.id;
  }
  canIntercept(p) {
    return this.phase === 'guess' && this.roundNo >= 2 && p.connected;
  }
  // A decode/intercept slot only blocks resolution if someone can actually fill it.
  decodeNeeded(t) {
    return this.connectedMembers(t).some((p) => p.id !== this.encryptorByTeam[t]);
  }
  interceptNeeded(t) {
    return this.roundNo >= 2 && this.connectedMembers(t).length > 0;
  }

  // ---- messages ----------------------------------------------------------
  handleMessage(playerId, msg) {
    const me = this.byId(playerId);
    if (!me) return { error: 'Unknown operator.' };

    if (msg.t === 'team') {
      if (this.phase !== 'lobby') return { error: 'Watches are locked once the game starts.' };
      if (!TEAMS.includes(msg.team)) return { error: 'Pick a valid watch.' };
      me.team = msg.team;
      return {};
    }

    if (msg.t === 'clues') {
      if (this.phase !== 'encrypt') return { error: 'Not the transmission phase.' };
      if (this.encryptorByTeam[me.team] !== me.id) return { error: 'Only your watch’s Encryptor transmits this round.' };
      const clues = Array.isArray(msg.clues) ? msg.clues.map((c) => String(c || '').trim().slice(0, CLUE_MAX)) : [];
      if (clues.length !== 3 || clues.some((c) => !c)) return { error: 'Enter all three clues.' };
      this.cluesByTeam[me.team] = clues;
      this.note(`${TEAM_META[me.team].name} transmits its clues.`);
      if (this.cluesByTeam.A && this.cluesByTeam.B) {
        this.phase = 'guess';
        this.note('Both transmissions are on the air — decode and intercept.');
      }
      return {};
    }

    if (msg.t === 'guess') {
      if (this.phase !== 'guess') return { error: 'Not the decoding phase.' };
      const kind = msg.kind;
      const guess = Array.isArray(msg.guess) ? msg.guess.map((n) => Number(n)) : [];
      const valid = guess.length === 3 && guess.every((n) => Number.isInteger(n) && n >= 1 && n <= 4)
        && new Set(guess).size === 3;
      if (!valid) return { error: 'Choose three different slots (1–4).' };

      if (kind === 'decode') {
        if (!this.canDecode(me)) return { error: 'You cannot decode this round (the Encryptor must sit out).' };
        this.guesses[me.team].decode = guess;
      } else if (kind === 'intercept') {
        if (!this.canIntercept(me)) return { error: 'Interception is unavailable.' };
        this.guesses[me.team].intercept = guess; // your watch guessing the enemy code
      } else {
        return { error: 'Unknown guess type.' };
      }
      this.maybeResolve();
      return {};
    }

    if (msg.t === 'continue') {
      if (this.phase !== 'reveal') return { error: 'Nothing to advance.' };
      this.startRound();
      return {};
    }

    return { error: 'Unknown action.' };
  }

  maybeResolve() {
    for (const t of TEAMS) {
      if (this.decodeNeeded(t) && !this.guesses[t].decode) return;
      if (this.interceptNeeded(t) && !this.guesses[t].intercept) return;
    }
    this.resolveRound();
  }

  // ---- resolution --------------------------------------------------------
  resolveRound() {
    const td = this.teamData;
    const result = { round: this.roundNo, A: {}, B: {}, gained: { A: { int: 0, mis: 0 }, B: { int: 0, mis: 0 } } };

    for (const t of TEAMS) {
      const opp = other(t);
      const code = this.codeByTeam[t];
      const clues = this.cluesByTeam[t];
      const decodeGuess = this.guesses[t].decode;
      const decodeOk = eqCode(decodeGuess, code);
      const interceptGuess = this.guesses[opp].intercept; // opponent trying to read t's code
      const intercepted = this.roundNo >= 2 && eqCode(interceptGuess, code);

      // Miscommunication: your own watch misread your code (only if it could).
      if (this.decodeNeeded(t) && !decodeOk) { td[t].miscommunications += 1; result.gained[t].mis += 1; }
      // Interception: the enemy read your code.
      if (intercepted) { td[opp].interceptions += 1; result.gained[opp].int += 1; }

      // Record clue→slot mapping onto the public board + history.
      for (let i = 0; i < 3; i++) td[t].board[code[i] - 1].push({ round: this.roundNo, clue: clues[i] });
      this.history.push({ round: this.roundNo, team: t, clues, code });

      result[t] = { code, clues, decodeGuess, decodeOk, interceptGuess, intercepted };
    }

    // Win / lose evaluation.
    const A = td.A, B = td.B;
    const aWin = A.interceptions >= 2 || B.miscommunications >= 2;
    const bWin = B.interceptions >= 2 || A.miscommunications >= 2;
    let winner = null, ended = false, reason = '';

    if (aWin || bWin) {
      ended = true;
      if (aWin && bWin) {
        const aInt = A.interceptions >= 2, bInt = B.interceptions >= 2;
        winner = aInt && !bInt ? 'A' : bInt && !aInt ? 'B' : 'draw';
      } else winner = aWin ? 'A' : 'B';

      if (winner === 'draw') {
        reason = 'Both watches cracked their second code at the same instant — signal lost, a draw.';
      } else {
        const W = td[winner], L = td[other(winner)];
        reason = W.interceptions >= 2
          ? `${W.name} intercepted ${W.interceptions} enemy codes — ${W.name} wins.`
          : `${L.name} garbled ${L.miscommunications} of its own codes — ${W.name} wins.`;
      }
    } else if (this.roundNo >= this.maxRounds) {
      ended = true;
      if (A.interceptions !== B.interceptions) {
        winner = A.interceptions > B.interceptions ? 'A' : 'B';
        reason = `Round ${this.maxRounds} reached — ${td[winner].name} wins on most interceptions (${td[winner].interceptions} vs ${td[other(winner)].interceptions}).`;
      } else if (A.miscommunications !== B.miscommunications) {
        winner = A.miscommunications < B.miscommunications ? 'A' : 'B';
        reason = `Round ${this.maxRounds} reached — ${td[winner].name} wins with fewer miscommunications (${td[winner].miscommunications} vs ${td[other(winner)].miscommunications}).`;
      } else {
        winner = 'draw';
        reason = `Round ${this.maxRounds} reached dead level — the duel ends in a draw.`;
      }
    }

    result.ended = ended;
    result.winner = winner;
    result.reason = reason;
    this.lastResult = result;

    if (ended) {
      this.winner = winner;
      this.outcome = { winner, reason };
      this.phase = 'over';
      this.note(winner === 'draw' ? 'Signal lost — the duel ends in a draw.' : reason);
    } else {
      this.phase = 'reveal';
      this.note(`Round ${this.roundNo} decrypted.`);
    }
  }

  // ---- AI player ---------------------------------------------------------
  // Heuristic bot. Decides purely from its own redacted view (the same seam an
  // LLM would use to replace the clue language). Returns the next legal message
  // for this bot, or null when it owes nothing right now.
  botDecide(view, rng = Math.random) {
    const myTeam = view.yourTeam;
    if (!myTeam || !view.teams) return null;
    const mine = view.teams[myTeam];
    const enemy = view.teams[myTeam === 'A' ? 'B' : 'A'];

    // Reveal: acknowledge and advance to the next transmission.
    if (view.phase === 'reveal') return { t: 'continue' };

    // Transmission: if I'm the Encryptor and haven't sent, turn code → clues.
    if (view.phase === 'encrypt') {
      if (view.yourRole === 'encryptor' && mine && !mine.cluesIn) {
        const code = view.yourCode || [];
        const kw = mine.keywords || [];
        if (code.length === 3 && kw.length === 4) {
          return { t: 'clues', clues: code.map((slot) => clueFor(kw[slot - 1])) };
        }
      }
      return null;
    }

    // Decode / intercept: read my own code, then try to crack the enemy's.
    if (view.phase === 'guess') {
      const g = view.yourGuesses || {};
      if (view.canDecode && !g.decode && mine) {
        return { t: 'guess', kind: 'decode', guess: decodeGuess(mine) };
      }
      if (view.canIntercept && !g.intercept && enemy) {
        return { t: 'guess', kind: 'intercept', guess: interceptGuess(enemy, rng) };
      }
      return null;
    }

    return null;
  }

  // ---- per-player view ---------------------------------------------------
  gameView(id) {
    const me = this.byId(id);
    const myTeam = me?.team ?? null;
    const reveal = this.phase === 'reveal' || this.phase === 'over';
    const over = this.phase === 'over';

    const teams = {};
    for (const t of TEAMS) {
      const td = this.teamData[t];
      const isMine = myTeam === t;
      teams[t] = {
        id: t,
        name: td.name,
        trace: td.trace,
        interceptions: td.interceptions,
        miscommunications: td.miscommunications,
        encryptorId: this.encryptorByTeam[t],
        cluesIn: !!this.cluesByTeam[t],
        // Clues are public the moment they are transmitted (the heart of the game).
        clues: this.cluesByTeam[t] || null,
        board: td.board,                                   // public clue→slot deduction board
        // Keywords are secret to the watch — but revealed for BOTH watches once
        // the duel is over so everyone finally sees the enemy's words.
        keywords: (isMine || over) ? td.keywords : null,
        players: this.membersOf(t).map((p) => ({
          id: p.id, name: p.name, connected: p.connected, isBot: !!p.isBot,
          isEncryptor: this.encryptorByTeam[t] === p.id,
        })),
      };
    }

    const iAmEncryptor = myTeam && this.encryptorByTeam[myTeam] === id;

    return {
      roundNo: this.roundNo,
      maxRounds: this.maxRounds,
      yourTeam: myTeam,
      yourRole: iAmEncryptor ? 'encryptor' : 'decoder',
      yourCode: iAmEncryptor && this.phase !== 'lobby' ? this.codeByTeam[myTeam] : null,
      teams,
      // Your own watch's pending guesses (visible to your team, hidden from the enemy).
      yourGuesses: myTeam ? {
        decode: this.guesses[myTeam].decode,
        intercept: this.guesses[myTeam].intercept,
      } : null,
      canDecode: me ? this.canDecode(me) : false,
      canIntercept: me ? this.canIntercept(me) : false,
      decodeNeeded: myTeam ? this.decodeNeeded(myTeam) : false,
      interceptNeeded: myTeam ? this.interceptNeeded(myTeam) : false,
      history: reveal ? this.history : this.history.filter((h) => h.round < this.roundNo),
      lastResult: this.lastResult,
      winner: this.winner,
      outcome: this.outcome,   // {winner, reason} once the duel ends
    };
  }

  cleanup() { this.resetState(); }
}
