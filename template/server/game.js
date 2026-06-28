// PLACEHOLDER game engine — replace this with your game's rules.
// It shows the BaseGame contract: setup(), handleMessage(), gameView(), cleanup().
import { BaseGame } from './base-game.js';

export class Game extends BaseGame {
  constructor(code) {
    super(code);
    this.minPlayers = 2;
    this.maxPlayers = 8;
  }

  // Called when the host starts. Deal/init here and set the first phase.
  setup() {
    for (const p of this.players) { p.score = 0; p.secret = Math.floor(Math.random() * 100); }
    this.phase = 'play';
    this.note('The game begins.');
  }

  // Every non-lobby client message lands here. Validate, mutate, return {error} if bad.
  handleMessage(playerId, msg) {
    const me = this.byId(playerId);
    if (!me) return { error: 'Unknown player.' };
    if (msg.t === 'tap' && this.phase === 'play') {
      me.score = (me.score || 0) + 1;
      if (me.score >= 5) { this.phase = 'over'; this.winnerId = playerId; this.note(`${me.name} wins.`); }
      return {};
    }
    return { error: 'Unknown action.' };
  }

  // Per-player, redacted view. Reveal secrets only to their owner.
  gameView(id) {
    return {
      winnerId: this.winnerId ?? null,
      scores: this.players.map((p) => ({ id: p.id, name: p.name, score: p.score || 0 })),
      yourSecret: this.byId(id)?.secret ?? null, // only you ever see this
    };
  }

  cleanup() { this.winnerId = null; }
}
