import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Emblem } from './Emblem.jsx';

const KEY = [
  { type: 'red', n: '9 / 8', title: 'Field agents', body: 'Your team’s contacts. Reveal all of yours to win.' },
  { type: 'neutral', n: '7', title: 'Bystanders', body: 'Innocent. Hitting one ends your turn at once.' },
  { type: 'assassin', n: '1', title: 'The assassin', body: 'Touch it and your team loses instantly. The only fatal tile.' },
];

export function RulesButton({ className = '' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={`btn-ghost !py-1 !px-2.5 !text-[0.62rem] ${className}`}>
        <span aria-hidden className="grid place-items-center w-4 h-4 rounded-full border border-current text-[0.55rem] font-bold">?</span>
        Briefing
      </button>
      <Rules open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default function Rules({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[80] grid place-items-center bg-ink-deep/85 backdrop-blur-sm p-4"
          role="dialog" aria-modal="true" aria-label="Cipher mission briefing"
        >
          <motion.div
            initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, y: 8 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="panel w-full max-w-lg max-h-[88dvh] overflow-y-auto p-5 sm:p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="eyebrow mb-1">Field manual</p>
                <h2 className="stencil text-2xl brass-text">How to play Cipher</h2>
              </div>
              <button onClick={onClose} aria-label="Close briefing"
                className="grid place-items-center w-8 h-8 rounded-sm border border-manila/20 text-manila-dim hover:text-parch hover:border-brass/60 transition">✕</button>
            </div>

            <div className="frame p-4 mb-5 text-sm leading-relaxed">
              <p className="text-parch">
                Two teams — <b className="text-red-bright">Red</b> and <b className="text-blue-bright">Blue</b> — race to
                contact all of their secret agents hidden among <b>25 codewords</b>.
              </p>
              <p className="text-manila-dim mt-2">
                Each team has one <b className="text-brass-bright">Spymaster</b> who alone sees the key, and one or more
                <b className="text-brass-bright"> Operatives</b> who do the guessing.
              </p>
            </div>

            <h3 className="stencil text-base mb-2 text-parch">The board</h3>
            <div className="space-y-2 mb-5">
              {KEY.map((k) => (
                <div key={k.type} className="flex items-center gap-3 frame px-3 py-2">
                  <span className="shrink-0 grid place-items-center w-9 h-9 rounded-sm"
                    style={{ color: TINT[k.type], background: `${TINT[k.type]}1a` }}>
                    <Emblem type={k.type} className="w-6 h-6" />
                  </span>
                  <div className="leading-tight flex-1">
                    <div className="font-semibold text-parch" style={{ color: TINT[k.type] }}>{k.title} <span className="font-mono text-manila-dim text-xs">×{k.n}</span></div>
                    <div className="text-xs text-manila-dim">{k.body}</div>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="stencil text-base mb-2 text-parch">A turn</h3>
            <ol className="space-y-2 text-sm text-manila-dim mb-2">
              <li className="flex gap-3"><span className="font-mono text-brass-bright">01</span>
                The active <b className="text-parch">Spymaster</b> transmits a one-word clue and a number — how many agents it points to.</li>
              <li className="flex gap-3"><span className="font-mono text-brass-bright">02</span>
                <b className="text-parch">Operatives</b> tap tiles. A correct agent lets them keep going — up to the number <b>+ 1</b>.</li>
              <li className="flex gap-3"><span className="font-mono text-brass-bright">03</span>
                A bystander or an enemy agent <b className="text-parch">ends the turn</b>. The enemy tile helps the enemy.</li>
              <li className="flex gap-3"><span className="font-mono text-assassin">!!</span>
                Hit the <b className="text-assassin">assassin</b> and your team loses on the spot.</li>
            </ol>
            <p className="text-center text-xs text-manila-faint mt-4">First team to contact all its agents wins. Press <b>Esc</b> to close.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const TINT = { red: '#e2615a', blue: '#5b9bdf', neutral: '#cdbd9a', assassin: '#d4232e' };
