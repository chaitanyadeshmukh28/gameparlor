import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';
import { Game } from './game.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
const dist = path.join(__dirname, '..', 'dist');
app.use(express.static(dist));
app.get('/healthz', (_req, res) => res.send('ok'));

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

/** code -> { game: Game, sockets: Map<playerId, ws> } */
const rooms = new Map();

const makeCode = () => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code;
  do { code = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join(''); }
  while (rooms.has(code));
  return code;
};

const send = (ws, obj) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); };

function broadcast(code) {
  const room = rooms.get(code);
  if (!room) return;
  for (const [pid, sock] of room.sockets) send(sock, { t: 'state', state: room.game.viewFor(pid) });
}

function cleanup(code) {
  const room = rooms.get(code);
  if (room && !room.game.players.some((p) => p.connected)) rooms.delete(code);
}

wss.on('connection', (ws) => {
  ws.meta = { code: null, playerId: null };

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const room = ws.meta.code ? rooms.get(ws.meta.code) : null;

    try {
      switch (msg.t) {
        case 'create': {
          const name = (msg.name || '').trim().slice(0, 16);
          if (!name) return send(ws, { t: 'error', message: 'Enter a name first.' });
          const code = makeCode();
          const game = new Game(code);
          // Let the engine push state on its own (e.g. when the round timer fires).
          game.broadcast = () => broadcast(code);
          rooms.set(code, { game, sockets: new Map() });
          attach(ws, code, name);
          break;
        }
        case 'join': {
          const name = (msg.name || '').trim().slice(0, 16);
          const code = (msg.code || '').trim().toUpperCase();
          if (!name) return send(ws, { t: 'error', message: 'Enter a name first.' });
          if (!rooms.has(code)) return send(ws, { t: 'error', message: 'No game with that code.' });
          attach(ws, code, name);
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

    function guard(rm, fn) {
      if (!rm) return send(ws, { t: 'error', message: 'You are not in a game.' });
      const res = fn();
      if (res && res.error) return send(ws, { t: 'error', message: res.error });
      broadcast(ws.meta.code);
    }
  });

  ws.on('close', () => handleLeave(ws));
});

function attach(ws, code, name) {
  const room = rooms.get(code);
  const player = room.game.addPlayer(randomUUID(), name);
  if (!player) {
    return send(ws, { t: 'error', message: room.game.phase === 'lobby'
      ? 'That name is taken or the room is full.'
      : 'Cannot join — the game is in progress and that name is unknown.' });
  }
  ws.meta = { code, playerId: player.id };
  room.sockets.set(player.id, ws);
  send(ws, { t: 'joined', code, you: player.id });
  broadcast(code);
}

function handleLeave(ws) {
  const { code, playerId } = ws.meta;
  if (!code || !rooms.has(code)) return;
  const room = rooms.get(code);
  room.sockets.delete(playerId);
  room.game.removePlayer(playerId);
  ws.meta = { code: null, playerId: null };
  broadcast(code);
  cleanup(code);
}

// SPA fallback.
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));

server.listen(PORT, () => console.log(`${process.env.GAME_NAME || 'Game'} running on :${PORT}`));
