// Presentation-only card + chip components. The server is the source of truth
// for every card; this just draws them. Classic ivory playing cards with
// red/black pips, and a gilt art-deco back for face-down cards.
import { motion } from 'framer-motion';

const SUIT = {
  S: { glyph: '♠', red: false },
  H: { glyph: '♥', red: true },
  D: { glyph: '♦', red: true },
  C: { glyph: '♣', red: false },
};

const SIZES = {
  sm: { w: 'w-9',  h: 'h-[3.25rem]', rank: 'text-[0.8rem]', pip: 'text-lg',  pad: 'p-1' },
  md: { w: 'w-12', h: 'h-[4.5rem]',  rank: 'text-base',     pip: 'text-2xl', pad: 'p-1.5' },
  lg: { w: 'w-16', h: 'h-24',        rank: 'text-xl',       pip: 'text-4xl', pad: 'p-2' },
};

// A deco gilt card-back for face-down cards (the dealer's hole).
export function CardBack({ size = 'md' }) {
  const s = SIZES[size];
  return (
    <div className={`${s.w} ${s.h} relative rounded-lg border border-gild/50 overflow-hidden shadow-card`}
      style={{ background: 'linear-gradient(140deg, #0e4a35, #063324 60%, #04211a)' }}>
      <div className="absolute inset-1 rounded-md border border-gild/40" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="rotate-45 w-1/2 h-1/2 border-2 border-gild/45 rounded-sm" />
      </div>
      <div className="absolute inset-0 grid place-items-center text-gild/80 font-display text-lg">21</div>
    </div>
  );
}

export function Card({ card, faceDown, size = 'md', dim, className = '' }) {
  const s = SIZES[size];
  if (faceDown || !card) return <div className={className}><CardBack size={size} /></div>;
  const suit = SUIT[card.suit] || SUIT.S;
  const color = suit.red ? 'text-pip-red' : 'text-pip-ink';
  return (
    <div
      className={`${s.w} ${s.h} ${s.pad} relative rounded-lg bg-card-face text-pip-ink
        border border-card-edge shadow-card flex flex-col justify-between font-card
        ${dim ? 'opacity-55 saturate-50' : ''} ${className}`}
    >
      <div className={`${s.rank} ${color} leading-none font-bold flex flex-col items-center w-fit`}>
        <span>{card.rank}</span>
        <span className="leading-none">{suit.glyph}</span>
      </div>
      <div className={`${s.pip} ${color} self-center leading-none`}>{suit.glyph}</div>
      <div className={`${s.rank} ${color} leading-none font-bold flex flex-col items-center w-fit self-end rotate-180`}>
        <span>{card.rank}</span>
        <span className="leading-none">{suit.glyph}</span>
      </div>
    </div>
  );
}

// A dealt card that flips/slides in.
export function DealtCard({ card, faceDown, size = 'md', delay = 0, dim }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -18, rotate: -6 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay }}
    >
      <Card card={card} faceDown={faceDown} size={size} dim={dim} />
    </motion.div>
  );
}

// A casino chip token showing a value; color keyed to denomination.
export function Chip({ value, size = 40 }) {
  const tone =
    value >= 100 ? { a: '#20232a', b: '#3a3f4b', ring: '#e8c877' }
    : value >= 50 ? { a: '#8d2740', b: '#c0392b', ring: '#f6e2a6' }
    : value >= 25 ? { a: '#0e4a35', b: '#1c7a55', ring: '#f6e2a6' }
    : { a: '#c99a3f', b: '#e8c877', ring: '#fff6df' };
  return (
    <div className="relative grid place-items-center shrink-0 shadow-chip rounded-full"
      style={{ width: size, height: size,
        background: `radial-gradient(circle at 50% 38%, ${tone.b}, ${tone.a})`,
        border: `2px dashed ${tone.ring}` }}>
      <span className="font-body font-bold text-[0.62rem] text-white/95 drop-shadow">{value}</span>
    </div>
  );
}

// The gilt deco fan behind the dealer — the game's signature flourish.
export function DecoFan({ className = '' }) {
  return (
    <svg viewBox="0 0 120 60" className={className} fill="none" aria-hidden>
      <g stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.9">
        {Array.from({ length: 11 }).map((_, i) => {
          const a = (Math.PI * i) / 10;
          return <line key={i} x1="60" y1="58" x2={60 - Math.cos(a) * 56} y2={58 - Math.sin(a) * 52} />;
        })}
        <path d="M8 58 A56 52 0 0 1 112 58" />
        <path d="M22 58 A40 37 0 0 1 98 58" opacity="0.6" />
      </g>
    </svg>
  );
}
