import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export function RulesButton({ className = '' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={`btn-line !py-1.5 !px-3 text-xs ${className}`} onClick={() => setOpen(true)}>
        <span aria-hidden className="grid place-items-center w-4 h-4 rounded-full border border-current text-[0.6rem] font-bold">?</span>
        Briefing
      </button>
      <Rules open={open} onClose={() => setOpen(false)} />
    </>
  );
}

const STEPS = [
  ['The deal', 'One secret location is drawn. Everyone gets the location plus a role — except one player, the spy, who only sees a redacted file and does not know the location.'],
  ['The questioning', "Take turns asking each other pointed questions about the location. Answer so you sound like you belong — without ever naming the place. The spy bluffs along and listens for the answer."],
  ['Calling a vote', 'Suspicious? Accuse someone. Everyone else must agree unanimously to convict. Pin the spy and the players win; convict an innocent and the spy walks.'],
  ['Breaking cover', 'At any moment the spy can stop the clock, break cover, and name the location from the board. Right = the spy wins. Wrong = the players win.'],
  ['The clock', 'If time runs out with no conviction, the spy slips away and wins the round. Keep the pressure on.'],
];

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
          className="fixed inset-0 z-[90] grid place-items-center bg-noir-black/85 backdrop-blur-sm p-4"
          role="dialog" aria-modal="true" aria-label="How to play Undercover"
        >
          <motion.div
            initial={{ scale: 0.96, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, y: 8 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="panel w-full max-w-lg max-h-[88dvh] overflow-y-auto p-6"
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="eyebrow mb-1">Field briefing</p>
                <h2 className="stamp text-2xl text-bone">How to play <span className="amber-text">Undercover</span></h2>
              </div>
              <button onClick={onClose} aria-label="Close briefing"
                className="grid place-items-center w-8 h-8 rounded-full border border-bone/20 text-bone-dim hover:text-bone hover:border-amber/50 transition">✕</button>
            </div>

            <div className="rounded-[3px] border border-amber/25 bg-amber/[0.05] p-4 mb-5 text-sm leading-relaxed">
              <p className="text-bone">
                Find the <b className="text-amber">spy</b> — or, if it's you, survive without ever
                learning the location. The whole game is questions, answers, and reading faces.
              </p>
            </div>

            <ol className="space-y-3">
              {STEPS.map(([title, body], i) => (
                <li key={title} className="flex gap-3">
                  <span className="shrink-0 grid place-items-center w-7 h-7 rounded-[2px] border border-amber/40 text-amber font-mono text-xs">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <div className="font-cond font-semibold uppercase tracking-[0.12em] text-sm text-bone">{title}</div>
                    <p className="text-sm text-bone-dim leading-relaxed">{body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-5 rounded-[3px] border border-bone/10 bg-noir-black/50 p-4">
              <p className="eyebrow mb-2">Scoring</p>
              <ul className="text-sm text-bone-dim space-y-1">
                <li><span className="text-bone">Spy names the location</span> — +4 to the spy.</li>
                <li><span className="text-bone">Spy survives the clock</span> — +2 to the spy.</li>
                <li><span className="text-bone">Innocent convicted</span> — +2 to the spy.</li>
                <li><span className="text-bone">Spy caught</span> — +1 to every player (+1 bonus to the accuser).</li>
                <li><span className="text-bone">Spy guesses wrong</span> — +1 to every player.</li>
              </ul>
            </div>

            <p className="text-center text-xs text-bone-faint mt-5">Press <b>Esc</b> to close.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
