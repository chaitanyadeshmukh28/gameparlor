import { motion } from 'framer-motion';
import { Lamp, Mug, Toast } from './noir.jsx';
import { RulesButton } from './Rules.jsx';

const DURATIONS = [
  [240, '4 min'],
  [360, '6 min'],
  [480, '8 min'],
  [600, '10 min'],
];

export default function Lobby({ state, code, send, error }) {
  const enough = state.players.length >= state.minPlayers;
  const full = state.players.length >= state.maxPlayers;

  return (
    <div className="relative z-10 min-h-[100dvh] flex flex-col items-center justify-center px-5 py-8">
      <Lamp className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-32 opacity-80" />

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="panel w-full max-w-md p-6 mt-16"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="eyebrow mb-1">Case number</p>
            <div className="stamp text-5xl amber-text tracking-[0.15em]">{code}</div>
          </div>
          <RulesButton />
        </div>

        <p className="eyebrow mb-2">Suspects rounded up · {state.players.length}/{state.maxPlayers}</p>
        <ul className="space-y-1.5 mb-5">
          {state.players.map((p, i) => (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 rounded-[3px] bg-noir-black/50 border border-bone/10 px-3 py-2"
            >
              <Mug name={p.name} size="sm" />
              <span className="font-cond font-medium text-bone">{p.name}</span>
              {p.id === state.you && <span className="text-xs text-bone-faint">(you)</span>}
              {p.id === state.players[0]?.id && (
                <span className="ml-auto eyebrow !text-amber/80">Host</span>
              )}
            </motion.li>
          ))}
        </ul>

        {state.isHost ? (
          <>
            <p className="eyebrow mb-2">Interrogation length</p>
            <div className="grid grid-cols-4 gap-1 p-1 mb-5 rounded-[3px] bg-noir-black/70 border border-bone/10">
              {DURATIONS.map(([sec, label]) => (
                <button
                  key={sec}
                  onClick={() => send({ t: 'config', durationSec: sec })}
                  className={`rounded-[2px] py-2 text-xs font-cond font-semibold uppercase tracking-[0.1em] transition ${
                    state.durationSec === sec ? 'bg-amber/15 text-amber' : 'text-bone-faint hover:text-bone'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button className="btn-amber w-full" disabled={!enough} onClick={() => send({ t: 'start' })}>
              {enough ? 'Begin the interrogation' : `Need ${state.minPlayers - state.players.length} more`}
            </button>
            {full && <p className="mt-2 text-center text-xs text-bone-faint">The room is full.</p>}
          </>
        ) : (
          <div className="rounded-[3px] border border-bone/10 bg-noir-black/40 p-4 text-center">
            <p className="text-sm text-bone-dim">Waiting on the host to start the interrogation…</p>
            <p className="eyebrow mt-2">Round length · {Math.round(state.durationSec / 60)} min</p>
          </div>
        )}

        <button className="btn-line w-full mt-3 !py-2 text-xs" onClick={() => send({ t: 'leave' })}>Leave the case</button>
      </motion.div>

      <Toast error={error} />
    </div>
  );
}
