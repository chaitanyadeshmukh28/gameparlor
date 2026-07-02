import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameSocket } from './net.js';
import { Crest, Candle, WaxSeal } from './lib.jsx';
import Game from './Game.jsx';

export default function App() {
  const net = useGameSocket();
  const { state, you } = net;
  useEffect(() => { if (typeof window !== 'undefined') { window.__code = net.code; window.__phase = state?.phase; } }, [net.code, state?.phase]);
  if (!state || !you) return <Landing net={net} />;
  if (state.phase === 'lobby') return <Lobby net={net} />;
  return <Game net={net} />;
}

function Landing({ net }) {
  const { create, join, status, error } = net;
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('create');
  const ready = name.trim() && (mode === 'create' || code.length === 4);
  const go = () => (mode === 'create' ? create(name.trim()) : join(name.trim(), code));

  return (
    <div className="relative min-h-[100dvh] grid place-items-center p-6">
      <CandleRow />
      <motion.div
        className="panel relative w-full max-w-sm p-6 space-y-5"
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      >
        <div className="text-center space-y-2">
          <motion.div className="flex justify-center"
            initial={{ rotate: -8, scale: 0.8, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.15 }}>
            <Crest size={64} />
          </motion.div>
          <h1 className="font-display text-4xl font-bold tracking-[0.12em] text-brass-bright">THE COUNCIL</h1>
          <p className="eyebrow">Liberals, Fascists &amp; a hidden Hitler · 5–10 players</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {['create', 'join'].map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`rounded-md py-2 text-sm font-semibold capitalize transition ${
                mode === m ? 'bg-brass/20 text-brass-bright ring-1 ring-brass/40' : 'bg-white/5 text-parch/60'
              }`}>
              {m === 'create' ? 'Convene' : 'Join'}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <Field label="Your name">
            <input className="field" placeholder="e.g. Wren" maxLength={16} value={name}
              onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ready && go()} />
          </Field>
          <AnimatePresence>
            {mode === 'join' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <Field label="Chamber code">
                  <input className="field tracking-[0.4em] uppercase font-mono" placeholder="ABCD" maxLength={4} value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && ready && go()} />
                </Field>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button className="btn-brass w-full" disabled={!ready} onClick={go}>
          {mode === 'create' ? 'Open the chamber' : 'Take your seat'}
        </button>
        <p className="text-center text-xs text-parch-faint min-h-[1rem]">
          {status === 'open' ? '' : 'Connecting…'} {error?.message}
        </p>
      </motion.div>
      <style>{fieldCSS}</style>
    </div>
  );
}

function Lobby({ net }) {
  const { state, code, send } = net;
  const enough = state.players.length >= state.minPlayers;
  return (
    <div className="relative min-h-[100dvh] grid place-items-center p-6">
      <CandleRow />
      <motion.div className="panel relative w-full max-w-md p-6 space-y-5"
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center">
          <div className="eyebrow">Chamber code</div>
          <div className="font-display text-5xl font-bold tracking-[0.28em] text-brass-bright">{code}</div>
          <p className="text-sm text-parch/60 mt-1">Share it. Seats {state.players.length}/{state.maxPlayers}.</p>
        </div>

        <ul className="space-y-2">
          <AnimatePresence>
            {state.players.map((p, i) => (
              <motion.li key={p.id}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 rounded-lg border border-brass/15 bg-black/20 px-3 py-2">
                <WaxSeal size={26} tone={p.id === state.you ? '#c9a86a' : '#7a3530'}>
                  <text x="0" y="4" textAnchor="middle" fontSize="13" fill="rgba(0,0,0,0.5)" stroke="none"
                    fontFamily="Cinzel, serif">{p.name[0]?.toUpperCase()}</text>
                </WaxSeal>
                <span className="font-body text-lg">{p.name}{p.id === state.you && <span className="text-brass-dim text-sm"> · you</span>}</span>
                {p.isBot && <span className="text-[0.6rem] uppercase tracking-wider text-brass-bright/85 border border-brass/40 rounded px-1.5 py-0.5">AI</span>}
                <span className="ml-auto flex items-center gap-2">
                  {p.id === state.players[0]?.id && <span className="eyebrow">host</span>}
                  {p.isBot && state.isHost && (
                    <button onClick={() => send({ t: 'removeBot', id: p.id })}
                      className="text-parch-faint hover:text-wax transition" title="Remove AI player">✕</button>
                  )}
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {state.isHost ? (
          <>
            {state.players.length < state.maxPlayers && (
              <button className="btn-ghost w-full" onClick={() => send({ t: 'addBot' })}>
                + Add AI player
              </button>
            )}
            <button className="btn-brass w-full" disabled={!enough} onClick={() => send({ t: 'start' })}>
              Convene the Council
            </button>
            {!enough && <p className="text-center text-xs text-parch-faint">Need at least {state.minPlayers} members seated.</p>}
          </>
        ) : (
          <p className="text-center text-sm text-parch/60">Waiting for the host to convene…</p>
        )}
      </motion.div>
      <style>{fieldCSS}</style>
    </div>
  );
}

const Field = ({ label, children }) => (
  <label className="block space-y-1">
    <span className="eyebrow">{label}</span>
    {children}
  </label>
);

function CandleRow() {
  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 flex justify-between px-6 opacity-70">
      {[0, 1, 2, 3].map((i) => (
        <motion.div key={i} animate={{ opacity: [0.7, 1, 0.8, 1] }}
          transition={{ duration: 2 + i * 0.3, repeat: Infinity, repeatType: 'mirror' }}>
          <Candle size={22 + (i % 2) * 6} />
        </motion.div>
      ))}
    </div>
  );
}

const fieldCSS = `
.field {
  width: 100%;
  border-radius: 0.5rem;
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(201,168,106,0.22);
  padding: 0.6rem 0.75rem;
  color: #ece3cf;
  font-family: "EB Garamond", serif;
  font-size: 1.05rem;
}
.field::placeholder { color: rgba(143,135,111,0.7); }
.field:focus { outline: 2px solid #e8d49a; outline-offset: 1px; }
`;
