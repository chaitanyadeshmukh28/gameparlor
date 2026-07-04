// Presentation-only card, chip, medallion and timer components. The server is
// the source of truth for every card; this only draws them. "Lacquer & Bone":
// bone card-stock with red/black ink, brass guilloché backs, the whole thing
// staged on black lacquer and champagne brass.
import { motion } from 'framer-motion';

const SUIT = {
  S: { glyph: '♠', red: false, name: 'spades' },
  H: { glyph: '♥', red: true, name: 'hearts' },
  D: { glyph: '♦', red: true, name: 'diamonds' },
  C: { glyph: '♣', red: false, name: 'clubs' },
};
const FACE = { J: 'Jack', Q: 'Queen', K: 'King', A: 'Ace' };

const SIZES = {
  xs: { w: 30, h: 44, r: 5, idx: 'text-[0.62rem]', mid: 'text-lg',  face: 'text-lg' },
  sm: { w: 40, h: 58, r: 6, idx: 'text-[0.72rem]', mid: 'text-2xl', face: 'text-2xl' },
  md: { w: 52, h: 74, r: 7, idx: 'text-sm',        mid: 'text-4xl', face: 'text-3xl' },
  lg: { w: 66, h: 94, r: 9, idx: 'text-base',      mid: 'text-5xl', face: 'text-4xl' },
};

// A brass guilloché card-back for face-down cards (the dealer's hole).
export function CardBack({ size = 'md' }) {
  const s = SIZES[size];
  return (
    <div className="relative shadow-card" style={{ width: s.w, height: s.h, borderRadius: s.r,
      background: 'linear-gradient(150deg, #2b2118, #15100d 65%, #0d0a08)', border: '1px solid rgba(217,178,106,0.55)' }}>
      <svg viewBox="0 0 52 74" className="absolute inset-0 w-full h-full text-brass" fill="none" preserveAspectRatio="none">
        <rect x="3" y="3" width="46" height="68" rx="4" stroke="currentColor" strokeOpacity="0.5" />
        <g stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.6">
          {Array.from({ length: 16 }).map((_, i) => {
            const a = (Math.PI * 2 * i) / 16;
            return <line key={i} x1="26" y1="37" x2={26 + Math.cos(a) * 20} y2={37 + Math.sin(a) * 26} />;
          })}
          <circle cx="26" cy="37" r="12" />
          <circle cx="26" cy="37" r="7" />
        </g>
        <text x="26" y="41" textAnchor="middle" className="font-display" fill="currentColor" fontSize="10">21</text>
      </svg>
    </div>
  );
}

function CornerIndex({ card, suit, color, cls, corner }) {
  return (
    <div className={`absolute ${corner} ${cls} ${color} font-card font-bold leading-[0.85] flex flex-col items-center
      ${corner.includes('bottom') ? 'rotate-180' : ''}`}>
      <span>{card.rank}</span>
      <span className="leading-none">{suit.glyph}</span>
    </div>
  );
}

export function Card({ card, faceDown, size = 'md', dim, className = '' }) {
  const s = SIZES[size];
  if (faceDown || !card) return <div className={className}><CardBack size={size} /></div>;
  const suit = SUIT[card.suit] || SUIT.S;
  const color = suit.red ? 'text-pip-red' : 'text-pip-ink';
  const isFace = card.rank === 'J' || card.rank === 'Q' || card.rank === 'K';
  const isAce = card.rank === 'A';
  return (
    <div className={`relative overflow-hidden ${dim ? 'opacity-60 saturate-[0.6]' : ''} ${className}`}
      style={{ width: s.w, height: s.h, borderRadius: s.r, background: 'linear-gradient(160deg, #f7f1e2, #f1e9d6 55%, #e6dcc4)',
        border: '1px solid #c8bd9f', boxShadow: '0 12px 26px -12px rgba(0,0,0,0.85), 0 1px 0 rgba(255,255,255,0.7) inset' }}>
      <CornerIndex card={card} suit={suit} color={color} cls={`${s.idx} top-1 left-1`} corner="top-1 left-1" />
      <CornerIndex card={card} suit={suit} color={color} cls={`${s.idx} bottom-1 right-1`} corner="bottom-1 right-1" />
      <div className="absolute inset-0 grid place-items-center">
        {isFace ? (
          <div className={`flex flex-col items-center ${color}`}>
            <span className="text-brass-deep -mb-1" style={{ fontSize: s.w * 0.24 }}>{card.rank === 'J' ? '♟' : '♛'}</span>
            <span className={`${s.face} font-card font-bold leading-none`}>{card.rank}</span>
            <span className="leading-none" style={{ fontSize: s.w * 0.22 }}>{suit.glyph}</span>
          </div>
        ) : isAce ? (
          <span className={`${color} leading-none`} style={{ fontSize: s.w * 0.62 }}>{suit.glyph}</span>
        ) : (
          <span className={`${s.mid} ${color} leading-none`}>{suit.glyph}</span>
        )}
      </div>
    </div>
  );
}

// A card that deals in with a slide + settle.
export function DealtCard({ card, faceDown, size = 'md', delay = 0, dim }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -22, x: 10, rotate: -8 }}
      animate={{ opacity: 1, y: 0, x: 0, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 20, delay }}
    >
      <Card card={card} faceDown={faceDown} size={size} dim={dim} />
    </motion.div>
  );
}

// The dealer's hole: shows a brass back, then flips to reveal the card.
export function HoleCard({ card, size = 'md', delay = 0 }) {
  const revealed = !!card;
  return (
    <div style={{ perspective: 600 }}>
      <motion.div style={{ transformStyle: 'preserve-3d', position: 'relative' }}
        animate={{ rotateY: revealed ? 0 : 180 }} initial={false}
        transition={{ type: 'spring', stiffness: 140, damping: 18, delay }}>
        <div style={{ backfaceVisibility: 'hidden' }}><Card card={card || { rank: 'A', suit: 'S' }} size={size} /></div>
        <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', position: 'absolute', inset: 0 }}>
          <CardBack size={size} />
        </div>
      </motion.div>
    </div>
  );
}

// ---- chips -----------------------------------------------------------------
export const CHIP_TONES = {
  10:  { a: '#e8c877', b: '#c99a3f', ring: '#fff6df', text: '#3a2c10' },
  25:  { a: '#1c7a55', b: '#0e4a35', ring: '#eafff4', text: '#eafff4' },
  50:  { a: '#c0392b', b: '#8d2740', ring: '#ffe7e2', text: '#fff' },
  100: { a: '#3a3f4b', b: '#20232a', ring: '#e8c877', text: '#f0d79a' },
};
const toneFor = (v) => v >= 100 ? CHIP_TONES[100] : v >= 50 ? CHIP_TONES[50] : v >= 25 ? CHIP_TONES[25] : CHIP_TONES[10];

export function Chip({ value, size = 40, label }) {
  const t = toneFor(value);
  return (
    <div className="relative grid place-items-center shrink-0 shadow-chip rounded-full"
      style={{ width: size, height: size, background: `radial-gradient(circle at 50% 36%, ${t.a}, ${t.b})`, border: `2px solid ${t.ring}` }}>
      <span aria-hidden className="absolute rounded-full" style={{ inset: size * 0.14, border: `1px dashed ${t.ring}`, opacity: 0.7 }} />
      <span className="font-data font-bold leading-none" style={{ color: t.text, fontSize: size * 0.3 }}>{label ?? value}</span>
    </div>
  );
}

// A wager rendered as a little stack of denomination chips (visual sugar).
export function ChipStack({ amount, size = 26 }) {
  const denoms = [100, 50, 25, 10];
  const chips = [];
  let rem = amount;
  for (const d of denoms) { while (rem >= d && chips.length < 6) { chips.push(d); rem -= d; } }
  if (!chips.length) return null;
  return (
    <div className="relative" style={{ width: size, height: size + (chips.length - 1) * 3 }}>
      {chips.map((d, i) => (
        <div key={i} className="absolute left-0" style={{ bottom: i * 3 }}><Chip value={d} size={size} /></div>
      ))}
    </div>
  );
}

// ---- the signature: a brass "21" deco medallion behind the dealer ----------
export function DecoMedallion({ className = '', glow = false }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" aria-hidden>
      <g stroke="currentColor" strokeWidth="1">
        {Array.from({ length: 48 }).map((_, i) => {
          const a = (Math.PI * 2 * i) / 48;
          const r1 = i % 2 ? 66 : 74;
          return <line key={i} x1={100 + Math.cos(a) * 82} y1={100 + Math.sin(a) * 82} x2={100 + Math.cos(a) * r1} y2={100 + Math.sin(a) * r1} opacity="0.7" />;
        })}
        <circle cx="100" cy="100" r="60" opacity="0.85" />
        <circle cx="100" cy="100" r="54" opacity="0.5" />
        <circle cx="100" cy="100" r="88" opacity="0.5" />
      </g>
      <text x="100" y="118" textAnchor="middle" className="font-display" fill="currentColor" fontSize="52"
        opacity={glow ? 1 : 0.9}>21</text>
    </svg>
  );
}

// ---- countdown ring --------------------------------------------------------
export function TimerRing({ frac, seconds, size = 34, urgent }) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const stroke = urgent ? '#ce2b37' : '#d9b26a';
  return (
    <div className="relative grid place-items-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(217,178,106,0.18)" strokeWidth="3" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={stroke} strokeWidth="3" fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, frac)))}
          style={{ transition: 'stroke-dashoffset 0.25s linear' }} />
      </svg>
      <span className={`absolute font-data font-bold text-[0.6rem] ${urgent ? 'text-vermillion' : 'text-brass'}`}>{seconds}</span>
    </div>
  );
}
