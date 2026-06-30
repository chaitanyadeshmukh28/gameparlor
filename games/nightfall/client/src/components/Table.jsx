import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Moon from './Moon.jsx';
import { Rooftops } from '../emblems.jsx';
import { RulesButton } from './Rules.jsx';
import Night from './Night.jsx';
import Day from './Day.jsx';
import Vote from './Vote.jsx';
import Result from './Result.jsx';

const PHASE_LABEL = { night: 'Night', day: 'Day', vote: 'The vote', result: 'Dawn' };

export default function Table({ state, code, send, error }) {
  // The result reveal is its own full screen.
  if (state.phase === 'result') {
    return (
      <div className="relative h-[100dvh] overflow-hidden">
        <Moon phase="result" />
        <Rooftops className="pointer-events-none absolute bottom-0 left-0 w-full h-20 z-0" />
        <Header code={code} phase={state.phase} send={send} />
        <Result state={state} send={send} />
        <Toast error={error} />
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] overflow-hidden flex flex-col">
      <Rooftops className="pointer-events-none absolute bottom-0 left-0 w-full h-14 sm:h-16 z-0 opacity-80" />

      <Header code={code} phase={state.phase} send={send} />

      <main className="relative z-10 flex-1 min-h-0 flex flex-col px-3 sm:px-5 pt-1">
        {/* The sky — a contained band so the moon never overlaps the controls. */}
        <div className="relative shrink-0 h-[26dvh] sm:h-[30dvh]">
          <Moon phase={state.phase} />
        </div>

        {/* The interactive content for the current phase. */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-4 sm:pb-6 flex items-start justify-center">
          <AnimatePresence mode="wait">
            {/* Key by phase only — within the night, Night stays mounted so it can
                detect a freshly-learned card and play the reveal flip (QA #12). */}
            <motion.div
              key={state.phase}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="w-full"
            >
              {state.phase === 'night' && <Night state={state} send={send} />}
              {state.phase === 'day' && <Day state={state} send={send} />}
              {state.phase === 'vote' && <Vote state={state} send={send} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <Toast error={error} />
    </div>
  );
}

function Header({ code, phase, send }) {
  return (
    <header className="relative z-20 shrink-0 flex items-center justify-between px-4 sm:px-6 py-2 border-b border-moon/10 bg-night-abyss/30 backdrop-blur-sm">
      <div className="flex items-baseline gap-3">
        <span className="font-display font-bold text-xl moon-text">Nightfall</span>
        <span className="font-mono text-[0.65rem] tracking-[0.3em] text-moon-faint">{code}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline eyebrow !text-[0.55rem] text-frost/70">{PHASE_LABEL[phase]}</span>
        <RulesButton />
        <button className="btn-ghost !py-1.5 !px-3 text-xs" onClick={() => send({ t: 'leave' })}>Leave</button>
      </div>
    </header>
  );
}

function Toast({ error }) {
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
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] rounded-lg border border-blood/50 bg-night-raised px-4 py-2.5 text-sm text-moon shadow-lg"
        >
          {show.message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
