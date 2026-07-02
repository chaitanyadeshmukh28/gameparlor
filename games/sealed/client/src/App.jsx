// Sealed — rococo romance built on Love Letter mechanics. Landing → Lobby → Table.
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameSocket } from './net.js';
import Table from './components/Table.jsx';
import { RulesButton } from './components/RulesSheet.jsx';
import Letter from './components/Letter.jsx';
import { SealMark } from './cards.jsx';

export default function App() {
  const { status, state, you, code, error, create, join, send } = useGameSocket();
  if (!state || !you) return <Landing onCreate={create} onJoin={join} status={status} error={error} />;
  if (state.phase === 'lobby') return <Lobby state={state} code={code} send={send} />;
  return <Table state={state} code={code} send={send} error={error} />;
}

function Landing({ onCreate, onJoin, status, error }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('create');
  const go = () => (mode === 'create' ? onCreate(name.trim()) : onJoin(name.trim(), code));
  const ready = name.trim() && (mode === 'create' || code.length === 4);

  return (
    <div className="salon-bg relative z-0 min-h-[100dvh] grid place-items-center p-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-6">
          <motion.div initial={{ rotateY: 180, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.1 }}
            className="mx-auto mb-3 w-fit">
            <Letter rank={8} faceUp size="md" />
          </motion.div>
          <p className="eyebrow mb-1">a parlor of letters</p>
          <h1 className="font-display text-6xl font-bold gilt-text leading-none">Sealed</h1>
          <p className="text-rose-faint mt-2 text-sm italic">Secrets, duels, and one perilous letter.</p>
        </div>

        <div className="panel p-5 space-y-3">
          <div className="flex gap-2">
            {['create', 'join'].map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 rounded-full py-2 text-sm capitalize transition ${mode === m ? 'bg-rose/20 text-blush border border-rose/40' : 'bg-plum-deep/50 text-rose-faint border border-transparent'}`}>
                {m === 'create' ? 'Host a salon' : 'Join a salon'}
              </button>
            ))}
          </div>
          <input className="field" placeholder="Your name" maxLength={16} value={name}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ready && go()} />
          {mode === 'join' && (
            <input className="field uppercase tracking-[0.3em] text-center" placeholder="CODE" maxLength={4} value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && ready && go()} />
          )}
          <button className="btn-gilt w-full" disabled={!ready} onClick={go}>
            {mode === 'create' ? 'Open the salon' : 'Slip inside'}
          </button>
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-rose-faint">{status === 'open' ? 'Connected.' : 'Connecting…'} {error?.message}</p>
            <RulesButton />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Lobby({ state, code, send }) {
  const enough = state.players.length >= state.minPlayers;
  const full = state.players.length >= state.maxPlayers;
  return (
    <div className="salon-bg relative z-0 min-h-[100dvh] grid place-items-center p-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md panel p-6 space-y-5">
        <div className="text-center">
          <p className="eyebrow mb-1">Invitation code</p>
          <div className="font-display text-5xl font-bold tracking-[0.3em] gilt-text">{code}</div>
          <p className="text-rose-faint text-sm mt-1">Share it — {state.minPlayers}–{state.maxPlayers} courtiers may attend.</p>
        </div>

        <ul className="space-y-1.5">
          {state.players.map((p, i) => (
            <motion.li key={p.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-xl bg-plum-deep/40 border border-rose/10 px-3 py-2">
              <span className="grid place-items-center w-7 h-7 rounded-full bg-rose/15 text-blush font-display font-bold">{p.name[0]?.toUpperCase()}</span>
              <span className="text-cream">{p.name}{p.id === state.you && <span className="text-rose-faint"> (you)</span>}</span>
              {p.isBot && <span className="text-[0.5rem] uppercase tracking-[0.15em] text-gilt/90 border border-gilt/35 rounded px-1.5 py-0.5">AI</span>}
              <span className="ml-auto flex items-center gap-2">
                {p.id === state.players[0]?.id && <span className="eyebrow !text-[0.5rem]">host</span>}
                {p.isBot && state.isHost && (
                  <button onClick={() => send({ t: 'removeBot', id: p.id })}
                    className="text-rose-faint hover:text-wax transition text-sm leading-none" title="Dismiss this AI courtier">✕</button>
                )}
              </span>
            </motion.li>
          ))}
          {Array.from({ length: Math.max(0, state.minPlayers - state.players.length) }).map((_, i) => (
            <li key={`e${i}`} className="rounded-xl border border-dashed border-rose/15 px-3 py-2 text-rose-faint/60 text-sm italic">an empty chaise…</li>
          ))}
        </ul>

        {state.isHost ? (
          <div className="space-y-2">
            {!full && (
              <button className="btn-ghost w-full" onClick={() => send({ t: 'addBot' })}>
                + Add AI player
              </button>
            )}
            <button className="btn-gilt w-full" disabled={!enough} onClick={() => send({ t: 'start' })}>
              {enough ? 'Begin the soirée' : `Need ${state.minPlayers - state.players.length} more`}
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-rose-faint flex items-center justify-center gap-2">
            <SealMark className="w-3.5 h-3.5 text-gilt" /> Waiting for the host to begin…
          </p>
        )}
        <div className="flex justify-center"><RulesButton /></div>
      </motion.div>
    </div>
  );
}
