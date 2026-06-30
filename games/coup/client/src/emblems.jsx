// Engraved single-stroke emblems, one per character. Drawn on a 48x48 grid,
// they inherit `currentColor` so each card tints them to its house color.
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function Emblem({ name, className }) {
  const props = { viewBox: '0 0 48 48', className, ...S };
  switch (name) {
    case 'duke': // a coronet
      return (
        <svg {...props}>
          <path d="M9 32 L12 16 L19 25 L24 13 L29 25 L36 16 L39 32 Z" />
          <path d="M9 36 H39" />
          <circle cx="12" cy="14" r="1.6" /><circle cx="24" cy="11" r="1.6" /><circle cx="36" cy="14" r="1.6" />
        </svg>
      );
    case 'assassin': // a dagger
      return (
        <svg {...props}>
          <path d="M24 6 L27 26 L24 32 L21 26 Z" />
          <path d="M16 28 H32" />
          <path d="M24 32 V42" />
          <path d="M20 38 H28" />
        </svg>
      );
    case 'captain': // an anchor
      return (
        <svg {...props}>
          <circle cx="24" cy="11" r="3" />
          <path d="M24 14 V38" />
          <path d="M16 22 H32" />
          <path d="M11 30 C11 38 18 41 24 41 C30 41 37 38 37 30" />
          <path d="M11 30 L8 27 M11 30 L14 28 M37 30 L40 27 M37 30 L34 28" />
        </svg>
      );
    case 'ambassador': // a quill over a scroll
      return (
        <svg {...props}>
          <path d="M12 34 C18 30 30 18 38 9 C36 19 28 32 18 38 Z" />
          <path d="M12 34 L9 39" />
          <path d="M10 40 C16 36 22 36 28 39" />
        </svg>
      );
    case 'contessa': // a goblet
      return (
        <svg {...props}>
          <path d="M15 9 H33 C33 20 28 24 24 24 C20 24 15 20 15 9 Z" />
          <path d="M19 14 H29" />
          <path d="M24 24 V36" />
          <path d="M16 40 H32" /><path d="M18 40 C18 37 21 36 24 36 C27 36 30 37 30 40" />
        </svg>
      );
    case 'coin':
      return (
        <svg {...props}>
          <circle cx="24" cy="24" r="15" />
          <circle cx="24" cy="24" r="10" />
          <path d="M24 17 V31 M21 20 H27 M21 28 H27" />
        </svg>
      );
    default:
      return null;
  }
}
