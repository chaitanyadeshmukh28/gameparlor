import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Emblem } from '../emblems.jsx';
import { CHARACTERS, ACTIONS } from '../game-meta.js';

const ACTION_ROWS = ['income', 'foreign_aid', 'tax', 'steal', 'exchange', 'assassinate', 'coup'];

// A drop-in button that opens the rules cheat sheet. Reused in the lobby and
// at the table so anyone can check the rules mid-game.
export function CheatSheetButton({ className = '' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={`btn-ghost !py-1.5 !px-3 text-xs ${className}`} onClick={() => setOpen(true)}>
        <span aria-hidden className="grid place-items-center w-4 h-4 rounded-full border border-current text-[0.6rem] font-bold">?</span>
        Cheat sheet
      </button>
      <CheatSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default function CheatSheet({ open, onClose }) {
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
          className="fixed inset-0 z-[70] grid place-items-center bg-felt-deep/80 backdrop-blur-sm p-4"
          role="dialog" aria-modal="true" aria-label="Coup cheat sheet"
        >
          <motion.div
            initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="panel w-full max-w-2xl max-h-[88vh] overflow-y-auto p-6 sm:p-7"
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="eyebrow mb-1">For the table</p>
                <h2 className="font-display text-2xl font-bold gilt-text">How to play Coup</h2>
              </div>
              <button onClick={onClose} aria-label="Close cheat sheet"
                className="grid place-items-center w-8 h-8 rounded-full border border-parch/15 text-parch-dim hover:text-parch hover:border-gilt/50 transition">✕</button>
            </div>

            {/* The one-breath summary for beginners. */}
            <div className="rounded-xl border border-gilt/20 bg-gilt/[0.05] p-4 mb-6 text-sm leading-relaxed">
              <p className="text-parch">
                You hold <b>2 secret cards</b> (your influence) and some coins. On your turn, take <b>one action</b>.
                Most actions claim a character's power — and <b>you can bluff</b>, because no one can see your cards.
              </p>
              <p className="text-parch-dim mt-2">
                Suspect a bluff? <b className="text-assassin">Challenge</b> it. Some actions can be
                <b className="text-captain"> blocked</b> by the right character. Lose both cards and you're out.
                <b className="text-gilt"> Last player standing wins.</b>
              </p>
            </div>

            {/* Characters */}
            <h3 className="font-display text-lg mb-2">The five characters</h3>
            <div className="grid sm:grid-cols-2 gap-2 mb-6">
              {Object.entries(CHARACTERS).map(([key, c]) => (
                <div key={key} className="flex items-start gap-3 rounded-lg border p-3" style={{ borderColor: `${c.color}33`, background: `${c.color}0d` }}>
                  <span className="shrink-0 grid place-items-center w-10 h-10 rounded-md" style={{ color: c.color, background: `${c.color}14` }}>
                    <Emblem name={key} className="w-7 h-7" />
                  </span>
                  <div className="leading-tight">
                    <div className="font-display font-semibold" style={{ color: c.color }}>{c.name}</div>
                    <div className="text-xs text-parch mt-0.5"><span className="text-parch-faint">Power:</span> {c.ability}</div>
                    {c.counter !== '—' && <div className="text-xs text-parch mt-0.5"><span className="text-parch-faint">Blocks:</span> {c.counter.replace('Blocks ', '').replace('.', '')}</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <h3 className="font-display text-lg mb-2">Every action</h3>
            <div className="overflow-hidden rounded-lg border border-parch/10 mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/[0.03] text-parch-faint text-left text-xs uppercase tracking-wider">
                    <th className="px-3 py-2 font-medium">Action</th>
                    <th className="px-3 py-2 font-medium">Effect</th>
                    <th className="px-3 py-2 font-medium hidden sm:table-cell">Claim</th>
                    <th className="px-3 py-2 font-medium">Counter</th>
                  </tr>
                </thead>
                <tbody>
                  {ACTION_ROWS.map((key, i) => {
                    const a = ACTIONS[key];
                    const claim = a.claim ? CHARACTERS[a.claim] : null;
                    return (
                      <tr key={key} className={i % 2 ? 'bg-white/[0.015]' : ''}>
                        <td className="px-3 py-2 font-medium" style={a.danger ? { color: '#cf3b4b' } : undefined}>{a.label}</td>
                        <td className="px-3 py-2 text-parch-dim">{a.hint}</td>
                        <td className="px-3 py-2 hidden sm:table-cell" style={{ color: claim?.color }}>{claim?.name || '—'}</td>
                        <td className="px-3 py-2 text-parch-dim">{counterText(key)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Challenge vs block */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-assassin/25 bg-assassin/[0.06] p-3">
                <div className="font-display font-semibold text-assassin mb-1">Challenge</div>
                <p className="text-xs text-parch-dim leading-relaxed">
                  Call out a claimed character. If they don't have it, <b>they</b> lose a card. If they do,
                  <b> you</b> lose a card and they redraw. Anyone can challenge.
                </p>
              </div>
              <div className="rounded-lg border border-captain/25 bg-captain/[0.06] p-3">
                <div className="font-display font-semibold text-captain mb-1">Block</div>
                <p className="text-xs text-parch-dim leading-relaxed">
                  Stop an action by claiming the character that counters it (you can bluff the block too —
                  and it can be challenged). Only the target may block a steal or assassination.
                </p>
              </div>
            </div>

            <p className="text-center text-xs text-parch-faint mt-5">Reach 10+ coins and you must launch a coup. Press <b>Esc</b> to close.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function counterText(key) {
  switch (key) {
    case 'foreign_aid': return 'Duke blocks';
    case 'steal': return 'Captain / Ambassador block';
    case 'assassinate': return 'Contessa blocks';
    case 'tax': case 'exchange': return 'Challenge only';
    default: return 'Unstoppable';
  }
}
