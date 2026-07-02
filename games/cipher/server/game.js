// Cipher — authoritative game engine (Codenames mechanics, original theme).
// Pure logic; the server drives it and every client receives a per-player view
// (see gameView) so operatives never learn tile identities over the wire until
// a tile is revealed. Only spymasters receive the secret key.

import { BaseGame } from './base-game.js';
import { WORDS } from './words.js';

const BOARD_SIZE = 25;
const TEAMS = ['red', 'blue'];
export const other = (team) => (team === 'red' ? 'blue' : 'red');

const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const sample = (arr, n) => shuffle([...arr]).slice(0, n);

export class Game extends BaseGame {
  constructor(code) {
    super(code);
    this.minPlayers = 4;
    this.maxPlayers = 8;
    this.resetMatch();
  }

  resetMatch() {
    this.board = [];            // [{ word, type, revealed, revealedBy }]
    this.startingTeam = null;   // team that holds 9 tiles and moves first
    this.turn = null;           // active team
    this.turnRole = 'clue';     // 'clue' (await spymaster) | 'guess' (await operatives)
    this.clue = null;           // { word, count, guessesAllowed, guessesMade, team }
    this.winner = null;
    this.endReason = null;      // 'cleared' | 'assassin'
    this.assassinTile = null;   // index of the assassin once it ends the game
    this.lastEvent = null;      // { kind, team, index, word } — drives reveal feedback
    this.history = [];          // [{ team, clue, count, guesses:[{word,result}], ended }] — public round log
  }

  currentRound() { return this.history[this.history.length - 1] ?? null; }

  // ---- lobby: seat selection ----------------------------------------------
  addPlayer(id, name) {
    const p = super.addPlayer(id, name);
    if (p && p.team === undefined) { p.team = null; p.role = 'operative'; }
    return p;
  }

  // Bots have no socket, so they cannot seat themselves. Add + seat each one the
  // moment it is created: balance the two teams, and claim the spymaster chair
  // only if that team still lacks one (humans can reclaim it — see seat()).
  // (Implemented in full rather than via super.addBot so seating is atomic.)
  addBot(name) {
    if (this.phase !== 'lobby') return null;
    if (this.players.length >= this.maxPlayers) return null;
    if (this.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) return null;
    const p = {
      id: 'bot-' + Math.random().toString(36).slice(2, 10),
      name, connected: true, isBot: true, team: null, role: 'operative',
    };
    this.players.push(p);
    if (!this.hostId) this.hostId = p.id;
    this.note(`${name} joined.`);
    const red = this.players.filter((x) => x.team === 'red');
    const blue = this.players.filter((x) => x.team === 'blue');
    const team = red.length <= blue.length ? 'red' : 'blue';
    const roster = team === 'red' ? red : blue;
    p.team = team;
    p.role = roster.some((x) => x.role === 'spymaster') ? 'operative' : 'spymaster';
    return p;
  }

  handleMessage(playerId, msg) {
    switch (msg.t) {
      case 'seat':  return this.seat(playerId, msg.team ?? null, msg.role ?? 'operative');
      case 'clue':  return this.giveClue(playerId, msg.word, msg.count);
      case 'guess': return this.guess(playerId, msg.index);
      case 'stop':  return this.endGuessing(playerId);
      default:      return { error: 'Unknown action.' };
    }
  }

  seat(id, team, role) {
    if (this.phase !== 'lobby') return { error: 'Seats are locked once the mission starts.' };
    const p = this.byId(id);
    if (!p) return { error: 'Unknown player.' };
    if (team !== null && !TEAMS.includes(team)) return { error: 'Pick the red or blue team.' };
    if (!['operative', 'spymaster'].includes(role)) return { error: 'Pick a role.' };
    p.team = team;
    p.role = role;
    // Claiming the spymaster chair evicts a bot that was holding it, so a human
    // is never blocked from a seat only an AI occupies.
    if (role === 'spymaster' && team) {
      for (const x of this.players)
        if (x !== p && x.isBot && x.team === team && x.role === 'spymaster') x.role = 'operative';
    }
    return {};
  }

  // Safety net before a mission starts: make sure every seated team has exactly
  // one spymaster by promoting/demoting bots (humans keep their picks).
  seatBotsForStart() {
    for (const team of TEAMS) {
      const roster = this.players.filter((p) => p.team === team);
      if (!roster.length) continue;
      const spies = roster.filter((p) => p.role === 'spymaster');
      if (spies.length === 0) {
        const cand = roster.find((p) => p.isBot);
        if (cand) cand.role = 'spymaster';
      } else if (spies.length > 1) {
        const keep = spies.find((p) => !p.isBot) || spies[0];
        for (const s of spies) if (s !== keep && s.isBot) s.role = 'operative';
      }
    }
  }

  setup() {
    this.seatBotsForStart();
    const red = this.players.filter((p) => p.team === 'red');
    const blue = this.players.filter((p) => p.team === 'blue');
    if (this.players.some((p) => !p.team))
      return { error: 'Everyone must pick a team before the mission begins.' };
    if (red.length < 2 || blue.length < 2)
      return { error: 'Each team needs at least 2 agents (a spymaster and an operative).' };
    const redSpy = red.filter((p) => p.role === 'spymaster');
    const blueSpy = blue.filter((p) => p.role === 'spymaster');
    if (redSpy.length !== 1) return { error: 'Red team needs exactly one spymaster.' };
    if (blueSpy.length !== 1) return { error: 'Blue team needs exactly one spymaster.' };

    this.resetMatch();
    this.generateBoard();
    this.turn = this.startingTeam;
    this.turnRole = 'clue';
    this.phase = 'play';
    this.note(`The board is set. ${cap(this.startingTeam)} command transmits first.`);
    return {};
  }

  generateBoard() {
    const words = sample(WORDS, BOARD_SIZE);
    this.startingTeam = Math.random() < 0.5 ? 'red' : 'blue';
    const second = other(this.startingTeam);
    const types = [
      ...Array(9).fill(this.startingTeam),
      ...Array(8).fill(second),
      ...Array(7).fill('neutral'),
      'assassin',
    ];
    shuffle(types);
    this.board = words.map((word, i) => ({
      word, type: types[i], revealed: false, revealedBy: null,
    }));
  }

  // ---- play ----------------------------------------------------------------
  giveClue(id, word, count) {
    if (this.phase !== 'play') return { error: 'No mission is in progress.' };
    const me = this.byId(id);
    if (!me || me.team !== this.turn) return { error: "It isn't your team's turn." };
    if (me.role !== 'spymaster') return { error: 'Only the spymaster transmits clues.' };
    if (this.turnRole !== 'clue') return { error: 'Your operatives are still decoding.' };

    const clean = String(word ?? '').trim();
    if (!/^[a-zA-Z]+(?:[-'][a-zA-Z]+)?$/.test(clean))
      return { error: 'A clue must be a single word.' };
    if (clean.length > 20) return { error: 'That clue is too long.' };
    const upper = clean.toUpperCase();
    if (this.board.some((t) => !t.revealed && t.word === upper))
      return { error: 'You cannot use a word visible on the board.' };

    const remaining = this.teamRemaining(this.turn);
    const n = Math.floor(Number(count));
    if (!Number.isInteger(n) || n < 1 || n > remaining)
      return { error: `Enter a number from 1 to ${remaining}.` };

    this.clue = { word: upper, count: n, guessesAllowed: n + 1, guessesMade: 0, team: this.turn };
    this.turnRole = 'guess';
    this.history.push({ team: this.turn, clue: upper, count: n, guesses: [], ended: null });
    this.lastEvent = { kind: 'clue', team: this.turn, word: upper, count: n };
    this.note(`${cap(this.turn)} spymaster transmits “${upper}” for ${n}.`);
    return {};
  }

  guess(id, index) {
    if (this.phase !== 'play') return { error: 'No mission is in progress.' };
    const me = this.byId(id);
    if (!me || me.team !== this.turn) return { error: "It isn't your team's turn." };
    if (me.role === 'spymaster') return { error: 'Spymasters cannot touch the board.' };
    if (this.turnRole !== 'guess') return { error: 'Wait for your spymaster to transmit.' };
    const tile = this.board[index];
    if (!tile) return { error: 'No such tile.' };
    if (tile.revealed) return { error: 'That tile is already exposed.' };

    tile.revealed = true;
    tile.revealedBy = this.turn;
    this.clue.guessesMade += 1;
    const round = this.currentRound();

    // The assassin ends everything.
    if (tile.type === 'assassin') {
      this.assassinTile = index;
      this.winner = other(this.turn);
      this.endReason = 'assassin';
      this.phase = 'over';
      if (round) { round.guesses.push({ word: tile.word, result: 'assassin' }); round.ended = 'assassin'; }
      this.lastEvent = { kind: 'assassin', team: this.turn, index, word: tile.word };
      this.note(`${cap(this.turn)} uncovered the ASSASSIN — ${cap(this.winner)} wins.`);
      return {};
    }

    if (tile.type === this.turn) {
      if (round) round.guesses.push({ word: tile.word, result: 'correct' });
      this.lastEvent = { kind: 'hit', team: this.turn, index, word: tile.word };
      this.note(`${cap(this.turn)} contacts an agent at ${tile.word}.`);
      if (this.checkClear()) { if (round) round.ended = 'cleared'; return {}; }
      if (this.clue.guessesMade >= this.clue.guessesAllowed) {
        this.note(`${cap(this.turn)} is out of guesses. Turn passes.`);
        return this.endTurn('exhausted');
      }
      return {}; // correct — they may keep going
    }

    if (tile.type === other(this.turn)) {
      if (round) round.guesses.push({ word: tile.word, result: 'enemy' });
      this.lastEvent = { kind: 'enemy', team: this.turn, index, word: tile.word };
      this.note(`${cap(this.turn)} exposes a ${cap(other(this.turn))} agent. Turn ends.`);
      if (this.checkClear()) { if (round) round.ended = 'cleared'; return {}; }
      return this.endTurn('enemy');
    }

    // neutral bystander
    if (round) round.guesses.push({ word: tile.word, result: 'wrong' });
    this.lastEvent = { kind: 'neutral', team: this.turn, index, word: tile.word };
    this.note(`${cap(this.turn)} hits a bystander at ${tile.word}. Turn ends.`);
    return this.endTurn('neutral');
  }

  endGuessing(id) {
    if (this.phase !== 'play') return { error: 'No mission is in progress.' };
    const me = this.byId(id);
    if (!me || me.team !== this.turn) return { error: "It isn't your team's turn." };
    if (me.role === 'spymaster') return { error: 'Spymasters cannot end the guessing.' };
    if (this.turnRole !== 'guess') return { error: 'Nothing to stop right now.' };
    if (!this.clue || this.clue.guessesMade < 1)
      return { error: 'Make at least one guess before stopping.' };
    this.note(`${cap(this.turn)} stands down. Turn passes.`);
    return this.endTurn('stopped');
  }

  endTurn(reason) {
    const round = this.currentRound();
    if (round && !round.ended) round.ended = reason;
    this.turn = other(this.turn);
    this.turnRole = 'clue';
    this.clue = null;
    if (this.lastEvent) this.lastEvent.handoff = reason;
    return {};
  }

  // Win when every one of a team's agents is contacted (by anyone).
  checkClear() {
    for (const team of TEAMS) {
      const total = this.teamTotal(team);
      if (total > 0 && this.teamRevealed(team) === total) {
        this.winner = team;
        this.endReason = 'cleared';
        this.phase = 'over';
        this.note(`Every ${cap(team)} agent is accounted for — ${cap(team)} wins!`);
        return true;
      }
    }
    return false;
  }

  cleanup() {
    // Returning to the lobby keeps team/role picks; just clear the board.
    this.resetMatch();
  }

  // ---- counts --------------------------------------------------------------
  teamTotal(team) { return this.board.filter((t) => t.type === team).length; }
  teamRevealed(team) { return this.board.filter((t) => t.type === team && t.revealed).length; }
  teamRemaining(team) { return this.teamTotal(team) - this.teamRevealed(team); }

  // ---- per-player view -----------------------------------------------------
  gameView(id) {
    const me = this.byId(id);
    const isSpy = me?.role === 'spymaster';
    const reveal = this.phase === 'over'; // expose the full key once the game ends
    return {
      me: { team: me?.team ?? null, role: me?.role ?? 'operative', isSpymaster: isSpy },
      players: this.players.map((p) => ({
        id: p.id, name: p.name, connected: p.connected,
        team: p.team ?? null, role: p.role ?? 'operative',
        isBot: !!p.isBot,
      })),
      board: this.board.map((t, i) => ({
        i,
        word: t.word,
        revealed: t.revealed,
        revealedBy: t.revealedBy,
        // The key is the secret: send a tile's type ONLY if it's revealed, the
        // game is over, or the viewer is a spymaster.
        type: (t.revealed || reveal || isSpy) ? t.type : null,
      })),
      startingTeam: this.startingTeam,
      turn: this.turn,
      turnRole: this.turnRole,
      clue: this.clue && {
        word: this.clue.word, count: this.clue.count,
        guessesMade: this.clue.guessesMade, guessesAllowed: this.clue.guessesAllowed,
        team: this.clue.team,
      },
      score: {
        red: { total: this.teamTotal('red'), remaining: this.teamRemaining('red') },
        blue: { total: this.teamTotal('blue'), remaining: this.teamRemaining('blue') },
      },
      winner: this.winner,
      endReason: this.endReason,
      assassinTile: this.assassinTile,
      lastEvent: this.lastEvent,
      // Round history is public — both teams see every clue and guess (as in Codenames).
      history: this.history.map((r) => ({
        team: r.team, clue: r.clue, count: r.count, ended: r.ended,
        guesses: r.guesses.map((g) => ({ word: g.word, result: g.result })),
      })),
    };
  }

  // ---- AI opponents --------------------------------------------------------
  // Return the next legal message this bot should send (same shape a human
  // client sends into handleMessage), or null when it owes no move. `view` is
  // exactly this.viewFor(botId) — the bot's redacted view: a spymaster bot sees
  // the full key (board tile types), an operative bot only sees revealed tiles.
  //
  // We use PLAIN CODE (no LLM) for now, so the bot cannot truly associate words.
  // It therefore plays SAFELY and legally: as spymaster it clues exactly one of
  // its own hidden agents with the number 1 (a clue word that is provably not on
  // the board and shares no substring with any board word, so the engine's own
  // validation always accepts it); as operative it uncovers one still-hidden
  // tile then stands down. The botDecide(view) seam is preserved so an LLM can
  // later supply real clues/guesses without changing the plumbing.
  botDecide(view, rng = Math.random) {
    if (view.phase !== 'play') return null;      // only acts during a live mission
    const me = view.me;
    if (!me || !me.team) return null;
    if (view.turn !== me.team) return null;       // not this team's turn

    if (view.turnRole === 'clue') {
      if (!me.isSpymaster) return null;           // wait for the spymaster
      return this.botClue(view, rng);
    }
    if (view.turnRole === 'guess') {
      if (me.isSpymaster) return null;            // spymasters cannot touch tiles
      return this.botGuess(view, rng);
    }
    return null;
  }

  botClue(view, rng) {
    // Spymaster view carries the key: our own still-hidden agents have type===team.
    const mine = view.board.filter((t) => !t.revealed && t.type === view.me.team);
    if (!mine.length) return null;
    const target = mine[Math.floor(rng() * mine.length)];
    const hidden = view.board.filter((t) => !t.revealed).map((t) => t.word.toUpperCase());
    const word = pickClueWord(target.word, hidden);
    if (!word) return null;
    // count 1 == exactly one intended agent; always within 1..remaining.
    return { t: 'clue', word, count: 1 };
  }

  botGuess(view, rng) {
    const clue = view.clue;
    if (!clue) return null;
    // Stop once we have made our allotted (safe) number of guesses — but the
    // engine requires at least one guess before stopping is legal.
    if (clue.guessesMade >= Math.max(1, clue.count)) return { t: 'stop' };
    const hidden = view.board.filter((t) => !t.revealed);
    if (!hidden.length) return null;
    // No key visible to an operative, so every hidden tile is equally unknown:
    // pick one at random. (An LLM would score tiles against the clue here.)
    const pick = hidden[Math.floor(rng() * hidden.length)];
    return { t: 'guess', index: pick.i };
  }
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// A tiny built-in association map (board word -> a thematically related clue).
// Purely cosmetic: every candidate is still run through isCleanClue below, and
// unsafe ones fall through to the themed fillers / guaranteed-unique fallback.
const CLUE_MAP = {
  APPLE: 'FRUIT', BANANA: 'FRUIT', LEMON: 'FRUIT', PUMPKIN: 'HARVEST',
  EAGLE: 'BIRD', FALCON: 'BIRD', RAVEN: 'BIRD', ROBIN: 'BIRD', HAWK: 'BIRD',
  CONDOR: 'BIRD', HERON: 'BIRD', PIGEON: 'BIRD', OWL: 'BIRD',
  DOLPHIN: 'OCEAN', LOBSTER: 'OCEAN', OYSTER: 'OCEAN', CORAL: 'OCEAN', REEF: 'OCEAN',
  DRAGON: 'MYTH', UNICORN: 'MYTH', PHANTOM: 'MYTH', WIZARD: 'MAGIC', POTION: 'MAGIC',
  CASTLE: 'ROYAL', PALACE: 'ROYAL', CROWN: 'ROYAL', THRONE: 'ROYAL', MONARCH: 'ROYAL',
  ROCKET: 'SPACE', GALAXY: 'SPACE', METEOR: 'SPACE', COMET: 'SPACE', ZODIAC: 'SPACE',
  DIAMOND: 'GEM', CRYSTAL: 'GEM', GARNET: 'GEM', QUARTZ: 'GEM', PRISM: 'GEM',
  CAMEL: 'DESERT', CACTUS: 'DESERT', OASIS: 'DESERT', DAGGER: 'BLADE', TRIDENT: 'WEAPON',
  GUITAR: 'MUSIC', TRUMPET: 'MUSIC', FIDDLE: 'MUSIC', DRUMMER: 'MUSIC',
  VOLCANO: 'ERUPT', GLACIER: 'FROZEN', FROST: 'FROZEN', TUNDRA: 'FROZEN',
  ANCHOR: 'NAUTICAL', HARBOR: 'NAUTICAL', VESSEL: 'NAUTICAL', RUDDER: 'NAUTICAL',
};

// Themed spy-flavored fillers — none of these appear in the word pool. Tried in
// order after the association map; the first one that passes validation wins.
const CLUE_FILLERS = [
  'MISSION', 'DECODE', 'ENCRYPT', 'INTEL', 'DOSSIER', 'AGENCY', 'HANDLER',
  'PROTOCOL', 'TRANSMIT', 'FREQUENCY', 'ENIGMA', 'SLEEPER', 'STAKEOUT',
  'BRIEFING', 'COVERT', 'CLEARANCE', 'INFILTRATE', 'SURVEILLANCE',
];

// A clue is legal for this engine iff it is a single alphabetic token (with an
// optional single hyphen/apostrophe), <=20 chars, and not equal to any hidden
// board word. We additionally forbid substring/superstring overlap with any
// board word so the bot's clue is never a giveaway or an accidental match.
function isCleanClue(word, hiddenBoardWords) {
  if (!/^[a-zA-Z]+(?:[-'][a-zA-Z]+)?$/.test(word)) return false;
  if (word.length > 20) return false;
  const up = word.toUpperCase();
  for (const bw of hiddenBoardWords) {
    if (bw === up || bw.includes(up) || up.includes(bw)) return false;
  }
  return true;
}

function pickClueWord(targetWord, hiddenBoardWords) {
  const candidates = [CLUE_MAP[targetWord.toUpperCase()], ...CLUE_FILLERS];
  for (const c of candidates) if (c && isCleanClue(c, hiddenBoardWords)) return c;
  // Guaranteed-unique fallback: a token that cannot collide with any board word.
  let w = 'CIPHERX';
  while (!isCleanClue(w, hiddenBoardWords)) w += 'X';
  return w;
}
