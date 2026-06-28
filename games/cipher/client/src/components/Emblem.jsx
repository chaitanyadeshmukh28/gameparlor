// Hand-drawn engraved marks for each tile identity — agents, bystander, assassin.
// Single-color (uses currentColor) so the tile palette drives them.

export function Emblem({ type, className = '' }) {
  switch (type) {
    case 'red':
    case 'blue':
      // Agent: a surveillance reticle around a stencil star.
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="24" cy="24" r="15" opacity="0.55" />
          <path d="M24 4v6M24 38v6M4 24h6M38 24h6" />
          <path
            d="M24 14l2.6 6.1 6.6.5-5 4.3 1.5 6.4L24 28.4l-5.7 3.4 1.5-6.4-5-4.3 6.6-.5z"
            fill="currentColor" stroke="none"
          />
        </svg>
      );
    case 'neutral':
      // Bystander: a closed dossier folder.
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M7 14h12l3 4h19v22H7z" />
          <path d="M7 22h34" opacity="0.6" />
        </svg>
      );
    case 'assassin':
      // Assassin: a skull stamp.
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M24 6c-9 0-15 6-15 15 0 5 2 8 5 10v6h20v-6c3-2 5-5 5-10 0-9-6-15-15-15z" />
          <circle cx="17.5" cy="22" r="3.4" fill="currentColor" stroke="none" />
          <circle cx="30.5" cy="22" r="3.4" fill="currentColor" stroke="none" />
          <path d="M24 28l-2 5h4z" fill="currentColor" stroke="none" />
          <path d="M19 37v3M24 37v3M29 37v3" />
        </svg>
      );
    default:
      return null;
  }
}

// The Cipher wordmark — a stamped, registered intelligence emblem.
export function Seal({ className = '' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="24" cy="24" r="20" opacity="0.5" />
      <circle cx="24" cy="24" r="14" />
      <path d="M24 10v28M10 24h28" opacity="0.5" />
      <path d="M24 17l5 7-5 7-5-7z" fill="currentColor" stroke="none" />
    </svg>
  );
}
