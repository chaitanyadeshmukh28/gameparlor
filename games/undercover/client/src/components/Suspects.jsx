import { motion } from 'framer-motion';
import { Mug } from './noir.jsx';

// The line-up. Tappable when you're choosing someone to accuse.
export default function Suspects({ state, accuseMode, onPick }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 justify-start sm:justify-center">
      {state.players.map((p, i) => {
        const you = p.id === state.you;
        const asksFirst = p.id === state.firstAskerId;
        const pickable = accuseMode && !you && p.connected;
        return (
          <motion.button
            key={p.id}
            type="button"
            disabled={!pickable}
            onClick={() => pickable && onPick(p.id)}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            whileTap={pickable ? { scale: 0.95 } : undefined}
            className={`relative shrink-0 w-[4.6rem] rounded-[3px] border px-1.5 py-2 flex flex-col items-center gap-1 transition
              ${pickable ? 'border-amber/60 bg-amber/[0.07] cursor-pointer hover:bg-amber/15' : 'border-bone/10 bg-noir-black/40'}
              ${!p.connected ? 'opacity-45' : ''}`}
          >
            <Mug name={p.name} size="md" dim={!p.connected} />
            <span className="font-cond text-[0.7rem] leading-tight text-bone truncate max-w-full">
              {p.name}{you && <span className="text-bone-faint"> ·you</span>}
            </span>
            <span className="font-mono text-[0.6rem] text-amber/80">{p.score} pts</span>
            {asksFirst && state.phase === 'play' && (
              <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 font-mono text-[0.5rem] uppercase tracking-wider bg-amber text-noir-black px-1 rounded-[1px] whitespace-nowrap">
                asks 1st
              </span>
            )}
            {state.phase === 'vote' && p.hasVoted && (
              <span className="absolute -top-1.5 -right-1 w-3.5 h-3.5 grid place-items-center rounded-full bg-amber text-noir-black text-[0.55rem] font-bold">✓</span>
            )}
            {pickable && (
              <span className="absolute inset-x-1 -bottom-1.5 font-mono text-[0.5rem] uppercase tracking-wide text-amber text-center">accuse</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
