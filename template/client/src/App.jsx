// Minimal working shell: Landing (create/join) → Lobby → Game.
// RESTYLE all of this for your game's identity; keep the net wiring.
import { useState } from 'react';
import { useGameSocket } from './net.js';

export default function App() {
  const { status, state, you, code, error, create, join, send } = useGameSocket();
  if (!state || !you) return <Landing onCreate={create} onJoin={join} status={status} error={error} />;
  if (state.phase === 'lobby') return <Lobby state={state} code={code} send={send} />;
  return <Game state={state} code={code} send={send} error={error} />;
}

function Landing({ onCreate, onJoin, status, error }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('create');
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-3">
        <h1 className="font-display text-3xl">Parlor Game</h1>
        <div className="flex gap-2">
          {['create', 'join'].map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 rounded-md py-2 text-sm capitalize ${mode === m ? 'bg-accent/20 text-accent' : 'bg-white/5'}`}>{m}</button>
          ))}
        </div>
        <input className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2" placeholder="Your name" maxLength={16} value={name} onChange={(e) => setName(e.target.value)} />
        {mode === 'join' && (
          <input className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2 uppercase" placeholder="CODE" maxLength={4} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        )}
        <button className="w-full rounded-md bg-accent text-black font-semibold py-2 disabled:opacity-40"
          disabled={!name.trim() || (mode === 'join' && code.length < 4)}
          onClick={() => (mode === 'create' ? onCreate(name.trim()) : onJoin(name.trim(), code))}>
          {mode === 'create' ? 'Create game' : 'Join game'}
        </button>
        <p className="text-xs text-white/40">{status === 'open' ? 'Connected.' : 'Connecting…'} {error?.message}</p>
      </div>
    </div>
  );
}

function Lobby({ state, code, send }) {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
        <div className="text-center"><div className="text-sm text-white/50">Game code</div><div className="font-display text-4xl tracking-widest">{code}</div></div>
        <ul className="space-y-1">
          {state.players.map((p) => <li key={p.id} className="rounded-md bg-white/5 px-3 py-2">{p.name}{p.id === state.you && ' (you)'}</li>)}
        </ul>
        {state.isHost
          ? <button className="w-full rounded-md bg-accent text-black font-semibold py-2 disabled:opacity-40" disabled={state.players.length < state.minPlayers} onClick={() => send({ t: 'start' })}>Start game</button>
          : <p className="text-center text-sm text-white/50">Waiting for the host to start…</p>}
      </div>
    </div>
  );
}

function Game({ state, send }) {
  // Replace with your game UI. This placeholder drives the demo engine.
  return (
    <div className="min-h-screen grid place-items-center p-6 text-center space-y-4">
      <div>
        <h2 className="font-display text-2xl mb-2">Phase: {state.phase}</h2>
        <ul className="space-y-1">{state.scores?.map((s) => <li key={s.id}>{s.name}: {s.score}</li>)}</ul>
      </div>
      {state.phase === 'over'
        ? <button className="rounded-md bg-accent text-black font-semibold px-4 py-2" onClick={() => send({ t: 'restart' })}>Play again</button>
        : <button className="rounded-md bg-accent text-black font-semibold px-6 py-3" onClick={() => send({ t: 'tap' })}>Tap (+1)</button>}
    </div>
  );
}
