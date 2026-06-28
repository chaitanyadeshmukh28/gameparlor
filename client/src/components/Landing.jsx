import { useState } from 'react';
import { motion } from 'framer-motion';
import { Emblem } from '../emblems.jsx';
import { CHARACTERS } from '../game-meta.js';

const ORDER = ['duke', 'captain', 'contessa', 'ambassador', 'assassin'];

function FannedDeck() {
  return (
    <div className="relative h-56 w-full grid place-items-center" aria-hidden>
      {ORDER.map((char, i) => {
        const mid = (ORDER.length - 1) / 2;
        const offset = i - mid;
        const c = CHARACTERS[char];
        return (
          <motion.div
            key={char}
            initial={{ y: 40, opacity: 0, rotate: 0 }}
            animate={{ y: Math.abs(offset) * 10, opacity: 1, rotate: offset * 9, x: offset * 58 }}
            transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.15 + i * 0.08 }}
            whileHover={{ y: Math.abs(offset) * 10 - 22, zIndex: 20 }}
            className="absolute w-28 h-40 rounded-xl border p-2 flex flex-col"
            style={{
              background: `linear-gradient(165deg, ${c.color}30, #1a0f17 62%)`,
              borderColor: `${c.color}88`,
              boxShadow: '0 18px 40px -12px rgba(0,0,0,0.7)',
              zIndex: 10 - Math.abs(offset),
            }}
          >
            <div className="flex-1 grid place-items-center" style={{ color: c.color }}>
              <Emblem name={char} className="w-3/5 h-3/5" />
            </div>
            <div className="text-center font-display text-sm font-semibold text-parch">{c.name}</div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function Landing({ onCreate, onJoin, status }) {
  const [name, setName] = useState(localStorage.getItem('coup.name') || '');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('create');

  const remember = (n) => { setName(n); localStorage.setItem('coup.name', n); };
  const go = () => {
    if (!name.trim()) return;
    if (mode === 'create') onCreate(name.trim());
    else onJoin(name.trim(), code.trim().toUpperCase());
  };

  return (
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-5 py-10">
      <motion.header
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="text-center mb-2"
      >
        <p className="eyebrow mb-3">A parlour game of deduction & deceit · 2–6 players</p>
        <h1 className="font-display font-black tracking-tight leading-none text-[clamp(3.5rem,14vw,8rem)]">
          <span className="gilt-text">Coup</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-parch-dim text-balance">
          Two cards. A handful of coins. Everyone lies. Bluff your way to the last
          seat at the table — or call someone's bluff and watch them fall.
        </p>
      </motion.header>

      <FannedDeck />

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}
        className="panel w-full max-w-md p-6 mt-4"
      >
        <div className="grid grid-cols-2 gap-1 p-1 mb-5 rounded-lg bg-felt-deep/70 border border-parch/10">
          {['create', 'join'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-md py-2 text-sm font-semibold capitalize transition ${
                mode === m ? 'bg-gilt/15 text-gilt shadow-inner' : 'text-parch-dim hover:text-parch'
              }`}
            >
              {m === 'create' ? 'Host a table' : 'Join a table'}
            </button>
          ))}
        </div>

        <label className="eyebrow block mb-1.5">Your name</label>
        <input
          className="field mb-4"
          placeholder="e.g. Lucrezia"
          maxLength={16}
          value={name}
          onChange={(e) => remember(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && mode === 'create' && go()}
        />

        {mode === 'join' && (
          <>
            <label className="eyebrow block mb-1.5">Table code</label>
            <input
              className="field mb-4 font-mono uppercase tracking-[0.3em] text-center text-lg"
              placeholder="ABCD"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && go()}
            />
          </>
        )}

        <button className="btn-gilt w-full" onClick={go} disabled={!name.trim() || (mode === 'join' && code.length < 4)}>
          {mode === 'create' ? 'Deal me in' : 'Take a seat'}
        </button>

        <p className="mt-4 text-center text-xs text-parch-faint">
          {status === 'open'
            ? 'Share the table code with friends to play from anywhere.'
            : 'Connecting to the table…'}
        </p>
      </motion.div>
    </div>
  );
}
