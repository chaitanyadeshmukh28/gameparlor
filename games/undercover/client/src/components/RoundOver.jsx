import { motion } from 'framer-motion';
import { Mug } from './noir.jsx';

const KICKER = {
  caught:          'Case closed',
  spy_wrong_guess: 'Wrong place',
  spy_guessed:     'Clean getaway',
  spy_survived:    'Time’s up',
  wrongful:        'Wrong suspect',
};

export default function RoundOver({ state, send }) {
  const kicker = KICKER[state.outcome] || 'Round over';
  const agentsWon = state.winningSide === 'agents';
  const winner = state.winnerLabel || (agentsWon ? 'The players win' : 'The spy wins');
  const ranked = [...state.players].sort((a, b) => b.score - a.score);
  const top = ranked[0]?.score ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-[70] grid place-items-center bg-noir-black/90 backdrop-blur-md px-4 py-6 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        className="panel w-full max-w-md p-5 sm:p-6"
      >
        {/* 1 — WHO WON, big and unmistakable. */}
        <p className="eyebrow text-center mb-1">{kicker}</p>
        <motion.h2
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 16 }}
          className={`stamp text-center leading-[0.9] text-[clamp(2.4rem,11vw,3.4rem)] ${agentsWon ? 'text-bone' : 'amber-text'}`}
        >
          {winner}
        </motion.h2>

        {/* 2 — WHY, one plain sentence. */}
        <motion.p
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="text-center text-sm text-bone-dim leading-relaxed mt-2 mb-4 px-1"
        >
          {state.reason}
        </motion.p>

        {/* 3 — THE REVEAL: unmask the spy + show the secret location. */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="grid grid-cols-2 gap-2 mb-4"
        >
          <div className="rounded-[3px] border border-amber/40 bg-amber/[0.06] p-3 text-center">
            <p className="eyebrow mb-2">The spy was</p>
            <div className="flex flex-col items-center gap-1.5">
              <Mug name={state.spyName} size="lg" />
              <span className="stamp text-xl amber-text leading-none">{state.spyName}</span>
            </div>
          </div>
          <div className="rounded-[3px] border border-bone/15 bg-noir-black/50 p-3 text-center flex flex-col justify-center">
            <p className="eyebrow mb-2">The location</p>
            <p className="font-poster text-lg text-bone leading-tight">{state.location}</p>
          </div>
        </motion.div>

        {/* Every player's location role — the full unmasking. */}
        <p className="eyebrow mb-2">Everyone’s role</p>
        <ul className="space-y-1 mb-4">
          {ranked.map((p, i) => {
            const isSpy = p.id === state.spyId;
            return (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.05 }}
                className={`flex items-center gap-2.5 rounded-[3px] border px-3 py-1.5 ${
                  isSpy ? 'border-amber/45 bg-amber/[0.06]' : 'border-bone/10 bg-noir-black/50'
                }`}
              >
                <span className="font-mono text-[0.6rem] text-bone-faint w-4">{i + 1}</span>
                <Mug name={p.name} size="sm" dim={isSpy} />
                <div className="min-w-0 leading-tight">
                  <div className="font-cond text-sm text-bone truncate">
                    {p.name}{p.id === state.you && <span className="text-bone-faint"> (you)</span>}
                  </div>
                  <div className={`text-[0.7rem] truncate ${isSpy ? 'text-amber' : 'text-bone-dim'}`}>
                    {isSpy ? 'The spy' : (p.role || 'Player')}
                  </div>
                </div>
                {isSpy && <span className="font-mono text-[0.5rem] uppercase text-amber/90 border border-amber/40 rounded-[1px] px-1">spy</span>}
                <span className={`ml-auto font-poster text-lg ${p.score === top && top > 0 ? 'amber-text' : 'text-bone'}`}>{p.score}</span>
              </motion.li>
            );
          })}
        </ul>

        {/* Host controls. */}
        {state.isHost ? (
          <div className="grid gap-2">
            <button className="btn-amber w-full" onClick={() => send({ t: 'nextRound' })}>Deal the next round</button>
            <button className="btn-line w-full !py-2 text-xs" onClick={() => send({ t: 'restart' })}>End game · back to lobby</button>
          </div>
        ) : (
          <p className="text-center text-sm text-bone-dim">Waiting on the host to deal another round…</p>
        )}
      </motion.div>
    </motion.div>
  );
}
