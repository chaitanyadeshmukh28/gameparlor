import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Emblem, Rooftops } from '../emblems.jsx';
import { ROLES } from '../game-meta.js';

const FAN = ['seer', 'werewolf', 'robber', 'troublemaker', 'tanner'];

function FannedDeck() {
  const reduce = useReducedMotion();
  return (
    <div className="relative h-44 sm:h-52 w-full grid place-items-center" aria-hidden>
      {FAN.map((key, i) => {
        const mid = (FAN.length - 1) / 2;
        const offset = i - mid;
        const r = ROLES[key];
        return (
          <motion.div
            key={key}
            initial={{ y: 50, opacity: 0, rotate: 0 }}
            animate={{ y: Math.abs(offset) * 8, opacity: 1, rotate: offset * 6, x: offset * 44 }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 110, damping: 17, delay: 0.15 + i * 0.08 }}
            whileHover={reduce ? undefined : { y: Math.abs(offset) * 8 - 20, zIndex: 30 }}
            className="absolute w-[5.6rem] h-32 sm:w-28 sm:h-40 rounded-xl border p-2 flex flex-col"
            style={{
              background: `linear-gradient(165deg, ${r.color}30, #0c1130 64%)`,
              borderColor: `${r.color}88`,
              boxShadow: '0 20px 44px -14px rgba(0,0,0,0.75)',
              zIndex: 10 - Math.abs(offset),
            }}
          >
            <div className="flex-1 grid place-items-center" style={{ color: r.color }}>
              <Emblem name={key} className="w-3/5 h-3/5" />
            </div>
            <div className="text-center font-display text-xs sm:text-sm font-semibold text-moon leading-tight">{r.name}</div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function Landing({ onCreate, onJoin, status, error }) {
  const [name, setName] = useState(localStorage.getItem('nightfall.name') || '');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('create');

  const remember = (n) => { setName(n); localStorage.setItem('nightfall.name', n); };
  const go = () => {
    if (!name.trim()) return;
    if (mode === 'create') onCreate(name.trim());
    else onJoin(name.trim(), code.trim().toUpperCase());
  };

  return (
    <div className="relative z-10 min-h-[100dvh] flex flex-col items-center justify-center px-5 py-8">
      <Rooftops className="fixed bottom-0 left-0 w-full h-24 sm:h-28 -z-10" />
      <motion.header
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="text-center mb-1"
      >
        <p className="eyebrow mb-3">A game of secrets after dark · 3–8 players</p>
        <h1 className="font-display font-bold tracking-tight leading-none text-[clamp(3.2rem,15vw,7rem)]">
          <span className="moon-text">Nightfall</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-moon-dim text-balance">
          One night. One secret role. By dawn, someone hangs — and the wolves walk among you.
          Read the room, bluff your card, and survive the vote.
        </p>
      </motion.header>

      <FannedDeck />

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}
        className="panel w-full max-w-md p-6 mt-3"
      >
        <div className="grid grid-cols-2 gap-1 p-1 mb-5 rounded-lg bg-night-abyss/70 border border-moon/10">
          {['create', 'join'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-md py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-frost ${
                mode === m ? 'bg-frost/15 text-frost shadow-inner' : 'text-moon-dim hover:text-moon'
              }`}
            >
              {m === 'create' ? 'Host a village' : 'Join a village'}
            </button>
          ))}
        </div>

        <label className="eyebrow block mb-1.5" htmlFor="nf-name">Your name</label>
        <input
          id="nf-name"
          className="field mb-4"
          placeholder="e.g. Mireille"
          maxLength={16}
          value={name}
          onChange={(e) => remember(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && mode === 'create' && go()}
        />

        {mode === 'join' && (
          <>
            <label className="eyebrow block mb-1.5" htmlFor="nf-code">Village code</label>
            <input
              id="nf-code"
              className="field mb-4 font-mono uppercase tracking-[0.3em] text-center text-lg"
              placeholder="ABCD"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && go()}
            />
          </>
        )}

        <button className="btn-moon w-full" onClick={go} disabled={!name.trim() || (mode === 'join' && code.length < 4)}>
          {mode === 'create' ? 'Gather the village' : 'Slip in after dark'}
        </button>

        <p className="mt-4 text-center text-xs text-moon-faint">
          {status === 'open'
            ? 'Share the village code so friends can join from anywhere.'
            : 'Reaching the village…'} {error?.message}
        </p>
      </motion.div>
    </div>
  );
}
