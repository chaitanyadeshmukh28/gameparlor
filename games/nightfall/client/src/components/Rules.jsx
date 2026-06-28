import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Emblem } from '../emblems.jsx';
import { ROLES } from '../game-meta.js';

const ORDER = ['werewolf', 'seer', 'robber', 'troublemaker', 'insomniac', 'villager', 'tanner'];

export function RulesButton({ className = '' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={`btn-ghost !py-1.5 !px-3 text-xs ${className}`} onClick={() => setOpen(true)}>
        <span aria-hidden className="grid place-items-center w-4 h-4 rounded-full border border-current text-[0.6rem] font-bold">?</span>
        Rules
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
          className="fixed inset-0 z-[70] grid place-items-center bg-night-abyss/85 backdrop-blur-sm p-4"
          role="dialog" aria-modal="true" aria-label="How to play Nightfall"
        >
          <motion.div
            initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="panel w-full max-w-2xl max-h-[88vh] overflow-y-auto p-6 sm:p-7"
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="eyebrow mb-1">One night in the village</p>
                <h2 className="font-display text-3xl font-bold moon-text">How to play Nightfall</h2>
              </div>
              <button onClick={onClose} aria-label="Close rules"
                className="grid place-items-center w-8 h-8 rounded-full border border-moon/15 text-moon-dim hover:text-moon hover:border-frost/50 transition">✕</button>
            </div>

            <div className="rounded-xl border border-frost/20 bg-frost/[0.05] p-4 mb-6 text-sm leading-relaxed">
              <p className="text-moon">
                Everyone is dealt one <b>secret role</b>; three spare roles rest face-down in the <b>center</b>.
                Night falls and certain roles wake in turn — peeking, swapping, and scheming — then dawn breaks.
              </p>
              <p className="text-moon-dim mt-2">
                You <b>discuss</b>, then everyone <b>votes at once</b> for who to eliminate. Because roles were swapped
                in the dark, <b className="text-frost">you may not be what you were dealt</b>. The winner is decided by
                each player's <b>final</b> card.
              </p>
            </div>

            <h3 className="font-display text-xl mb-2">Who wins</h3>
            <div className="grid sm:grid-cols-3 gap-2 mb-6 text-xs">
              <div className="rounded-lg border border-frost/25 bg-frost/[0.06] p-3">
                <div className="font-display font-semibold text-frost mb-1">The Village</div>
                Wins if at least one <b>Werewolf is eliminated</b> — or, if no wolves are in play, if <b>no one</b> dies.
              </div>
              <div className="rounded-lg border border-blood/25 bg-blood/[0.06] p-3">
                <div className="font-display font-semibold text-blood-bright mb-1">The Werewolves</div>
                Win if <b>no Werewolf</b> is eliminated. Lie, deflect, and survive the vote.
              </div>
              <div className="rounded-lg border border-[#9aa95e]/30 bg-[#9aa95e]/[0.06] p-3">
                <div className="font-display font-semibold mb-1" style={{ color: '#b9c47e' }}>The Tanner</div>
                Wins <b>only</b> by being voted out. Bait the village into hanging you.
              </div>
            </div>

            <h3 className="font-display text-xl mb-2">The roles & their night</h3>
            <div className="grid sm:grid-cols-2 gap-2 mb-5">
              {ORDER.map((key) => {
                const r = ROLES[key];
                return (
                  <div key={key} className="flex items-start gap-3 rounded-lg border p-3" style={{ borderColor: `${r.color}33`, background: `${r.color}0d` }}>
                    <span className="shrink-0 grid place-items-center w-10 h-10 rounded-md" style={{ color: r.color, background: `${r.color}14` }}>
                      <Emblem name={key} className="w-7 h-7" />
                    </span>
                    <div className="leading-tight">
                      <div className="font-display font-semibold" style={{ color: r.color }}>
                        {r.name}
                        {r.flavor && <span className="ml-1.5 font-mono text-[0.6rem] uppercase tracking-wider text-moon-faint">· {r.flavor}</span>}
                      </div>
                      <div className="text-xs text-moon-dim mt-0.5">{r.night}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-moon-faint leading-relaxed">
              Wake order: <b>Werewolves → Seer → Robber → Troublemaker → Insomniac</b>. A player needs at least
              <b> two votes</b> to be eliminated; everyone tied for the most votes is eliminated together. Press <b>Esc</b> to close.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
