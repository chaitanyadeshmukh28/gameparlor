// How-to-play scroll — openable mid-game for beginners.
import { motion, AnimatePresence } from 'framer-motion';
import { Sigil } from './Crest.jsx';

const ROLE_LINES = [
  ['merlin', 'Merlin', 'Good — secretly sees every Minion of Mordred. Steer the realm without revealing yourself.'],
  ['percival', 'Percival', 'Good — sees Merlin and Morgana, but not which is which.'],
  ['loyal', 'Loyal Servant of Arthur', 'Good — knows nothing. Read the table and vote wisely.'],
  ['assassin', 'Assassin', 'Evil — if the realm wins, may still strike. Slay Merlin to steal victory.'],
  ['morgana', 'Morgana', 'Evil — wears Merlin’s false aura to fool Percival.'],
  ['minion', 'Minion of Mordred', 'Evil — sabotage quests from the shadows.'],
];

export default function Rules({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-steel-deep/80 backdrop-blur-sm" />
          <motion.div
            className="panel relative max-h-[86dvh] w-full max-w-md overflow-y-auto no-bar rounded-2xl p-5"
            initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-label="How to play Quest"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl gold-leaf tracking-emblem">How to Play</h2>
              <button onClick={onClose} className="font-display text-parch/60 hover:text-gold-bright text-sm px-2 py-1" aria-label="Close rules">✕</button>
            </div>

            <p className="mt-3 text-sm text-parch/80 leading-relaxed">
              The realm holds <b className="text-gold-bright">five quests</b>. The
              loyal <b className="text-gold-bright">Good</b> want quests to succeed;
              the hidden <b className="text-crimson-bright">Evil</b> want them to fail.
              <b> First side to three quest results wins.</b>
            </p>

            <ol className="mt-4 space-y-2 text-sm text-parch/80">
              <Step n="1" t="Each round, the Leader proposes a team" d="of the size shown on the seal." />
              <Step n="2" t="Everyone votes Approve or Reject at once" d="majority approves. Five rejections in a row and Evil wins the realm." />
              <Step n="3" t="The team rides out" d="each member secretly plays Success or Fail. Good must play Success; Evil may play either." />
              <Step n="4" t="One Fail sinks a quest" d="— except the 4th quest with 7+ players, which needs two." />
              <Step n="5" t="If Good completes three quests" d="the Assassin gets one last strike — kill Merlin and Evil snatches the win." />
            </ol>

            <h3 className="eyebrow mt-5 mb-2">The Roles</h3>
            <ul className="space-y-2">
              {ROLE_LINES.map(([key, name, desc]) => (
                <li key={key} className="flex items-start gap-3">
                  <span className={key === 'assassin' || key === 'morgana' || key === 'minion' ? 'text-crimson-bright' : 'text-gold'}>
                    <Sigil role={key} size={26} />
                  </span>
                  <span className="text-sm"><b className="font-display tracking-wide">{name}.</b> <span className="text-parch/70">{desc}</span></span>
                </li>
              ))}
            </ul>

            <button onClick={onClose} className="mt-5 w-full rounded-lg bg-gold/90 py-2.5 font-display tracking-emblem text-steel-deep font-semibold hover:bg-gold-bright">
              To the Quest
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Step({ n, t, d }) {
  return (
    <li className="flex gap-3">
      <span className="font-display text-gold-bright shrink-0">{n}</span>
      <span><b className="text-parch">{t}</b> <span className="text-parch/70">{d}</span></span>
    </li>
  );
}
