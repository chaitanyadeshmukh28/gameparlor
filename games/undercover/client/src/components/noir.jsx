// Shared noir art + tiny UI atoms used across screens.
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// The interrogation lamp — a bare bulb on a cord, throwing a hard amber cone.
// The signature mood-piece; it sways gently like it was just knocked.
export function Lamp({ className = '', swing = true, lit = true }) {
  return (
    <div className={`pointer-events-none select-none ${className}`} aria-hidden>
      <div className={`origin-top ${swing ? 'animate-sway' : ''}`} style={{ transformOrigin: '50% 0%' }}>
        <svg viewBox="0 0 120 150" className="w-full h-full overflow-visible">
          {/* cord */}
          <line x1="60" y1="0" x2="60" y2="40" stroke="#3a3a42" strokeWidth="2" />
          {/* shade */}
          <path d="M34 40 H86 L74 70 H46 Z" fill="#141418" stroke="#2c2c34" strokeWidth="1.5" />
          <ellipse cx="60" cy="70" rx="14" ry="3.5" fill="#0c0c10" />
          {/* bulb + glow */}
          {lit && (
            <>
              <circle cx="60" cy="74" r="7" fill="#FFCB5C" />
              <circle cx="60" cy="74" r="16" fill="url(#bulbGlow)" />
              <path d="M60 78 L18 150 H102 Z" fill="url(#cone)" opacity="0.5" />
            </>
          )}
          <defs>
            <radialGradient id="bulbGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFCB5C" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#FFB020" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="cone" x1="60" y1="78" x2="60" y2="150" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFB020" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#FFB020" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

// A pressed fingerprint — used as the brand mark and on the dossier.
export function Fingerprint({ className = '' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M24 6c-9 0-16 7-16 16v9" strokeLinecap="round" />
      <path d="M40 31v-9c0-9-7-16-16-16" strokeLinecap="round" />
      <path d="M14 30v-8a10 10 0 0 1 20 0v12" strokeLinecap="round" />
      <path d="M20 34v-12a4 4 0 0 1 8 0v14" strokeLinecap="round" />
      <path d="M24 24v16" strokeLinecap="round" />
    </svg>
  );
}

// Initial-in-a-mugshot-frame avatar.
export function Mug({ name, size = 'md', dim = false }) {
  const S = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' }[size];
  return (
    <span
      className={`grid place-items-center ${S} rounded-[2px] border border-bone/25 bg-noir-black font-poster text-bone ${dim ? 'opacity-40' : ''}`}
      style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.6)' }}
    >
      {(name?.[0] || '?').toUpperCase()}
    </span>
  );
}

// Transient error toast, bottom-center.
export function Toast({ error }) {
  const [show, setShow] = useState(null);
  useEffect(() => {
    if (!error) return;
    setShow(error);
    const t = setTimeout(() => setShow(null), 3200);
    return () => clearTimeout(t);
  }, [error]);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[80] rounded-[3px] border border-amber/50 bg-noir-coal px-4 py-2.5 text-sm text-bone shadow-lamp"
        >
          {show.message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
