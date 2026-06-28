import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// The undercover has broken cover and must name the location from the board.
// Only the spy sees the picker; everyone else watches the clock held in suspense.
export default function SpyGuess({ state, send }) {
  const [pick, setPick] = useState(null);

  if (!state.youAreSpy) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="panel p-5 text-center">
        <p className="eyebrow mb-2">Cover blown</p>
        <p className="font-cond text-bone">The spy is naming a location…</p>
        <span className="inline-block mt-3 w-4 h-4 rounded-full border-2 border-amber/30 border-t-amber animate-spin" />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="panel p-4 flex flex-col min-h-0">
      <p className="eyebrow mb-1">Break cover</p>
      <p className="font-cond text-bone mb-3 text-sm">Name the location. Right and you walk; wrong and the agents win.</p>
      <div className="grid grid-cols-2 gap-1.5 overflow-y-auto pr-1" style={{ maxHeight: '38vh' }}>
        {state.board.map((name, i) => (
          <button
            key={name}
            onClick={() => setPick(i)}
            className={`text-left rounded-[3px] border px-2.5 py-2 font-cond text-[0.8rem] leading-tight transition ${
              pick === i ? 'border-amber bg-amber/20 text-bone' : 'border-bone/12 bg-noir-black/40 text-bone-dim hover:border-amber/50 hover:text-bone'
            }`}
          >
            {name}
          </button>
        ))}
      </div>
      <AnimatePresence>
        {pick != null && (
          <motion.button
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="btn-amber w-full mt-3"
            onClick={() => send({ t: 'guess', locationIndex: pick })}
          >
            Name it: {state.board[pick]}
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
