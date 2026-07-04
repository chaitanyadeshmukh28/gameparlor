import { useState } from 'react';
import { sfx } from '../sfx.js';

// Toggles the synthesized sound kit; state persists in localStorage.
export function MuteButton({ className = '' }) {
  const [muted, setMuted] = useState(sfx.muted);
  return (
    <button
      onClick={() => setMuted(sfx.toggle())}
      title={muted ? 'Sound off — tap to unmute' : 'Sound on — tap to mute'}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      className={`grid place-items-center w-9 h-9 rounded-full border border-brass/25 bg-walnut/60 text-brass/90 hover:text-brass hover:border-brass/50 transition ${className}`}
    >
      {muted ? (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9v6h4l5 4V5L8 9H4z" /><line x1="17" y1="9" x2="22" y2="14" /><line x1="22" y1="9" x2="17" y2="14" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M17 8a5 5 0 0 1 0 8" /><path d="M19.5 5.5a9 9 0 0 1 0 13" />
        </svg>
      )}
    </button>
  );
}
