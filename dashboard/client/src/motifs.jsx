// Engraved single-stroke motifs, one per game, drawn on a 48×48 grid. They
// inherit `currentColor`, so each tile tints its motif to the game's accent.
// Drawn by hand here — no copied artwork.
const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function Motif({ name, className }) {
  const p = { viewBox: '0 0 48 48', className, ...S };
  switch (name) {
    case 'coup': // a coronet — court intrigue
      return (
        <svg {...p}>
          <path d="M9 32 L12 16 L19 25 L24 12 L29 25 L36 16 L39 32 Z" />
          <path d="M9 36 H39" />
          <circle cx="12" cy="14" r="1.4" />
          <circle cx="24" cy="10" r="1.4" />
          <circle cx="36" cy="14" r="1.4" />
        </svg>
      );
    case 'nightfall': // a crescent moon and stars
      return (
        <svg {...p}>
          <path d="M32 9 A15 15 0 1 0 32 39 A11.5 11.5 0 1 1 32 9 Z" />
          <path d="M14 12 v4 M12 14 h4" />
          <path d="M16 30 v3 M14.5 31.5 h3" />
        </svg>
      );
    case 'cipher': // a codeword grid, one cell ringed
      return (
        <svg {...p}>
          {[14, 24, 34].map((y) =>
            [14, 24, 34].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" />)
          )}
          <rect x="29" y="9" width="10" height="10" rx="2.5" />
        </svg>
      );
    case 'council': // a wax seal with ribbon tails
      return (
        <svg {...p}>
          <circle cx="24" cy="19" r="11" />
          <path d="M24 12 l2.2 4.5 4.8 0.6 -3.5 3.4 0.9 4.9 -4.4 -2.3 -4.4 2.3 0.9 -4.9 -3.5 -3.4 4.8 -0.6 Z" />
          <path d="M18 29 L15 42 L21 38 L24 30" />
          <path d="M30 29 L33 42 L27 38 L24 30" />
        </svg>
      );
    case 'undercover': // a domino mask — the spy among us
      return (
        <svg {...p}>
          <path d="M7 19 C7 14 14 13 24 13 C34 13 41 14 41 19 C41 27 33 28 28 23 C25.5 20.5 22.5 20.5 20 23 C15 28 7 27 7 19 Z" />
          <circle cx="16" cy="19" r="2.2" />
          <circle cx="32" cy="19" r="2.2" />
        </svg>
      );
    case 'sealed': // a sealed love letter
      return (
        <svg {...p}>
          <rect x="8" y="13" width="32" height="23" rx="2.5" />
          <path d="M8 16 L24 27 L40 16" />
          <path d="M24 30 c-2.4 -2.6 -5 -1 -5 1.4 0 1.8 2.4 3.4 5 5 2.6 -1.6 5 -3.2 5 -5 0 -2.4 -2.6 -4 -5 -1.4 Z" />
        </svg>
      );
    case 'quest': // crossed swords — Arthurian missions
      return (
        <svg {...p}>
          <path d="M13 36 L33 14" />
          <path d="M33 14 L30 12 M33 14 L35 17" />
          <path d="M10 31 L17 38" />
          <circle cx="11.5" cy="37.5" r="1.6" />
          <path d="M35 36 L15 14" />
          <path d="M15 14 L18 12 M15 14 L13 17" />
          <path d="M38 31 L31 38" />
          <circle cx="36.5" cy="37.5" r="1.6" />
        </svg>
      );
    case 'intercept': // a signal tower transmitting
      return (
        <svg {...p}>
          <path d="M24 14 L15 40 M24 14 L33 40" />
          <path d="M19.5 27 H28.5" />
          <path d="M17.2 33 H30.8" />
          <path d="M14 40 H34" />
          <path d="M24 14 V8" />
          <path d="M18 9 Q24 4 30 9" />
          <path d="M14.5 6.5 Q24 -0.5 33.5 6.5" />
        </svg>
      );
    default:
      return null;
  }
}

// The Parlor signature: an art-deco sunburst behind the wordmark.
export function Sunburst({ className }) {
  const rays = Array.from({ length: 24 }, (_, i) => i);
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" aria-hidden>
      {rays.map((i) => {
        const a = (i / rays.length) * Math.PI * 2;
        const long = i % 2 === 0;
        const r1 = 30;
        const r2 = long ? 56 : 44;
        return (
          <line
            key={i}
            x1={60 + Math.cos(a) * r1}
            y1={60 + Math.sin(a) * r1}
            x2={60 + Math.cos(a) * r2}
            y2={60 + Math.sin(a) * r2}
            stroke="currentColor"
            strokeWidth={long ? 1.3 : 0.7}
            strokeLinecap="round"
          />
        );
      })}
      <circle cx="60" cy="60" r="25" stroke="currentColor" strokeWidth="1" />
      <circle cx="60" cy="60" r="20" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
    </svg>
  );
}
