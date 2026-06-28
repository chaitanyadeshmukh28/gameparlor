import { motion, useReducedMotion } from 'framer-motion';
import { GAMES } from './games.js';
import { Sunburst } from './motifs.jsx';
import GameTile from './components/GameTile.jsx';

export default function App() {
  const reduce = useReducedMotion();

  const grid = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
  };

  return (
    <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-6xl flex-col px-5 pb-12 pt-10 sm:px-8 sm:pt-14">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <header className="relative flex flex-col items-center text-center">
        <div className="relative grid place-items-center">
          <motion.div
            aria-hidden
            className="pointer-events-none absolute text-brass/30"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1, rotate: reduce ? 0 : 360 }}
            transition={{
              opacity: { duration: 1 },
              scale: { type: 'spring', stiffness: 80, damping: 16 },
              rotate: reduce ? {} : { duration: 90, ease: 'linear', repeat: Infinity },
            }}
          >
            <Sunburst className="h-[15rem] w-[15rem] sm:h-[19rem] sm:w-[19rem]" />
          </motion.div>

          <motion.p
            className="eyebrow relative mb-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
          >
            Eight games · one lobby
          </motion.p>

          <motion.h1
            className="relative font-display leading-none tracking-tight text-[clamp(3.4rem,16vw,8.5rem)]"
            initial={{ opacity: 0, y: 14, letterSpacing: '0.2em' }}
            animate={{ opacity: 1, y: 0, letterSpacing: '0.02em' }}
            transition={{ delay: 0.1, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="foil-text">Parlor</span>
          </motion.h1>
        </div>

        <motion.p
          className="relative mt-4 max-w-md text-balance text-base text-ivory-dim sm:text-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          Pick a game. Share the code. Play from anywhere.
        </motion.p>

        <motion.div
          className="deco-rule relative mt-6 w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <span className="text-xs">◆</span>
        </motion.div>
      </header>

      {/* ── The lineup ───────────────────────────────────────── */}
      <motion.section
        aria-label="Games"
        className="mt-9 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
        variants={grid}
        initial="hidden"
        animate="show"
      >
        {GAMES.map((game) => (
          <GameTile key={game.slug} game={game} />
        ))}
      </motion.section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <motion.footer
        className="mt-auto pt-10 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <p className="mx-auto max-w-lg text-sm text-mist">
          Every game opens its own private room with a shareable{' '}
          <span className="font-mono text-brass">4-letter code</span>. Host a table,
          send the code to friends, and play together from anywhere.
        </p>
        <p className="eyebrow mt-4 text-mist/50">Parlor · the game-night table, online</p>
      </motion.footer>
    </div>
  );
}
