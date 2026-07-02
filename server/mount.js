// Shared room manager for one game. Each mount owns an isolated set of rooms
// keyed by 4-letter code, a WebSocketServer in `noServer` mode (the unified
// server routes upgrades to it by path), and the connection/lobby plumbing.
// Every game's engine implements the same contract: addPlayer/removePlayer/
// viewFor/handleMessage/start/resetToLobby plus `players` and `phase`.
//
// AI players ("bots") are virtual seats the SERVER drives — they have no
// socket. The host adds them in the lobby ({t:'addBot'} / {t:'removeBot'}).
// After every state change we run a "bot tick": each bot is asked
// game.botDecide(view, rng) for its next move, which we apply on its behalf,
// looping (with a short human-visible delay) until no bot owes an action.
// botDecide sees only the bot's redacted view — the same seam an LLM would use.
import { WebSocketServer } from 'ws';
import { randomUUID } from 'crypto';

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
const BOT_NAMES = ['Ada', 'Turing', 'Nova', 'Echo', 'Pixel', 'Bishop', 'Vera', 'Jinx', 'Neo', 'Data'];
const BOT_DELAY = 850;   // ms between successive bot actions (readable pacing)
const BOT_MAX_STEPS = 400; // safety valve against a runaway botDecide loop
const send = (ws, obj) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); };

export function createGameMount(GameClass) {
  const wss = new WebSocketServer({ noServer: true });
  /** code -> { game, sockets: Map<playerId, ws>, botTimer, botSteps } */
  const rooms = new Map();

  const makeCode = () => {
    let code;
    do { code = Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join(''); }
    while (rooms.has(code));
    return code;
  };

  function broadcast(code) {
    const room = rooms.get(code);
    if (!room) return;
    for (const [pid, sock] of room.sockets) send(sock, { t: 'state', state: room.game.viewFor(pid) });
    scheduleBots(code);
  }

  // Only humans keep a room alive; a room of only-bots (or nobody) is dropped.
  function cleanup(code) {
    const room = rooms.get(code);
    if (room && !room.game.players.some((p) => p.connected && !p.isBot)) {
      if (room.botTimer) clearTimeout(room.botTimer);
      rooms.delete(code);
    }
  }

  function freeBotName(game) {
    const taken = new Set(game.players.map((p) => p.name.toLowerCase()));
    const pick = BOT_NAMES.find((n) => !taken.has(n.toLowerCase()));
    if (pick) return pick;
    let i = 2, name;
    do { name = `Bot ${i++}`; } while (taken.has(name.toLowerCase()));
    return name;
  }

  // Drive bots one action at a time so humans can follow the play.
  function scheduleBots(code) {
    const room = rooms.get(code);
    if (!room) return;
    const game = room.game;
    if (room.botTimer) return;                                  // a tick is already pending
    if (game.phase === 'lobby' || typeof game.botDecide !== 'function') return;
    if (!game.players.some((p) => p.isBot)) return;
    room.botTimer = setTimeout(() => {
      room.botTimer = null;
      if (!rooms.has(code)) return;
      if ((room.botSteps = (room.botSteps || 0) + 1) > BOT_MAX_STEPS) return;
      let acted = false;
      for (const bot of game.players.filter((p) => p.isBot)) {
        let action = null;
        try { action = game.botDecide(game.viewFor(bot.id), Math.random); }
        catch (err) { console.error('botDecide error', err); }
        if (!action) continue;
        const res = game.handleMessage(bot.id, action);
        if (res && res.error) continue;                        // illegal — skip this bot
        acted = true;
        break;                                                 // one action per tick
      }
      if (acted) broadcast(code);                              // re-broadcast + re-schedule
    }, BOT_DELAY);
  }

  function attach(ws, code, name, token) {
    const room = rooms.get(code);
    const player = room.game.addPlayer(randomUUID(), name, token);
    if (!player) {
      return send(ws, { t: 'error', message: room.game.phase === 'lobby'
        ? 'That name is taken or the room is full.'
        : 'Cannot rejoin — that seat is held by someone online, or this device is not its original owner.' });
    }
    ws.meta = { code, playerId: player.id };
    room.sockets.set(player.id, ws);
    send(ws, { t: 'joined', code, you: player.id, token: player.token });
    broadcast(code);
  }

  function handleLeave(ws) {
    const { code, playerId } = ws.meta || {};
    if (!code || !rooms.has(code)) return;
    const room = rooms.get(code);
    room.sockets.delete(playerId);
    room.game.removePlayer(playerId);
    ws.meta = { code: null, playerId: null };
    broadcast(code);
    cleanup(code);
  }

  wss.on('connection', (ws) => {
    ws.meta = { code: null, playerId: null };

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      const room = ws.meta.code ? rooms.get(ws.meta.code) : null;
      if (room) room.botSteps = 0;                             // reset safety valve on human input

      const guard = (rm, fn) => {
        if (!rm) return send(ws, { t: 'error', message: 'You are not in a game.' });
        const res = fn();
        if (res && res.error) return send(ws, { t: 'error', message: res.error });
        broadcast(ws.meta.code);
      };

      const hostOnly = (rm, fn) => guard(rm, () => {
        if (rm.game.hostId !== ws.meta.playerId) return { error: 'Only the host can do that.' };
        return fn();
      });

      try {
        switch (msg.t) {
          case 'create': {
            const name = (msg.name || '').trim().slice(0, 16);
            if (!name) return send(ws, { t: 'error', message: 'Enter a name first.' });
            const code = makeCode();
            rooms.set(code, { game: new GameClass(code), sockets: new Map() });
            attach(ws, code, name);
            break;
          }
          case 'join': {
            const name = (msg.name || '').trim().slice(0, 16);
            const code = (msg.code || '').trim().toUpperCase();
            if (!name) return send(ws, { t: 'error', message: 'Enter a name first.' });
            if (!rooms.has(code)) return send(ws, { t: 'error', message: 'No game with that code.' });
            attach(ws, code, name, msg.token);
            break;
          }
          case 'addBot':    hostOnly(room, () => {
            if (typeof room.game.addBot !== 'function') return { error: 'This game has no AI players yet.' };
            return room.game.addBot(freeBotName(room.game)) ? {} : { error: 'Cannot add a bot (room full or game started).' };
          }); break;
          case 'removeBot': hostOnly(room, () => room.game.removeBot?.(msg.id) ? {} : { error: 'Cannot remove that bot.' }); break;
          case 'start':     guard(room, () => room.game.start(ws.meta.playerId)); break;
          case 'restart':   guard(room, () => room.game.resetToLobby(ws.meta.playerId)); break;
          case 'leave':     handleLeave(ws); break;
          default:          guard(room, () => room.game.handleMessage(ws.meta.playerId, msg)); break;
        }
      } catch (err) {
        send(ws, { t: 'error', message: 'Something went wrong on the server.' });
        console.error(err);
      }
    });

    ws.on('close', () => handleLeave(ws));
  });

  return { wss, rooms };
}
