import { useState } from 'react';
import { motion } from 'framer-motion';
import { CHARACTERS } from '../game-meta.js';
import { Emblem } from '../emblems.jsx';
import { CheatSheetButton } from './CheatSheet.jsx';

export default function Lobby({ state, code, send }) {
  const [copied, setCopied] = useState(false);
  const me = state.players.find((p) => p.id === state.you);
  const canStart = state.isHost && state.players.length >= 2;

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  return (
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-5 py-10 gap-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <p className="eyebrow mb-2">The table is set</p>
        <button onClick={copy} className="group inline-flex items-center gap-3">
          <span className="font-display text-5xl font-black tracking-[0.2em] gilt-text">{code}</span>
          <span className="text-xs text-parch-faint group-hover:text-gilt transition border border-parch/15 rounded px-2 py-1">
            {copied ? 'Copied!' : 'Copy code'}
          </span>
        </button>
        <p className="mt-2 text-sm text-parch-dim">Send this code to your friends so they can join.</p>
      </motion.div>

      <div className="panel w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl">At the table</h2>
          <div className="flex items-center gap-3">
            <CheatSheetButton />
            <span className="font-mono text-xs text-parch-faint">{state.players.length}/6</span>
          </div>
        </div>
        <ul className="space-y-2">
          {state.players.map((p, i) => (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-lg border border-parch/10 bg-white/[0.02] px-3 py-2.5"
            >
              <span className="grid place-items-center w-8 h-8 rounded-full bg-gilt/15 text-gilt font-display font-bold">
                {p.name[0]?.toUpperCase()}
              </span>
              <span className="font-medium">{p.name}</span>
              {p.id === state.you && <span className="text-xs text-parch-faint">(you)</span>}
              {p.id === state.turn && state.isHost && <span />}
              <span className="ml-auto flex items-center gap-2 text-xs text-parch-faint">
                {i === 0 && <span className="text-gilt">Host</span>}
                <span className={`w-2 h-2 rounded-full ${p.connected ? 'bg-ambassador' : 'bg-parch-faint/40'}`} />
              </span>
            </motion.li>
          ))}
        </ul>

        {state.isHost ? (
          <button className="btn-gilt w-full mt-5" onClick={() => send({ t: 'start' })} disabled={!canStart}>
            {canStart ? 'Begin the game' : 'Waiting for one more player…'}
          </button>
        ) : (
          <p className="mt-5 text-center text-sm text-parch-dim">Waiting for {state.players[0]?.name} to start…</p>
        )}
      </div>

      {/* Quick rules reference while waiting. */}
      <div className="w-full max-w-lg grid grid-cols-2 sm:grid-cols-5 gap-2">
        {Object.entries(CHARACTERS).map(([key, c]) => (
          <div key={key} className="rounded-lg border border-parch/10 bg-white/[0.02] p-2.5 text-center" style={{ borderColor: `${c.color}33` }}>
            <div className="grid place-items-center mb-1" style={{ color: c.color }}><Emblem name={key} className="w-7 h-7" /></div>
            <div className="font-display text-sm">{c.name}</div>
            <div className="text-[0.62rem] text-parch-dim leading-tight mt-0.5">{c.ability}</div>
            {c.counter !== '—' && <div className="text-[0.58rem] text-parch-faint mt-1">{c.counter}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
