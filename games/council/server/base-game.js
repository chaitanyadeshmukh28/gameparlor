// BaseGame — shared lobby / room / player / reconnect plumbing for every game.
// Subclass it in server/game.js and implement: setup(), handleMessage(),
// gameView(), and optionally cleanup() / onPlayerDisconnected().
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
  // Returns the player on success, `null` for a soft refusal (name taken / room
  // full / unknown seat), or `{ error }` for a refused reconnect that should be
  // surfaced to the user (seat occupied / bad token).
  addPlayer(id, name, token) {
    if (this.phase !== 'lobby') {
      // Reconnect by name to resume a seat mid-game.
      const existing = this.players.find((p) => p.name.toLowerCase() === name.toLowerCase());
      if (!existing) return null;
      // A still-connected seat may not be reclaimed (prevents seat hijack / role leak).
      if (existing.connected) return { error: 'seat-occupied' };
      // The secret per-seat token authorises the reclaim.
      if (!token || token !== existing.token) return { error: 'bad-token' };
      // IMPORTANT: keep `existing.id` STABLE. Every positional reference the
      // subclass captured (order/chairId/nominee/votes…) still points at this
      // id; reassigning it would soft-lock the table. The server rebinds the new
      // socket to this unchanged id instead.
      existing.connected = true;
      return existing;
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
      // Let the subclass re-evaluate any state that was waiting on this player
      // (e.g. resolve an election whose last outstanding voter just dropped).
      if (this.onPlayerDisconnected) this.onPlayerDisconnected(id);
    }
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
      players: this.players.map((p) => ({ id: p.id, name: p.name, connected: p.connected })),
      ...(this.gameView ? this.gameView(id) : {}),
      seq: this.seq,
    };
  }

  // ---- to implement in server/game.js ------------------------------------
  setup() { this.phase = 'play'; }                       // deal/init
  handleMessage(/* playerId, msg */) { return {}; }       // game actions
  gameView(/* id */) { return {}; }                       // redacted state
}
