// Auto-reconnecting WebSocket client. Server is authoritative; we send intents
// and render whatever state arrives. Same shape across every Parlor game.
import { useCallback, useEffect, useRef, useState } from 'react';

const wsURL = () => `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${import.meta.env.BASE_URL}ws`;

// Per-seat reclaim token, persisted per room code so a reload/drop can rejoin.
const tokenKey = (code) => `council:token:${(code || '').toUpperCase()}`;
const loadToken = (code) => { try { return localStorage.getItem(tokenKey(code)); } catch { return null; } };
const saveToken = (code, token) => { try { if (code && token) localStorage.setItem(tokenKey(code), token); } catch { /* ignore */ } };

export function useGameSocket() {
  const [status, setStatus] = useState('connecting'); // connecting | open | closed
  const [state, setState] = useState(null);
  const [you, setYou] = useState(null);
  const [code, setCode] = useState(null);
  const [error, setError] = useState(null);
  const ws = useRef(null);
  const queue = useRef([]);
  const rejoin = useRef(null);

  const connect = useCallback(() => {
    const sock = new WebSocket(wsURL());
    ws.current = sock;
    sock.onopen = () => {
      setStatus('open');
      queue.current.forEach((m) => sock.send(JSON.stringify(m)));
      queue.current = [];
      if (rejoin.current?.code) {
        const token = rejoin.current.token ?? loadToken(rejoin.current.code);
        sock.send(JSON.stringify({ t: 'join', ...rejoin.current, token }));
      }
    };
    sock.onclose = () => { setStatus('closed'); setTimeout(connect, 1200); };
    sock.onerror = () => sock.close();
    sock.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.t === 'joined') {
        setYou(msg.you); setCode(msg.code);
        saveToken(msg.code, msg.token);
        rejoin.current = { name: rejoin.current?.name, code: msg.code, token: msg.token ?? loadToken(msg.code) };
      }
      else if (msg.t === 'state') setState(msg.state);
      else if (msg.t === 'error') setError({ message: msg.message, at: Date.now() });
    };
  }, []);

  useEffect(() => { connect(); return () => ws.current?.close(); }, [connect]);

  const send = useCallback((obj) => {
    if (ws.current && ws.current.readyState === 1) ws.current.send(JSON.stringify(obj));
    else queue.current.push(obj);
  }, []);

  const create = useCallback((name) => { rejoin.current = { name }; send({ t: 'create', name }); }, [send]);
  const join = useCallback((name, code) => {
    const c = (code || '').toUpperCase();
    const token = loadToken(c);
    rejoin.current = { name, code: c, token };
    send({ t: 'join', name, code: c, token });
  }, [send]);

  return { status, state, you, code, error, send, create, join };
}
