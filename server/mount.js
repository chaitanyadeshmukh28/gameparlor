// Shared room manager for one game. Each mount owns an isolated set of rooms
// keyed by 4-letter code, a WebSocketServer in `noServer` mode (the unified
// server routes upgrades to it by path), and the connection/lobby plumbing.
// Every game's engine implements the same contract: addPlayer/removePlayer/
// viewFor/handleMessage/start/resetToLobby plus `players` and `phase`.
import { WebSocketServer } from 'ws';
import { randomUUID } from 'crypto';

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
const send = (ws, obj) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); };

export function createGameMount(GameClass) {
  const wss = new WebSocketServer({ noServer: true });
  /** code -> { game, sockets: Map<playerId, ws> } */
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
  }

  function cleanup(code) {
    const room = rooms.get(code);
    if (room && !room.game.players.some((p) => p.connected)) rooms.delete(code);
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

      const guard = (rm, fn) => {
        if (!rm) return send(ws, { t: 'error', message: 'You are not in a game.' });
        const res = fn();
        if (res && res.error) return send(ws, { t: 'error', message: res.error });
        broadcast(ws.meta.code);
      };

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
          case 'start':   guard(room, () => room.game.start(ws.meta.playerId)); break;
          case 'restart': guard(room, () => room.game.resetToLobby(ws.meta.playerId)); break;
          case 'leave':   handleLeave(ws); break;
          default:        guard(room, () => room.game.handleMessage(ws.meta.playerId, msg)); break;
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
