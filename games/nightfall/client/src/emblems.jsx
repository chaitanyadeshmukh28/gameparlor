// Engraved single-stroke emblems for Nightfall, one per role. Drawn on a 48x48
// grid; they inherit `currentColor` so each card tints them to its role color.
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function Emblem({ name, className }) {
  const props = { viewBox: '0 0 48 48', className, ...S };
  switch (name) {
    case 'werewolf': // a fanged wolf's muzzle beneath the moon
      return (
        <svg {...props}>
          <path d="M10 14 L16 26 L13 38 L24 32 L35 38 L32 26 L38 14 L30 20 L24 13 L18 20 Z" />
          <path d="M20 29 L22 34 M28 29 L26 34" />
          <circle cx="19" cy="24" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="29" cy="24" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'seer': // an all-seeing eye with a star at its heart
      return (
        <svg {...props}>
          <path d="M6 24 C13 14 35 14 42 24 C35 34 13 34 6 24 Z" />
          <circle cx="24" cy="24" r="5.5" />
          <path d="M24 19 L24 29 M19 24 L29 24 M20.5 20.5 L27.5 27.5 M27.5 20.5 L20.5 27.5" strokeWidth="1.1" />
        </svg>
      );
    case 'robber': // a domino mask
      return (
        <svg {...props}>
          <path d="M7 19 C7 16 10 15 14 15 L34 15 C38 15 41 16 41 19 C41 27 36 30 31 30 C27 30 26 26 24 26 C22 26 21 30 17 30 C12 30 7 27 7 19 Z" />
          <circle cx="16" cy="21" r="2.4" /><circle cx="32" cy="21" r="2.4" />
          <path d="M7 19 L3 16 M41 19 L45 16" strokeWidth="1.2" />
        </svg>
      );
    case 'troublemaker': // two cards mid-swap
      return (
        <svg {...props}>
          <rect x="9" y="13" width="13" height="19" rx="2" transform="rotate(-9 15 22)" />
          <rect x="26" y="16" width="13" height="19" rx="2" transform="rotate(9 32 25)" />
          <path d="M14 38 C20 41 28 41 34 38" strokeWidth="1.2" />
          <path d="M34 38 L31 36 M34 38 L32 41" strokeWidth="1.2" />
        </svg>
      );
    case 'insomniac': // a wide-open eye ringed by a crescent
      return (
        <svg {...props}>
          <path d="M8 24 C15 16 33 16 40 24 C33 32 15 32 8 24 Z" />
          <circle cx="24" cy="24" r="4.2" fill="currentColor" stroke="none" />
          <path d="M14 13 L13 9 M24 11 L24 7 M34 13 L35 9" strokeWidth="1.2" />
          <path d="M14 35 L13 39 M24 37 L24 41 M34 35 L35 39" strokeWidth="1.2" />
        </svg>
      );
    case 'villager': // a cottage with a glowing hearth
      return (
        <svg {...props}>
          <path d="M9 23 L24 11 L39 23" />
          <path d="M13 23 V38 H35 V23" />
          <path d="M21 38 V29 H27 V38" />
          <path d="M24 31 v3" strokeWidth="1.1" />
        </svg>
      );
    case 'tanner': // a hangman's noose — the Tanner's fate
      return (
        <svg {...props}>
          <path d="M24 6 V14" />
          <ellipse cx="24" cy="24" rx="8" ry="10" />
          <path d="M18 30 L30 30 M19 32.5 L29 32.5 M20 35 L28 35" strokeWidth="1.1" />
          <path d="M24 14 C19 14 19 20 24 20" />
        </svg>
      );
    case 'moon': // a craterd full moon
      return (
        <svg {...props}>
          <circle cx="24" cy="24" r="16" />
          <circle cx="18" cy="19" r="3" /><circle cx="30" cy="28" r="4" /><circle cx="29" cy="16" r="1.6" />
        </svg>
      );
    case 'eye': // a simple watching eye for "someone stirs"
      return (
        <svg {...props}>
          <path d="M6 24 C13 15 35 15 42 24 C35 33 13 33 6 24 Z" />
          <circle cx="24" cy="24" r="4.5" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="24" cy="24" r="14" />
        </svg>
      );
  }
}

// A row of gothic village rooftops, silhouetted against the night.
export function Rooftops({ className = '', fill = '#05070f' }) {
  return (
    <svg className={className} viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden>
      <path
        fill={fill}
        d="M0 120 L0 78 L24 78 L40 56 L56 78 L70 78 L70 66 L84 66 L84 50 L92 42 L100 50 L100 66 L120 66
           L120 84 L138 84 L150 60 L162 84 L182 84 L182 72 L196 72 L208 52 L220 72 L234 72 L234 82
           L256 82 L268 58 L280 82 L300 82 L300 70 L312 70 L312 54 L320 46 L328 54 L328 70 L348 70
           L360 50 L372 70 L400 70 L400 120 Z"
      />
      {/* a few lit windows flickering in the dark */}
      <g fill="#f0c070" opacity="0.85">
        <rect className="twinkle" x="46" y="64" width="4" height="5" />
        <rect className="twinkle" x="144" y="70" width="4" height="6" style={{ animationDelay: '1.2s' }} />
        <rect className="twinkle" x="262" y="68" width="4" height="6" style={{ animationDelay: '2.1s' }} />
        <rect className="twinkle" x="354" y="60" width="4" height="6" style={{ animationDelay: '0.6s' }} />
      </g>
    </svg>
  );
}
