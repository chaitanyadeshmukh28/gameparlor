// Inline heraldic emblems for Quest. All original SVG line/charge work.
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

// The wordmark crest: a steel shield charged with a rising sword + crown of stars.
export function Wordmark({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="wm-steel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#37527f" /><stop offset="1" stopColor="#162338" />
        </linearGradient>
        <linearGradient id="wm-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4dd8e" /><stop offset="1" stopColor="#a9831f" />
        </linearGradient>
      </defs>
      <path d="M32 4 L56 12 V32 C56 47 45 56 32 61 C19 56 8 47 8 32 V12 Z"
        fill="url(#wm-steel)" stroke="url(#wm-gold)" strokeWidth="2" />
      {/* sword */}
      <path d="M32 16 L32 44 M26 40 L38 40 M28 44 L36 44" stroke="url(#wm-gold)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M32 14 L34.4 18 L32 20 L29.6 18 Z" fill="url(#wm-gold)" />
      {/* three stars */}
      {[20, 32, 44].map((cx, i) => (
        <Star key={i} cx={cx} cy={i === 1 ? 12 : 15} r={2.1} fill="#e8c766" />
      ))}
    </svg>
  );
}

function Star({ cx, cy, r, fill }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    return `${cx + rad * Math.cos(ang)},${cy + rad * Math.sin(ang)}`;
  }).join(' ');
  return <polygon points={pts} fill={fill} />;
}

// A single quest seal on the round track. state: 'pending' | 'success' | 'fail' | 'current'
export function QuestSeal({ index, state, double, size = 52 }) {
  const fill = state === 'success'
    ? 'url(#qs-good)'
    : state === 'fail'
    ? 'url(#qs-evil)'
    : 'url(#qs-stone)';
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="qs-good" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#5a78b0" /><stop offset="1" stopColor="#1d2b4a" />
        </radialGradient>
        <radialGradient id="qs-evil" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#c33" /><stop offset="1" stopColor="#5e0f1d" />
        </radialGradient>
        <radialGradient id="qs-stone" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#2c3a57" /><stop offset="1" stopColor="#131c2f" />
        </radialGradient>
      </defs>
      <circle cx="28" cy="28" r="24" fill={fill}
        stroke={state === 'success' ? '#e8c766' : state === 'fail' ? '#d23a4f' : '#3a4258'}
        strokeWidth={state === 'current' ? 2.5 : 1.6} />
      <circle cx="28" cy="28" r="19" fill="none" stroke={state === 'pending' || state === 'current' ? '#56638a' : 'rgba(255,255,255,0.35)'} strokeWidth="0.8" strokeDasharray="2 3" />
      {state === 'success' && <Charge kind="laurel" />}
      {state === 'fail' && <Charge kind="crack" />}
      {(state === 'pending' || state === 'current') && (
        <text x="28" y="35" textAnchor="middle" fontFamily="Cinzel, serif" fontWeight="700"
          fontSize="17" fill={state === 'current' ? '#e8c766' : '#8893b3'}>{ROMAN[index]}</text>
      )}
      {double && (
        <circle cx="46" cy="11" r="7" fill="#5e0f1d" stroke="#d23a4f" strokeWidth="1.2" />
      )}
      {double && <text x="46" y="14.5" textAnchor="middle" fontFamily="Cinzel" fontWeight="700" fontSize="8" fill="#f4dd8e">2</text>}
    </svg>
  );
}

function Charge({ kind }) {
  if (kind === 'laurel') {
    return (
      <g stroke="#f4dd8e" strokeWidth="1.6" fill="none" strokeLinecap="round">
        <path d="M20 36 C16 30 17 22 24 18" />
        <path d="M36 36 C40 30 39 22 32 18" />
        <path d="M28 16 L28 24 M24 24 L32 24" />
        <path d="M28 14 L30 17.4 L28 19 L26 17.4 Z" fill="#f4dd8e" />
      </g>
    );
  }
  // crack — a jagged betrayal mark
  return (
    <path d="M30 14 L24 27 L31 29 L23 42" stroke="#ffd7dc" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  );
}

// Role sigils.
const SIGILS = {
  merlin: (
    <g>
      <circle cx="20" cy="20" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="20" cy="20" r="3.4" fill="currentColor" />
      <path d="M20 4 L20 9 M20 31 L20 36 M4 20 L9 20 M31 20 L36 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  ),
  percival: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 20 C11 11 29 11 35 20 C29 29 11 29 5 20 Z" />
      <circle cx="20" cy="20" r="4" fill="currentColor" stroke="none" />
    </g>
  ),
  loyal: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M20 5 L31 9 V21 C31 29 26 33 20 35 C14 33 9 29 9 21 V9 Z" />
      <path d="M20 13 L20 27 M15 19 L25 19" strokeLinecap="round" />
    </g>
  ),
  assassin: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 31 L29 11" />
      <path d="M27 7 L33 13 L29 11 Z" fill="currentColor" />
      <path d="M9 31 L13 27 M7 25 L13 31" />
    </g>
  ),
  morgana: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="20" cy="14" r="6" />
      <path d="M20 20 L20 33 M12 26 L28 26 M14 33 L26 33" />
    </g>
  ),
  minion: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 12 L20 32 L32 12" />
      <path d="M8 12 L14 16 M32 12 L26 16 M20 24 L20 32" />
    </g>
  ),
};

export function Sigil({ role, size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">{SIGILS[role] || SIGILS.loyal}</svg>
  );
}

// Approve / reject ballot face used on the vote-flip card.
// Approve = a gold laurel cradling a check (clearly "aye", not a raised blade).
// Reject  = the crimson saltire ✕.
export function Ballot({ approve, size = 40 }) {
  return approve ? (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <g stroke="#e8c766" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* laurel sprigs */}
        <path d="M11 30 C5 24 6 14 14 9" />
        <path d="M29 30 C35 24 34 14 26 9" />
        {/* the check */}
        <path d="M13 21 L18 27 L29 13" strokeWidth="3" />
      </g>
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      {/* turned-down / crossed = nay */}
      <path d="M9 9 L31 31 M31 9 L9 31" stroke="#ffb3bd" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

// A quest-reveal token: a wax seal that lands laurel-gold (success) or
// cracked-crimson (betrayal), or its face-down back before the flip.
export function SealCard({ kind = 'back', size = 64 }) {
  const id = `sc-${kind}`;
  if (kind === 'back') {
    return (
      <svg width={size} height={size * 1.3} viewBox="0 0 56 72" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="50" height="66" rx="8" fill="#16223a" stroke="#3a4258" strokeWidth="1.6" />
        <rect x="9" y="9" width="38" height="54" rx="5" fill="none" stroke="#2c3a57" strokeWidth="1" strokeDasharray="3 3" />
        {/* crossed swords on the back */}
        <path d="M20 24 L36 48 M36 24 L20 48" stroke="#37527f" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="28" cy="36" r="6" fill="#1d2b4a" stroke="#56638a" strokeWidth="1" />
      </svg>
    );
  }
  const fail = kind === 'fail';
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 56 72" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-g`} cx="0.4" cy="0.32" r="0.85">
          {fail
            ? (<><stop offset="0" stopColor="#c33" /><stop offset="1" stopColor="#5e0f1d" /></>)
            : (<><stop offset="0" stopColor="#5a78b0" /><stop offset="1" stopColor="#1d2b4a" /></>)}
        </radialGradient>
      </defs>
      <rect x="3" y="3" width="50" height="66" rx="8" fill="#16223a"
        stroke={fail ? '#d23a4f' : '#e8c766'} strokeWidth="1.8" />
      <circle cx="28" cy="36" r="20" fill={`url(#${id}-g)`}
        stroke={fail ? '#d23a4f' : '#e8c766'} strokeWidth="1.6" />
      <circle cx="28" cy="36" r="15.5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.7" strokeDasharray="2 3" />
      {fail ? (
        <path d="M30 22 L24 35 L31 37 L23 50" stroke="#ffd7dc" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <g stroke="#f4dd8e" strokeWidth="1.8" fill="none" strokeLinecap="round">
          <path d="M19 45 C14 38 15 28 23 23" />
          <path d="M37 45 C42 38 41 28 33 23" />
          <path d="M28 21 L28 31 M23 31 L33 31" />
          <path d="M28 18 L30.4 22 L28 24 L25.6 22 Z" fill="#f4dd8e" />
        </g>
      )}
    </svg>
  );
}

// The verdict wax-stamp that thuds down after the last ballot lands.
export function WaxSeal({ approved, size = 132 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id={`wax-${approved ? 'a' : 'r'}`} cx="0.38" cy="0.32" r="0.85">
          {approved
            ? (<><stop offset="0" stopColor="#3a4f7a" /><stop offset="1" stopColor="#11203c" /></>)
            : (<><stop offset="0" stopColor="#a51f37" /><stop offset="1" stopColor="#4a0c17" /></>)}
        </radialGradient>
      </defs>
      {/* ragged wax blob */}
      <path d="M60 8 C76 10 84 2 92 14 C100 24 116 24 112 40 C108 54 120 64 108 76 C98 86 102 104 86 106 C72 108 66 120 54 112 C42 104 26 112 20 98 C14 86 0 80 8 64 C14 50 4 38 18 28 C30 19 28 6 44 8 C52 9 52 7 60 8 Z"
        fill={`url(#wax-${approved ? 'a' : 'r'})`} stroke={approved ? '#e8c766' : '#d23a4f'} strokeWidth="2.5" />
      <circle cx="60" cy="60" r="40" fill="none" stroke={approved ? 'rgba(232,199,102,0.55)' : 'rgba(210,58,79,0.6)'} strokeWidth="1.4" strokeDasharray="3 4" />
      <text x="60" y="66" textAnchor="middle" fontFamily="Cinzel, serif" fontWeight="800"
        fontSize={approved ? '17' : '18'} letterSpacing="1.5"
        fill={approved ? '#f4dd8e' : '#ffd7dc'}>{approved ? 'APPROVED' : 'REJECTED'}</text>
    </svg>
  );
}

export { ROMAN };
