// BaseGame — shared lobby / room / player / reconnect plumbing for every game.
// Subclass it in server/game.js and implement: setup(), handleMessage(),
// gameView(), and optionally cleanup().

import { randomUUID } from 'crypto';

export class BaseGame {
  constructor(code) {
    this.code = code;
    this.phase = 'lobby';      // 'lobby' until setup() moves it on
    this.players = [];         // { id, name, connected, ...your fields }
    this.hostId = null;
    this.log = [];
    this.seq = 0;
    this.minPlayers = 2;
    this.maxPlayers = 10;
  }

  // ---- player / lobby management (handled for you) -----------------------
  // Each seat carries a private `token`, handed to the client at join time and
  // required to reclaim that seat on a mid-game reconnect — so a stranger who
  // merely knows your display name + the room code can't hijack your seat (and
  // your secret role with it).
  addPlayer(id, name, token) {
    if (this.phase !== 'lobby') {
      // Reconnect by name to resume a seat mid-game — only the original owner
      // (matching token) may reclaim a seat that is currently disconnected.
      const existing = this.players.find((p) => p.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        if (existing.connected) return null;                 // still online — treat as "name taken"
        if (!existing.token || existing.token !== token) return null; // wrong/absent token — reject
        existing.id = id; existing.connected = true;
        return existing;
      }
      return null;
    }
    if (this.players.length >= this.maxPlayers) return null;
    if (this.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) return null;
    const p = { id, name, connected: true, token: randomUUID() };
    this.players.push(p);
    if (!this.hostId) this.hostId = id;
    this.note(`${name} joined.`);
    return p;
  }

  removePlayer(id) {
    const p = this.byId(id);
    if (!p) return;
    if (this.phase === 'lobby') {
      this.players = this.players.filter((x) => x.id !== id);
      if (this.hostId === id) this.hostId = this.players[0]?.id ?? null;
    } else {
      p.connected = false; // keep their seat; they can rejoin by name + token
      // Migrate the host to a still-connected player so the room never strands
      // (e.g. nobody able to "Play again" at the result screen).
      if (this.hostId === id) this.hostId = this.players.find((x) => x.connected)?.id ?? this.hostId;
    }
  }

  addBot(name) {
    if (this.phase !== 'lobby') return null;
    if (this.players.length >= this.maxPlayers) return null;
    if (this.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) return null;
    const p = { id: 'bot-' + Math.random().toString(36).slice(2, 10), name, connected: true, isBot: true, token: null };
    this.players.push(p);
    if (!this.hostId) this.hostId = p.id;
    this.note(`${name} joined.`);
    return p;
  }

  removeBot(id) {
    const p = this.byId(id);
    if (!p || !p.isBot || this.phase !== 'lobby') return null;
    this.players = this.players.filter((x) => x.id !== id);
    return p;
  }

  start(id) {
    if (id !== this.hostId) return { error: 'Only the host can start the game.' };
    if (this.phase !== 'lobby') return { error: 'The game has already started.' };
    if (this.players.length < this.minPlayers) return { error: `Need at least ${this.minPlayers} players.` };
    const res = this.setup();
    if (res && res.error) return res;
    return {};
  }

  resetToLobby(id) {
    if (id !== this.hostId) return { error: 'Only the host can return to the lobby.' };
    this.phase = 'lobby';
    this.players = this.players.filter((p) => p.connected);
    if (this.cleanup) this.cleanup();
    this.note('Back to the lobby.');
    return {};
  }

  // ---- helpers -----------------------------------------------------------
  byId(id) { return this.players.find((p) => p.id === id); }
  note(text) { this.log.push({ text, ts: this.seq }); if (this.log.length > 200) this.log.shift(); }

  // ---- per-player view ---------------------------------------------------
  // Merges generic lobby state with your gameView(). Override gameView, not this.
  viewFor(id) {
    this.seq++;
    return {
      code: this.code,
      phase: this.phase,
      you: id,
      isHost: this.hostId === id,
      minPlayers: this.minPlayers,
      maxPlayers: this.maxPlayers,
      log: this.log.slice(-40),
      // generic public player list; add private fields in gameView if needed
      players: this.players.map((p) => ({ id: p.id, name: p.name, connected: p.connected, isBot: !!p.isBot })),
      ...(this.gameView ? this.gameView(id) : {}),
      seq: this.seq,
    };
  }

  // ---- to implement in server/game.js ------------------------------------
  setup() { this.phase = 'play'; }                       // deal/init
  handleMessage(/* playerId, msg */) { return {}; }       // game actions
  gameView(/* id */) { return {}; }                       // redacted state
}
