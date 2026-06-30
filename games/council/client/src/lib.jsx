// Shared vocabulary, flavor, and engraved SVG emblems for The Council.

export const ROLES = {
  liberal: { name: 'Liberal', team: 'good', tag: 'Keep the Council honest.' },
  fascist: { name: 'Fascist', team: 'bad', tag: 'Sow chaos. Shield Hitler.' },
  hitler:  { name: 'Hitler', team: 'bad', tag: 'Get yourself elected Chancellor.' },
};

// Graceful fallbacks: an unknown role/power key (e.g. a stale server speaking an
// older vocabulary) degrades to a neutral label instead of crashing the tree.
export const FALLBACK_ROLE = { name: 'Member', team: 'good', tag: '' };
export const FALLBACK_POWER = { name: 'Executive Power', verb: 'Act', hint: 'Wield this power.' };
export const roleOf = (key) => ROLES[key] ?? FALLBACK_ROLE;
export const powerOf = (key) => POWERS[key] ?? FALLBACK_POWER;

// Visual accent tokens: 'order' = the green (Liberal) rail, 'wax' = the crimson (Fascist) rail.
export const POLICY = {
  liberal: { name: 'Liberal', accent: 'order' },
  fascist: { name: 'Fascist', accent: 'wax' },
};

export const POWERS = {
  inspect: { name: 'Inspect Allegiance', verb: 'Inspect', hint: 'See one member’s loyalty — for your eyes only.' },
  appoint: { name: 'Special Election', verb: 'Appoint', hint: 'Name the next President, skipping the rotation.' },
  survey:  { name: 'Survey the Deck', verb: 'Survey', hint: 'Read the top three policies in secret.' },
  execute: { name: 'Execution', verb: 'Execute', hint: 'Remove a member. If it is Hitler, the Liberals win.' },
};

export const PHASE_LABEL = {
  nominate: 'Nomination',
  vote: 'The Vote',
  voteReveal: 'Ballots Read',
  legislativeChair: 'Drafting',
  legislativeDeputy: 'Enactment',
  power: 'Executive Power',
  over: 'Adjourned',
};

export const teamColor = (team) => (team === 'bad' ? 'wax' : team === 'good' ? 'order' : 'brass');

// ---- emblems ---------------------------------------------------------------

// A dripping wax seal — the signature mark. `mark` draws a glyph in the center.
export function WaxSeal({ size = 48, tone = '#b0463c', children, className = '' }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`wax-${tone}`} cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="35%" stopColor={tone} />
          <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
      </defs>
      <path
        d="M32 4c4 6 11 4 13 10 7 1 9 8 6 13 4 5 1 12-4 13-1 7-9 8-13 5-5 4-12 1-13-5-7-1-9-8-6-13-4-5-1-12 6-13 2-6 7-4 11-10z"
        fill={`url(#wax-${tone})`}
        stroke="#000"
        strokeOpacity="0.3"
      />
      <g transform="translate(32 33)" stroke="rgba(0,0,0,0.45)" strokeWidth="1.4" fill="none">
        {children}
      </g>
    </svg>
  );
}

// Gavel emblem for the Chair.
export function Gavel({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="11.5" y="2.5" width="6" height="9" rx="1" transform="rotate(45 14.5 7)" />
      <line x1="9" y1="9" x2="14.5" y2="14.5" />
      <line x1="4" y1="20" x2="12" y2="12" />
      <line x1="3" y1="21" x2="6" y2="18" />
    </svg>
  );
}

// Sash emblem for the Deputy.
export function Sash({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3 L18 21" />
      <path d="M10 3 L18 16" opacity="0.5" />
      <circle cx="16.5" cy="19" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Candle — used on the landing/lobby as ambient light.
export function Candle({ size = 36 }) {
  return (
    <svg viewBox="0 0 40 64" width={size} height={size * 1.6} aria-hidden="true">
      <ellipse cx="20" cy="60" rx="11" ry="3" fill="#000" opacity="0.4" />
      <rect x="13" y="22" width="14" height="38" rx="2" fill="#ece3cf" />
      <rect x="13" y="22" width="5" height="38" rx="2" fill="#fff" opacity="0.25" />
      <line x1="20" y1="22" x2="20" y2="15" stroke="#3a2c12" strokeWidth="1.5" />
      <path d="M20 15 C16 11 18 6 20 2 C22 6 24 11 20 15Z" fill="#f6c453" />
      <path d="M20 13 C18 11 19 8 20 5 C21 8 22 11 20 13Z" fill="#fff3c4" />
    </svg>
  );
}

// Council emblem — two crossed quills under a brass arch.
export function Crest({ size = 60 }) {
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} aria-hidden="true" fill="none"
      stroke="#c9a86a" strokeWidth="1.5" strokeLinecap="round">
      <path d="M40 8 C58 8 66 22 66 40" opacity="0.7" />
      <path d="M40 8 C22 8 14 22 14 40" opacity="0.7" />
      <path d="M24 60 L52 26" />
      <path d="M56 60 L28 26" />
      <circle cx="40" cy="44" r="4" fill="#c9a86a" stroke="none" />
      <path d="M24 60 q-3 4 -6 4" />
      <path d="M56 60 q3 4 6 4" />
    </svg>
  );
}
