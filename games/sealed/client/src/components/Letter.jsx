import { motion, useReducedMotion } from 'framer-motion';
import { META, Emblem } from '../cards.jsx';

const SIZES = {
  sm: 'w-11 h-[4.3rem] text-[0.5rem]',
  md: 'w-[4.7rem] h-[6.6rem] text-[0.55rem]',
  lg: 'w-32 h-44 sm:w-36 sm:h-48 text-xs',
};

// A single letter card. faceUp + rank => the cream parchment face with its
// engraved emblem and a wax rank-seal; otherwise the guilloché back.
export default function Letter({
  rank, faceUp = false, size = 'md', selectable = false, selected = false,
  dead = false, onClick, delay = 0, label,
}) {
  const c = rank ? META[rank] : null;
  const show = faceUp && c;
  const big = size === 'lg';
  const reduced = useReducedMotion();

  return (
    <motion.button
      type="button"
      disabled={!selectable}
      onClick={onClick}
      aria-label={c ? `${c.name}, rank ${c.rank}` : 'a sealed letter'}
      initial={reduced ? false : { rotateY: 180, y: 16, opacity: 0 }}
      animate={{ rotateY: show ? 0 : 180, y: 0, opacity: 1 }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 24, delay }}
      whileHover={selectable ? { y: -10 } : undefined}
      whileTap={selectable ? { scale: 0.97 } : undefined}
      className={`relative preserve-3d shrink-0 rounded-2xl ${SIZES[size]} ${selectable ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ boxShadow: selected ? `0 0 0 2px ${c?.color || '#e3bd86'}, 0 0 30px -2px ${c?.color || '#e3bd86'}aa` : undefined }}
    >
      {/* Face — parchment */}
      <div
        className="letter-face absolute inset-0 backface-hidden rounded-2xl border p-2 flex flex-col items-center shadow-letter"
        style={{ borderColor: `${c?.color || '#c79a5f'}66`, opacity: dead ? 0.45 : 1, filter: dead ? 'grayscale(0.5)' : 'none' }}
      >
        {/* rank wax seal, top-left */}
        <div className="absolute top-1.5 left-1.5 grid place-items-center rounded-full"
          style={{ width: big ? 22 : 16, height: big ? 22 : 16,
            background: `radial-gradient(circle at 35% 30%, ${c?.color || '#b6384e'}, ${c?.color ? shade(c.color) : '#8d2740'})`,
            color: '#3b2433', boxShadow: '0 1px 3px rgba(0,0,0,0.35)' }}>
          <span className="font-display font-bold leading-none" style={{ fontSize: big ? 12 : 9, color: '#2a1622' }}>{c?.rank}</span>
        </div>
        <div className={`self-end eyebrow !text-[0.46rem] !tracking-[0.18em] ${big ? '!text-[0.55rem]' : ''}`}
          style={{ color: c ? shade(c.color) : '#8d2740' }}>{c?.tag}</div>
        <div className="flex-1 grid place-items-center" style={{ color: c?.color }}>
          <Emblem rank={rank} className={big ? 'w-16 h-16' : 'w-9 h-9'} />
        </div>
        {size !== 'sm' && (
          <div className="font-display font-semibold leading-none text-center text-ink px-0.5"
            style={{ fontSize: big ? '1.15rem' : '0.72rem' }}>{c?.name}</div>
        )}
        {big && <div className="mt-1.5 text-center text-ink-soft leading-snug px-1 text-[0.7rem]">{c?.short}</div>}
        {dead && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-display text-3xl text-wax/70">✕</span>
          </div>
        )}
      </div>

      {/* Back — sealed letter */}
      <div className="letter-back absolute inset-0 backface-hidden rounded-2xl border border-rose/25 grid place-items-center"
        style={{ transform: 'rotateY(180deg)' }}>
        <div className="grid place-items-center rounded-full bg-wax/90 shadow-seal"
          style={{ width: big ? 38 : 24, height: big ? 38 : 24 }}>
          <span className="font-display font-bold text-blush" style={{ fontSize: big ? 18 : 12 }}>S</span>
        </div>
        {label && <span className="absolute bottom-1.5 eyebrow !text-[0.4rem] text-rose/60">{label}</span>}
      </div>
    </motion.button>
  );
}

// A slightly deeper shade of an accent for seals / fine print.
function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) - 60);
  const g = Math.max(0, ((n >> 8) & 255) - 60);
  const b = Math.max(0, (n & 255) - 60);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
