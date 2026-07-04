// Blackjack — "Lacquer & Bone" deco card room. Landing → Lobby → Table.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameSocket } from './net.js';
import Table from './components/Table.jsx';
import { RulesButton } from './components/RulesSheet.jsx';
import { Card, DecoMedallion } from './cards.jsx';
import { sfx } from './sfx.js';
import { MuteButton } from './components/MuteButton.jsx';

export default function App() {
  const { status, state, you, code, error, create, join, send } = useGameSocket();
  useEffect(() => { sfx.armOnGesture(); }, []);
  if (!state || !you) return <Landing onCreate={create} onJoin={join} status={status} error={error} />;
  if (state.phase === 'lobby') return <Lobby state={state} code={code} send={send} />;
  return <Table state={state} you={you} code={code} send={send} error={error} />;
}

function Wordmark({ className = '' }) {
  return (
    <div className={`relative w-fit mx-auto ${className}`}>
      <div className="absolute left-1/2 -translate-x-1/2 -top-16 text-brass/20">
        <DecoMedallion className="w-36 h-36" />
      </div>
      <h1 className="relative font-display text-[3.4rem] leading-none brass-text tracking-[0.06em]">Blackjack</h1>
    </div>
  );
}

function Landing({ onCreate, onJoin, status, error }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('create');
  const go = () => (mode === 'create' ? onCreate(name.trim()) : onJoin(name.trim(), code));
  const ready = name.trim() && (mode === 'create' || code.length === 4);

  return (
    <div className="lacquer-bg relative z-0 min-h-[100dvh] grid place-items-center p-6">
      <div className="absolute top-3 right-3"><MuteButton /></div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <motion.div initial={{ rotateY: 180, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 110, damping: 15, delay: 0.1 }}
            className="mx-auto mb-5 flex justify-center">
            <Card card={{ rank: 'A', suit: 'S' }} size="lg" />
            <Card card={{ rank: 'K', suit: 'H' }} size="lg" className="-ml-6 rotate-[8deg] mt-1" />
          </motion.div>
          <p className="eyebrow mb-2">the parlor · house of twenty-one</p>
          <Wordmark />
          <p className="text-sand mt-4 text-sm">Beat the house to 21. Read the count. Don’t bust.</p>
        </div>

        <div className="panel p-5 space-y-3">
          <div className="flex gap-2">
            {['create', 'join'].map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 rounded-full py-2 text-sm transition ${mode === m ? 'bg-brass/20 text-brass border border-brass/45' : 'bg-obsidian-deep/60 text-sand border border-transparent'}`}>
                {m === 'create' ? 'Host a table' : 'Join a table'}
              </button>
            ))}
          </div>
          <input className="field" placeholder="Your name" maxLength={16} value={name}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ready && go()} />
          {mode === 'join' && (
            <input className="field font-data uppercase tracking-[0.3em] text-center" placeholder="CODE" maxLength={4} value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && ready && go()} />
          )}
          <button className="btn-brass w-full" disabled={!ready} onClick={go}>
            {mode === 'create' ? 'Open the table' : 'Take a seat'}
          </button>
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-sand">{status === 'open' ? 'Connected.' : 'Connecting…'} {error?.message}</p>
            <RulesButton />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const TIME_CHOICES = [
  { v: 0, label: 'Off' },
  { v: 15, label: '15s' },
  { v: 20, label: '20s' },
  { v: 30, label: '30s' },
  { v: 45, label: '45s' },
];

function Lobby({ state, code, send }) {
  const enough = state.players.length >= state.minPlayers;
  const full = state.players.length >= state.maxPlayers;
  const turnSeconds = state.config?.turnSeconds ?? 20;
  return (
    <div className="lacquer-bg relative z-0 min-h-[100dvh] grid place-items-center p-6">
      <div className="absolute top-3 right-3"><MuteButton /></div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md panel p-6 space-y-5">
        <div className="text-center">
          <p className="eyebrow mb-1">Table code</p>
          <div className="font-data font-bold text-5xl tracking-[0.28em] brass-text">{code}</div>
          <p className="text-sand text-sm mt-1">Share it — up to {state.maxPlayers} at the table. Everyone starts with <span className="font-data text-brass">{state.config?.startChips ?? 500}</span> chips.</p>
        </div>

        <ul className="space-y-1.5">
          {state.players.map((p, i) => (
            <motion.li key={p.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-xl bg-obsidian-deep/60 border border-brass/12 px-3 py-2">
              <span className="grid place-items-center w-7 h-7 rounded-full bg-brass/15 text-brass font-display">{p.name[0]?.toUpperCase()}</span>
              <span className="text-bone">{p.name}{p.id === state.you && <span className="text-sand"> (you)</span>}</span>
              {p.isBot && <span className="text-[0.5rem] uppercase tracking-[0.15em] text-brass/90 border border-brass/35 rounded px-1.5 py-0.5">AI</span>}
              <span className="ml-auto flex items-center gap-2">
                {p.id === state.players[0]?.id && <span className="eyebrow !text-[0.5rem]">host</span>}
                {p.isBot && state.isHost && (
                  <button onClick={() => send({ t: 'removeBot', id: p.id })}
                    className="text-sand hover:text-vermillion transition text-sm leading-none" title="Remove this AI player">✕</button>
                )}
              </span>
            </motion.li>
          ))}
          {Array.from({ length: Math.max(0, state.minPlayers - state.players.length) }).map((_, i) => (
            <li key={`e${i}`} className="rounded-xl border border-dashed border-brass/15 px-3 py-2 text-sand/60 text-sm italic">an empty seat…</li>
          ))}
        </ul>

        {/* Host: per-turn clock */}
        <div className="rounded-xl bg-obsidian-deep/50 border border-brass/12 px-3 py-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="eyebrow">Turn clock</span>
            {!state.isHost && <span className="text-xs text-sand">{turnSeconds ? `${turnSeconds}s per turn` : 'no clock'}</span>}
          </div>
          {state.isHost ? (
            <div className="flex gap-1.5">
              {TIME_CHOICES.map((c) => (
                <button key={c.v} onClick={() => send({ t: 'config', turnSeconds: c.v })}
                  className={`seg flex-1 ${turnSeconds === c.v ? 'bg-brass/20 text-brass border-brass/50' : 'bg-walnut-raised/40 text-sand border-brass/15 hover:border-brass/30'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-sand/70">The host sets how long each player has to act.</p>
          )}
        </div>

        {state.isHost ? (
          <div className="space-y-2">
            {!full && (
              <button className="btn-ghost w-full" onClick={() => send({ t: 'addBot' })}>+ Add AI player</button>
            )}
            <button className="btn-brass w-full" disabled={!enough} onClick={() => send({ t: 'start' })}>
              {enough ? 'Start the game' : `Need ${state.minPlayers - state.players.length} more`}
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-sand">Waiting for the host to start…</p>
        )}
        <div className="flex justify-center"><RulesButton /></div>
      </motion.div>
    </div>
  );
}
