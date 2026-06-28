import { useState } from 'react';
import { motion } from 'framer-motion';
import { Seal } from './Emblem.jsx';
import { RulesButton } from './Rules.jsx';

// A small decoder grid that flickers between manila and team colors — the
// signature element previewed on the title screen.
const PREVIEW = [
  'r', 'm', 'b', 'm', 'r',
  'm', 'b', 'm', 'r', 'a',
  'b', 'm', 'r', 'b', 'm',
];
const COLOR = { r: '#c4453f', b: '#3f7bc4', m: '#cdbd9a', a: '#d4232e' };

function DecoderGrid() {
  return (
    <div className="grid grid-cols-5 gap-1.5 w-full max-w-[16rem]" aria-hidden>
      {PREVIEW.map((c, i) => (
        <motion.div
          key={i}
          className="aspect-[7/5] rounded-[4px]"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1, backgroundColor: COLOR[c] }}
          transition={{ delay: 0.15 + i * 0.04, type: 'spring', stiffness: 240, damping: 18 }}
          style={{ boxShadow: c === 'a' ? '0 0 12px -1px #d4232e' : 'inset 0 1px 0 rgba(255,255,255,0.25)' }}
        />
      ))}
    </div>
  );
}

export default function Landing({ onCreate, onJoin, status, error }) {
  const [name, setName] = useState(localStorage.getItem('cipher.name') || '');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('create');

  const remember = (n) => { setName(n); localStorage.setItem('cipher.name', n); };
  const go = () => {
    if (!name.trim()) return;
    if (mode === 'create') onCreate(name.trim());
    else if (code.trim().length === 4) onJoin(name.trim(), code.trim().toUpperCase());
  };

  return (
    <div className="relative z-10 min-h-[100dvh] flex flex-col items-center justify-center px-5 py-8">
      <div className="absolute top-3 right-3"><RulesButton /></div>

      <motion.header
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="text-center mb-5"
      >
        <div className="flex items-center justify-center gap-3 mb-2 text-brass">
          <Seal className="w-7 h-7 animate-flicker" />
          <p className="eyebrow !tracking-[0.5em] !text-brass">Field Intelligence</p>
        </div>
        <h1 className="stencil text-[clamp(3.2rem,18vw,6.5rem)] leading-[0.85] brass-text">CIPHER</h1>
        <p className="mx-auto mt-3 max-w-xs text-manila-dim text-sm text-balance">
          Twenty-five codewords. Two spymasters who know the key. One assassin nobody wants to meet.
          Out-signal the other side.
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="mb-6"
      >
        <DecoderGrid />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}
        className="panel w-full max-w-sm p-5"
      >
        <div className="grid grid-cols-2 gap-1 p-1 mb-4 rounded-sm bg-ink-deep/70 border border-manila/10">
          {[['create', 'Open a channel'], ['join', 'Join a channel']].map(([m, lbl]) => (
            <button key={m} onClick={() => setMode(m)}
              className={`rounded-sm py-2 text-xs font-semibold uppercase tracking-wider transition ${
                mode === m ? 'bg-brass/20 text-brass-bright' : 'text-manila-dim hover:text-parch'
              }`}>{lbl}</button>
          ))}
        </div>

        <label className="eyebrow block mb-1.5">Codename</label>
        <input className="field mb-4" placeholder="e.g. Sparrow" maxLength={16} value={name}
          onChange={(e) => remember(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && mode === 'create' && go()} />

        {mode === 'join' && (
          <>
            <label className="eyebrow block mb-1.5">Channel code</label>
            <input className="field mb-4 font-mono uppercase tracking-[0.4em] text-center text-lg"
              placeholder="ABCD" maxLength={4} value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && go()} />
          </>
        )}

        <button className="btn-brass w-full" onClick={go}
          disabled={!name.trim() || (mode === 'join' && code.length < 4)}>
          {mode === 'create' ? 'Establish channel' : 'Connect'}
        </button>

        <p className="mt-3 text-center text-[0.68rem] text-manila-faint min-h-[1.2em]">
          {error?.message
            ? <span className="text-red-bright">{error.message}</span>
            : status === 'open' ? 'Secure line open · 4–8 agents, two teams' : 'Opening secure line…'}
        </p>
      </motion.div>
    </div>
  );
}
