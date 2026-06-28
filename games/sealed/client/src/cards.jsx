// Shared client metadata for the eight cards — canonical Love Letter names with
// an evocative tag, a strongly distinct color, and a bold, high-clarity emblem
// each (original inline SVG). The server is the source of truth for effects;
// this is presentation only.
//
// Color is a primary identifier here: every card reads by hue at a glance, with
// the Princess an unmistakable ruby red. Each emblem is a simple silhouette so
// players recognize a card without reading the name.

export const META = {
  1: { rank: 1, name: 'Guard',    tag: 'Rumor',    count: 5, color: '#2f6fd0',
       short: 'Name a rank (2–8). Guess a rival’s card correctly and they’re out.',
       prompt: 'A rumor only stings when it lands. Whom do you suspect they hold?' },
  2: { rank: 2, name: 'Priest',   tag: 'Glance',   count: 2, color: '#9456c7',
       short: 'Look at one rival’s hand.',
       prompt: 'Lean close. Whose hand shall you read?' },
  3: { rank: 3, name: 'Baron',    tag: 'Compare',  count: 2, color: '#c8742a',
       short: 'Compare hands with a rival; the lower hand is out.',
       prompt: 'A measured duel of hearts. Choose your rival.' },
  4: { rank: 4, name: 'Handmaid', tag: 'Shield',   count: 2, color: '#2fa15a',
       short: 'You cannot be targeted until your next turn.',
       prompt: 'Raise your guard — none may approach you.' },
  5: { rank: 5, name: 'Prince',   tag: 'Discard',  count: 2, color: '#13a6a6',
       short: 'Force a player (even yourself) to discard their hand and redraw.',
       prompt: 'Spoil a courtship. Whose letter must be torn?' },
  6: { rank: 6, name: 'King',     tag: 'Trade',    count: 1, color: '#d29a23',
       short: 'Trade hands with another player.',
       prompt: 'An exchange of fates. With whom do you trade?' },
  7: { rank: 7, name: 'Countess', tag: 'Caution',  count: 1, color: '#c0468f',
       short: 'Must be discarded if held with the King or the Prince.',
       prompt: 'She prefers a quiet exit.' },
  8: { rank: 8, name: 'Princess', tag: 'Devotion', count: 1, color: '#e0263f',
       short: 'If you ever discard her, you’re out.',
       prompt: 'Guard her above all.' },
};

export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8];

// Bold, simple, instantly-readable silhouettes. Each inherits `currentColor`
// (set by the card to its hue); faint white overlays add inner detail that
// reads on any color.
export function Emblem({ rank, className }) {
  const p = { viewBox: '0 0 48 48', className };
  const veil = 'rgba(255,255,255,0.5)';
  switch (Number(rank)) {
    case 1: // Guard — a shield
      return (
        <svg {...p} fill="currentColor">
          <path d="M24 4 L41 10 V25 C41 34.6 33.4 41.7 24 44.5 C14.6 41.7 7 34.6 7 25 V10 Z" />
          <path d="M24 12 L33 15 V25 C33 30.5 28.8 34.6 24 36.5 C19.2 34.6 15 30.5 15 25 V15 Z"
            fill={veil} />
        </svg>
      );
    case 2: // Priest — an eye
      return (
        <svg {...p} fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round">
          <path d="M5 24 C13 14.5 35 14.5 43 24 C35 33.5 13 33.5 5 24 Z" />
          <circle cx="24" cy="24" r="4.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case 3: // Baron — crossed swords
      return (
        <svg {...p} stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" fill="currentColor">
          <line x1="13" y1="11" x2="33" y2="31" /><line x1="35" y1="11" x2="15" y2="31" />
          <line x1="9" y1="31" x2="19" y2="29" /><line x1="39" y1="31" x2="29" y2="29" />
          <circle cx="13" cy="11" r="2.6" stroke="none" /><circle cx="35" cy="11" r="2.6" stroke="none" />
        </svg>
      );
    case 4: // Handmaid — a fan
      return (
        <svg {...p}>
          <path fill="currentColor" d="M24 39 L9 17 A17 17 0 0 1 39 17 Z" />
          <circle cx="24" cy="39" r="2.6" fill="currentColor" />
          <g stroke={veil} strokeWidth="1.5" strokeLinecap="round">
            <path d="M24 38 L15 20 M24 38 L24 16 M24 38 L33 20" />
          </g>
        </svg>
      );
    case 5: // Prince — a coronet (small crown)
      return (
        <svg {...p} fill="currentColor">
          <path d="M10 33 L10 19 L18 25 L24 15 L30 25 L38 19 L38 33 Z" />
          <rect x="9" y="33" width="30" height="5" rx="1.6" />
        </svg>
      );
    case 6: // King — a full crown with jewels
      return (
        <svg {...p} fill="currentColor">
          <path d="M6 32 L6 15 L14 22 L19 12 L24 19 L29 12 L34 22 L42 15 L42 32 Z" />
          <rect x="5" y="32" width="38" height="6" rx="2" />
          <circle cx="19" cy="10" r="2.1" /><circle cx="29" cy="10" r="2.1" />
        </svg>
      );
    case 7: // Countess — a plume feather
      return (
        <svg {...p}>
          <path fill="currentColor" d="M32 8 C19 13 13 25 14 37 C26 33 35 23 37 11 C36 10 34 9 32 8 Z" />
          <path stroke={veil} strokeWidth="1.6" strokeLinecap="round" fill="none" d="M30 12 L16 35" />
          <path stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" d="M16 35 L12 41" />
        </svg>
      );
    case 8: // Princess — a crowned heart (the prize)
      return (
        <svg {...p} fill="currentColor">
          <path d="M24 43 C7 30 8 16 17 13 C22.4 11.3 24 16 24 18 C24 16 25.6 11.3 31 13 C40 16 41 30 24 43 Z" />
          <path d="M15 11 L18.5 14.5 L24 8.5 L29.5 14.5 L33 11 L31.6 6 L28.4 9.5 L24 4.5 L19.6 9.5 L16.4 6 Z" />
        </svg>
      );
    default:
      return null;
  }
}

// A small wax-seal heart used for Favor tokens (the hearts on the leaderboard).
export function SealMark({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 21 C5 15 5.5 8.5 9 7.2 C11 6.4 12 8.4 12 9.2 C12 8.4 13 6.4 15 7.2 C18.5 8.5 19 15 12 21 Z" />
    </svg>
  );
}
