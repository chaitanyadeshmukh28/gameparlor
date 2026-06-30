import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';
import { Game } from './game.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3004; // The Council owns 3004 — never 3001.

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

const VOTE_TIMEOUT_MS = 45000; // a silent member cannot stall the chamber past this

// Arm a one-shot ballot timeout while a vote is open; clear it otherwise.
function armTimers(code) {
  const room = rooms.get(code);
  if (!room) return;
  const g = room.game;
  if (g.phase === 'vote') {
    if (!room.voteTimer) {
      room.voteTimer = setTimeout(() => {
        room.voteTimer = null;
        if (rooms.get(code)?.game.phase === 'vote') { g.ballotTimeout(); broadcast(code); }
      }, VOTE_TIMEOUT_MS);
    }
  } else if (room.voteTimer) {
    clearTimeout(room.voteTimer);
    room.voteTimer = null;
  }
}

function broadcast(code) {
  const room = rooms.get(code);
  if (!room) return;
  for (const [pid, sock] of room.sockets) send(sock, { t: 'state', state: room.game.viewFor(pid) });
  armTimers(code);
}

function cleanup(code) {
  const room = rooms.get(code);
  if (room && !room.game.players.some((p) => p.connected)) {
    if (room.voteTimer) clearTimeout(room.voteTimer);
    rooms.delete(code);
  }
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
          rooms.set(code, { game: new Game(code), sockets: new Map() });
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

    function guard(rm, fn) {
      if (!rm) return send(ws, { t: 'error', message: 'You are not in a game.' });
      const res = fn();
      if (res && res.error) return send(ws, { t: 'error', message: res.error });
      broadcast(ws.meta.code);
    }
  });

  ws.on('close', () => handleLeave(ws));
});

function attach(ws, code, name, token) {
  const room = rooms.get(code);
  const player = room.game.addPlayer(randomUUID(), name, token);
  if (!player || player.error) {
    const reason = player && player.error;
    const message =
      reason === 'seat-occupied' ? 'That seat is still connected — close the other tab to reclaim it.'
      : reason === 'bad-token'   ? 'Cannot reclaim that seat (no valid token on this device).'
      : room.game.phase === 'lobby' ? 'That name is taken or the room is full.'
      : 'Cannot join — the game is in progress and that name is unknown.';
    return send(ws, { t: 'error', message });
  }
  ws.meta = { code, playerId: player.id };
  // Rebind the socket to the player's (stable) id — replaces any prior socket.
  room.sockets.set(player.id, ws);
  // The per-seat token lets this device reclaim the seat after a drop/reload.
  send(ws, { t: 'joined', code, you: player.id, token: player.token });
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
