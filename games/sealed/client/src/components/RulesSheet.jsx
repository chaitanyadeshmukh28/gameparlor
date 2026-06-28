import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { META, RANKS, Emblem } from '../cards.jsx';

export function RulesButton({ className = '' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={`btn-ghost !py-1.5 !px-3 text-xs ${className}`} onClick={() => setOpen(true)}>
        <span aria-hidden className="mr-1 grid place-items-center w-4 h-4 rounded-full border border-current text-[0.6rem] font-bold align-middle inline-grid">?</span>
        Rules
      </button>
      <RulesSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default function RulesSheet({ open, onClose }) {
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
          className="fixed inset-0 z-[70] grid place-items-center bg-plum-deep/85 backdrop-blur-sm p-4"
          role="dialog" aria-modal="true" aria-label="How to play Sealed"
        >
          <motion.div
            initial={{ scale: 0.95, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="panel w-full max-w-xl max-h-[88vh] overflow-y-auto p-6 no-scrollbar"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="eyebrow mb-1">A parlor of letters</p>
                <h2 className="font-display text-3xl font-bold gilt-text leading-none">How to play Sealed</h2>
              </div>
              <button onClick={onClose} aria-label="Close rules"
                className="grid place-items-center w-8 h-8 rounded-full border border-rose/20 text-rose-faint hover:text-blush hover:border-gilt/50 transition">✕</button>
            </div>

            <div className="rounded-xl border border-gilt/20 bg-gilt/[0.05] p-4 mb-5 text-[0.95rem] leading-relaxed">
              <p className="text-cream">
                You hold a <b>single secret letter</b>. On your turn, draw a second and <b>play one</b>,
                resolving its intrigue. Stay in the round by guile — or be left holding the
                <b className="rose-text"> highest letter</b> when the courier’s satchel empties.
              </p>
              <p className="text-cream/80 mt-2">
                Win a round to earn a <b className="text-gilt">Favor</b>. First to the Favor goal wins the soirée.
                The <b>Princess</b> (8) is the card you must never let slip.
              </p>
            </div>

            <h3 className="font-display text-xl mb-2 text-blush">The eight letters</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {RANKS.map((r) => {
                const c = META[r];
                return (
                  <div key={r} className="flex items-start gap-3 rounded-xl border p-3"
                    style={{ borderColor: `${c.color}33`, background: `${c.color}0e` }}>
                    <span className="shrink-0 grid place-items-center w-10 h-10 rounded-lg"
                      style={{ color: c.color, background: `${c.color}18` }}>
                      <Emblem rank={r} className="w-7 h-7" />
                    </span>
                    <div className="leading-tight">
                      <div className="font-display font-semibold flex items-baseline gap-2" style={{ color: c.color }}>
                        <span className="text-[0.7rem] font-body text-cream-dim">{c.rank}</span>{c.name}
                        <span className="text-[0.65rem] text-cream-dim/70">×{c.count}</span>
                      </div>
                      <div className="text-xs text-cream/85 mt-0.5">{c.short}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-xs text-rose-faint mt-5">
              Higher ranks are stronger in a duel but riskier to hold. Press <b>Esc</b> to close.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
