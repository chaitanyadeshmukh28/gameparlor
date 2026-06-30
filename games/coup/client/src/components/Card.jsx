import { motion } from 'framer-motion';
import { Emblem } from '../emblems.jsx';
import { CHARACTERS } from '../game-meta.js';

const SIZES = {
  sm: 'w-12 h-[4.4rem] sm:w-16 sm:h-24 text-[0.5rem] sm:text-[0.55rem]',
  md: 'w-[4.5rem] h-[6.4rem] sm:w-28 sm:h-40 text-[0.6rem] sm:text-xs',
  lg: 'w-28 h-40 sm:w-36 sm:h-52 text-xs sm:text-sm',
};

// A single character card. faceUp + char => the engraved portrait; otherwise
// the guilloché back. `dead` dims and crosses out a revealed (lost) card.
export default function Card({ char, faceUp = false, dead = false, size = 'md', selectable, selected, onClick, delay = 0 }) {
  const c = char ? CHARACTERS[char] : null;
  const show = faceUp && char;

  return (
    <motion.button
      type="button"
      disabled={!selectable}
      onClick={onClick}
      initial={{ rotateY: 180, y: 14, opacity: 0 }}
      animate={{ rotateY: show ? 0 : 180, y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26, delay }}
      whileHover={selectable ? { y: -8 } : undefined}
      className={`relative preserve-3d shrink-0 rounded-xl ${SIZES[size]} ${selectable ? 'cursor-pointer' : 'cursor-default'}`}
      style={{
        boxShadow: selected ? '0 0 0 2px #e8cd72, 0 0 28px -2px rgba(232,205,114,0.6)' : undefined,
      }}
    >
      {/* Face */}
      <div
        className="absolute inset-0 backface-hidden rounded-xl border p-2 flex flex-col"
        style={{
          background: c
            ? `linear-gradient(165deg, ${c.color}26, #1a0f17 60%), radial-gradient(120% 80% at 50% 0%, ${c.color}33, transparent 60%)`
            : '#1a0f17',
          borderColor: c ? `${c.color}77` : 'rgba(236,224,200,0.15)',
          opacity: dead ? 0.4 : 1,
          filter: dead ? 'grayscale(0.6)' : 'none',
        }}
      >
        <div className="eyebrow !text-[0.5rem] self-start" style={{ color: c?.color }}>{c?.tag}</div>
        <div className="flex-1 grid place-items-center" style={{ color: c?.color }}>
          <Emblem name={char} className="w-3/5 h-3/5 drop-shadow" />
        </div>
        <div className="text-center font-display font-semibold leading-tight" style={{ color: '#ece0c8' }}>
          {c?.name}
        </div>
        {size !== 'sm' && c && (
          <div className="mt-1 text-center text-parch-dim leading-tight !text-[0.6rem] hidden sm:block">{c.ability}</div>
        )}
        {dead && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-display text-3xl text-assassin/80">✕</span>
          </div>
        )}
      </div>

      {/* Back */}
      <div
        className="absolute inset-0 backface-hidden rounded-xl border border-gilt/30 card-back grid place-items-center"
        style={{ transform: 'rotateY(180deg)' }}
      >
        <div className="text-gilt/50">
          <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M24 6 L40 24 L24 42 L8 24 Z" /><path d="M24 14 L32 24 L24 34 L16 24 Z" />
          </svg>
        </div>
      </div>
    </motion.button>
  );
}
