// Blackjack — art-deco casino built on classic 21. Landing → Lobby → Table.
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameSocket } from './net.js';
import Table from './components/Table.jsx';
import { RulesButton } from './components/RulesSheet.jsx';
import { Card, DecoFan } from './cards.jsx';

export default function App() {
  const { status, state, you, code, error, create, join, send } = useGameSocket();
  if (!state || !you) return <Landing onCreate={create} onJoin={join} status={status} error={error} />;
  if (state.phase === 'lobby') return <Lobby state={state} code={code} send={send} />;
  return <Table state={state} you={you} code={code} send={send} error={error} />;
}

function Wordmark() {
  return (
    <div className="relative w-fit mx-auto">
      <div className="absolute -inset-x-6 -top-8 text-gild/25 flex justify-center">
        <DecoFan className="w-40 h-20" />
      </div>
      <h1 className="relative font-display text-6xl leading-none gild-text tracking-wide">Blackjack</h1>
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
    <div className="felt-bg relative z-0 min-h-[100dvh] grid place-items-center p-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-7">
          <motion.div initial={{ rotateY: 180, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 15, delay: 0.1 }}
            className="mx-auto mb-4 flex justify-center gap-1">
            <Card card={{ rank: 'A', suit: 'S' }} size="md" />
            <Card card={{ rank: 'K', suit: 'H' }} size="md" className="-ml-4 rotate-6 mt-1" />
          </motion.div>
          <p className="eyebrow mb-2">the parlor · house of 21</p>
          <Wordmark />
          <p className="text-moss mt-3 text-sm">Beat the house. Break the bank. Bluff nobody — just don’t bust.</p>
        </div>

        <div className="panel p-5 space-y-3">
          <div className="flex gap-2">
            {['create', 'join'].map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 rounded-full py-2 text-sm capitalize transition ${mode === m ? 'bg-gild/20 text-gild border border-gild/45' : 'bg-felt-deep/50 text-moss border border-transparent'}`}>
                {m === 'create' ? 'Host a table' : 'Join a table'}
              </button>
            ))}
          </div>
          <input className="field" placeholder="Your name" maxLength={16} value={name}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ready && go()} />
          {mode === 'join' && (
            <input className="field uppercase tracking-[0.3em] text-center" placeholder="CODE" maxLength={4} value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && ready && go()} />
          )}
          <button className="btn-gild w-full" disabled={!ready} onClick={go}>
            {mode === 'create' ? 'Open the table' : 'Take a seat'}
          </button>
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-moss">{status === 'open' ? 'Connected.' : 'Connecting…'} {error?.message}</p>
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
    <div className="felt-bg relative z-0 min-h-[100dvh] grid place-items-center p-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md panel p-6 space-y-5">
        <div className="text-center">
          <p className="eyebrow mb-1">Table code</p>
          <div className="font-display text-5xl tracking-[0.3em] gild-text">{code}</div>
          <p className="text-moss text-sm mt-1">Share it — up to {state.maxPlayers} at the felt. Everyone starts with {state.config?.startChips ?? 500} chips.</p>
        </div>

        <ul className="space-y-1.5">
          {state.players.map((p, i) => (
            <motion.li key={p.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-xl bg-felt-deep/50 border border-gild/12 px-3 py-2">
              <span className="grid place-items-center w-7 h-7 rounded-full bg-gild/15 text-gild font-display">{p.name[0]?.toUpperCase()}</span>
              <span className="text-ivory">{p.name}{p.id === state.you && <span className="text-moss"> (you)</span>}</span>
              {p.isBot && <span className="text-[0.5rem] uppercase tracking-[0.15em] text-gild/90 border border-gild/35 rounded px-1.5 py-0.5">AI</span>}
              <span className="ml-auto flex items-center gap-2">
                {p.id === state.players[0]?.id && <span className="eyebrow !text-[0.5rem]">host</span>}
                {p.isBot && state.isHost && (
                  <button onClick={() => send({ t: 'removeBot', id: p.id })}
                    className="text-moss hover:text-crimson transition text-sm leading-none" title="Remove this AI player">✕</button>
                )}
              </span>
            </motion.li>
          ))}
          {Array.from({ length: Math.max(0, state.minPlayers - state.players.length) }).map((_, i) => (
            <li key={`e${i}`} className="rounded-xl border border-dashed border-gild/15 px-3 py-2 text-moss/60 text-sm italic">an empty seat…</li>
          ))}
        </ul>

        {state.isHost ? (
          <div className="space-y-2">
            {!full && (
              <button className="btn-ghost w-full" onClick={() => send({ t: 'addBot' })}>+ Add AI player</button>
            )}
            <button className="btn-gild w-full" disabled={!enough} onClick={() => send({ t: 'start' })}>
              {enough ? 'Start the game' : `Need ${state.minPlayers - state.players.length} more`}
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-moss">Waiting for the host to start…</p>
        )}
        <div className="flex justify-center"><RulesButton /></div>
      </motion.div>
    </div>
  );
}
