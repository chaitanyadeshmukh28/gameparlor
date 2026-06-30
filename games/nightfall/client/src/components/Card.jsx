import { motion } from 'framer-motion';
import { Emblem } from '../emblems.jsx';
import { ROLES, roleName } from '../game-meta.js';

const SIZES = {
  sm: 'w-12 h-[4.6rem] text-[0.5rem]',
  md: 'w-[4.6rem] h-[6.6rem] sm:w-24 sm:h-36 text-[0.58rem] sm:text-[0.7rem]',
  lg: 'w-28 h-40 sm:w-32 sm:h-48 text-xs',
};

// A single role card. faceUp + role => the engraved portrait; otherwise the
// silver guilloché back. `dead` dims and crosses out an eliminated card.
export default function Card({ role, faceUp = false, dead = false, size = 'md', selectable, selected, onClick, label, delay = 0 }) {
  const r = role ? ROLES[role] : null;
  const show = faceUp && role;
  const color = r?.color ?? '#8ea2ff';

  return (
    <motion.button
      type="button"
      disabled={!selectable}
      onClick={onClick}
      aria-label={show ? roleName(role) : (label || 'Hidden card')}
      initial={{ rotateY: 180, y: 12, opacity: 0 }}
      animate={{ rotateY: show ? 0 : 180, y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 210, damping: 24, delay }}
      whileHover={selectable ? { y: -7 } : undefined}
      className={`relative preserve-3d shrink-0 rounded-xl ${SIZES[size]} ${selectable ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-frost' : 'cursor-default'}`}
      style={{ boxShadow: selected ? `0 0 0 2px ${color}, 0 0 24px -2px ${color}aa` : undefined }}
    >
      {/* Face */}
      <div
        aria-hidden={!show}
        className="absolute inset-0 backface-hidden rounded-xl border p-1.5 sm:p-2 flex flex-col"
        style={{
          background: r
            ? `linear-gradient(165deg, ${color}2e, #0c1130 62%), radial-gradient(120% 80% at 50% 0%, ${color}33, transparent 60%)`
            : '#0c1130',
          borderColor: r ? `${color}88` : 'rgba(238,241,251,0.15)',
          opacity: dead ? 0.45 : 1,
          filter: dead ? 'grayscale(0.5)' : 'none',
        }}
      >
        {/* Only tag a team when a real role is shown — a face-down card must not
            leak a stray "Village" into the DOM / screen readers (QA #11). */}
        {r && (
          <div className="font-mono uppercase tracking-[0.15em] !text-[0.42rem] sm:!text-[0.5rem] self-start opacity-80" style={{ color }}>
            {r.team === 'werewolf' ? 'Werewolf' : r.team === 'outcast' ? 'Tanner' : 'Village'}
          </div>
        )}
        <div className="flex-1 grid place-items-center" style={{ color }}>
          <Emblem name={role} className="w-3/5 h-3/5 drop-shadow" />
        </div>
        <div className="text-center font-display font-semibold leading-tight" style={{ color: '#eef1fb' }}>
          {r?.name}
        </div>
        {size !== 'sm' && r?.flavor && (
          <div className="text-center font-mono !text-[0.4rem] sm:!text-[0.46rem] uppercase tracking-[0.12em] leading-none opacity-60" style={{ color }}>
            {r.flavor}
          </div>
        )}
        {dead && (
          <div className="absolute inset-0 grid place-items-center">
            <motion.span
              className="font-display text-3xl text-blood-bright/90"
              initial={{ scale: 2.4, opacity: 0, rotate: -18 }}
              animate={{ scale: 1, opacity: 1, rotate: -8 }}
              transition={{ type: 'spring', stiffness: 600, damping: 16, delay: delay + 0.25 }}
            >
              ✕
            </motion.span>
          </div>
        )}
      </div>

      {/* Back — a silver crescent on the indigo guilloché */}
      <div
        aria-hidden={show}
        className="absolute inset-0 backface-hidden rounded-xl border border-frost/30 card-back grid place-items-center"
        style={{ transform: 'rotateY(180deg)' }}
      >
        <svg viewBox="0 0 48 48" className="w-7 h-7 text-frost/55" fill="currentColor">
          <path d="M30 7 A18 18 0 1 0 30 41 A14 14 0 1 1 30 7 Z" />
        </svg>
      </div>
    </motion.button>
  );
}
