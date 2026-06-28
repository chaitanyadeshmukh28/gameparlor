import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lamp, Fingerprint } from './noir.jsx';

export default function Landing({ onCreate, onJoin, status, error }) {
  const [name, setName] = useState(localStorage.getItem('undercover.name') || '');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('create');

  const remember = (n) => { setName(n); localStorage.setItem('undercover.name', n); };
  const go = () => {
    if (!name.trim()) return;
    if (mode === 'create') onCreate(name.trim());
    else if (code.trim().length === 4) onJoin(name.trim(), code.trim().toUpperCase());
  };

  return (
    <div className="relative z-10 min-h-[100dvh] flex flex-col items-center justify-center px-5 py-8">
      <Lamp className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-44 opacity-90" />

      <motion.header
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
        className="text-center mt-28 mb-6"
      >
        <p className="eyebrow mb-3">Case file · 3–8 suspects · one of you is lying</p>
        <h1 className="stamp text-bone text-[clamp(3.2rem,18vw,7rem)] animate-flicker">
          UNDER<span className="amber-text">COVER</span>
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-bone-dim text-[0.95rem] leading-relaxed font-light">
          Everyone at the table shares a secret location and a role — everyone but the
          <span className="text-bone"> spy</span>, who's bluffing blind. Ask sharp
          questions. Don't give the place away. Smoke out the spy before they smoke out you.
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}
        className="panel w-full max-w-sm p-6"
      >
        <div className="grid grid-cols-2 gap-1 p-1 mb-5 rounded-[3px] bg-noir-black/70 border border-bone/10">
          {[['create', 'Open a case'], ['join', 'Join a case']].map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-[2px] py-2 text-xs font-cond font-semibold uppercase tracking-[0.18em] transition ${
                mode === m ? 'bg-amber/15 text-amber' : 'text-bone-faint hover:text-bone'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="eyebrow block mb-1.5" htmlFor="name">Your alias</label>
        <input
          id="name" className="field mb-4" placeholder="e.g. Vesper" maxLength={16}
          value={name} onChange={(e) => remember(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && mode === 'create' && go()}
        />

        {mode === 'join' && (
          <>
            <label className="eyebrow block mb-1.5" htmlFor="code">Case number</label>
            <input
              id="code" className="field mb-4 font-mono uppercase tracking-[0.4em] text-center text-lg"
              placeholder="ABCD" maxLength={4} value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && go()}
            />
          </>
        )}

        <button className="btn-amber w-full" onClick={go}
          disabled={!name.trim() || (mode === 'join' && code.length < 4)}>
          {mode === 'create' ? 'Open the file' : 'Take a seat'}
        </button>

        <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-bone-faint">
          <Fingerprint className="w-4 h-4 text-amber/60" />
          {status === 'open' ? 'Pass the case number to your friends.' : 'Connecting to the precinct…'}
        </p>
        {error?.message && <p className="mt-2 text-center text-xs text-amber/80">{error.message}</p>}
      </motion.div>
    </div>
  );
}
