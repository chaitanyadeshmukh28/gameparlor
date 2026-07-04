import { useState } from 'react';
import { motion } from 'framer-motion';
import { Motif } from '../motifs.jsx';

// hex -> rgba string at a given alpha (accents are 6-digit hex).
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// Entrance variant — inherited from the grid's staggerChildren.
const tile = {
  hidden: { opacity: 0, y: 26, scale: 0.97 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 130, damping: 18 },
  },
};

export default function GameTile({ game }) {
  const a = game.accent;
  const [hot, setHot] = useState(false);
  const [logoOk, setLogoOk] = useState(true);
  const spring = { type: 'spring', stiffness: 220, damping: 18 };

  return (
    // Outer link: plays the staggered entrance (inherits hidden/show) and owns
    // hover + keyboard focus. The inner card lifts on hover so the two
    // animations never fight over the same transform.
    <motion.a
      href={game.url}
      target="_blank"
      rel="noopener noreferrer"
      variants={tile}
      onHoverStart={() => setHot(true)}
      onHoverEnd={() => setHot(false)}
      onFocus={() => setHot(true)}
      onBlur={() => setHot(false)}
      title={`Open ${game.name} — in the spirit of ${game.basedOn}`}
      className="block rounded-2xl"
    >
      <motion.div
        animate={{ y: hot ? -8 : 0, scale: hot ? 1.012 : 1 }}
        whileTap={{ scale: 0.985 }}
        transition={spring}
        className="group relative flex min-h-[15.5rem] flex-col overflow-hidden rounded-2xl border bg-salon-raised/70 p-4 backdrop-blur-sm sm:min-h-[16.5rem] sm:p-5"
        style={{ borderColor: rgba(a, hot ? 0.7 : 0.32) }}
      >
        {/* Accent wash that blooms from the top on hover. */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(120% 80% at 50% -10%, ${rgba(a, 0.24)}, transparent 62%)` }}
          animate={{ opacity: hot ? 1 : 0.45 }}
          transition={{ duration: 0.3 }}
        />
        {/* Accent top-edge filament. */}
        <span aria-hidden className="absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${rgba(a, 0.85)}, transparent)` }} />

        {/* ── Logo stage — the game's real title card, featured. ── */}
        <div
          className="relative grid h-[6rem] place-items-center overflow-hidden rounded-xl border sm:h-[6.75rem]"
          style={{
            borderColor: rgba(a, 0.28),
            // Dark base so each opaque title-card blends in; faint accent glow around it.
            background: `radial-gradient(115% 130% at 50% 50%, ${rgba(a, 0.12)}, rgba(8,7,15,0.62) 70%)`,
          }}
        >
          {/* Accent glow that intensifies on hover. */}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: `radial-gradient(85% 75% at 50% 50%, ${rgba(a, 0.20)}, transparent 72%)` }}
            animate={{ opacity: hot ? 1 : 0.45 }}
            transition={{ duration: 0.4 }}
          />
          {logoOk ? (
            <motion.img
              src={`/logos/${game.slug}.png`}
              alt={game.name}
              loading="lazy"
              draggable={false}
              onError={() => setLogoOk(false)}
              className="relative max-h-full w-full object-contain px-3.5"
              animate={{ scale: hot ? 1.05 : 1 }}
              transition={spring}
            />
          ) : (
            // No title-card art yet — fall back to the game's engraved motif.
            <motion.div
              className="relative flex flex-col items-center gap-1"
              style={{ color: a }}
              animate={{ scale: hot ? 1.05 : 1 }}
              transition={spring}
            >
              <Motif name={game.motif} className="h-14 w-14 sm:h-16 sm:w-16" />
              <span className="font-display text-xl leading-none text-ivory">{game.name}</span>
            </motion.div>
          )}

          <span className="absolute right-2.5 top-2.5 whitespace-nowrap rounded-full bg-void/55 px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.12em] text-mist/90 backdrop-blur-sm">
            {game.players}
          </span>
        </div>

        <div className="relative mt-3.5 flex-1">
          <h3 className="font-display text-2xl leading-none text-ivory">{game.name}</h3>
          <p className="mt-2 text-sm leading-snug text-mist">{game.tagline}</p>
        </div>

        <div className="relative mt-3 flex items-center justify-between">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-mist/70">
            Open room
          </span>
          <motion.span
            className="inline-flex items-center gap-1 text-sm font-semibold"
            style={{ color: a }}
            animate={{ x: hot ? 4 : 0, opacity: hot ? 1 : 0.85 }}
            transition={spring}
          >
            Enter
            <span aria-hidden className="text-base leading-none">↗</span>
          </motion.span>
        </div>

        {/* Glow ring on hover. */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          animate={{ opacity: hot ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{ boxShadow: `0 0 0 1px ${rgba(a, 0.6)} inset, 0 18px 50px -18px ${rgba(a, 0.6)}` }}
        />
      </motion.div>
    </motion.a>
  );
}
