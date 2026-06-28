import { motion } from 'framer-motion';

// The accusation vote. Conviction must be unanimous among everyone but the
// accused; a single "not guilty" sets them free.
export default function VotePanel({ state, send }) {
  const v = state.vote;
  if (!v) return null;
  const cast = v.yes + v.no;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="panel p-4 border-amber/30"
    >
      <p className="eyebrow mb-1">{v.accuserName} calls a vote</p>
      <p className="font-cond text-bone mb-3">
        Convict <span className="stamp text-xl amber-text align-baseline">{v.accusedName}</span> as the spy?
        <span className="block text-xs text-bone-faint mt-0.5">Conviction must be unanimous.</span>
      </p>

      {/* tally */}
      <div className="flex items-center gap-3 mb-3">
        <Tally label="Guilty" n={v.yes} tone="amber" />
        <Tally label="Not guilty" n={v.no} tone="bone" />
        <span className="ml-auto font-mono text-xs text-bone-faint">{cast}/{v.needed} in</span>
      </div>

      {v.youAreAccused ? (
        <p className="text-center text-sm text-amber/90 py-1">You're in the chair. The table decides your fate…</p>
      ) : v.youEligible ? (
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-amber" onClick={() => send({ t: 'castVote', agree: true })}>Guilty</button>
          <button className="btn-line" onClick={() => send({ t: 'castVote', agree: false })}>Not guilty</button>
        </div>
      ) : (
        <p className="text-center text-sm text-bone-dim py-1 flex items-center justify-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-amber/30 border-t-amber animate-spin" />
          Waiting on the others to vote…
        </p>
      )}
    </motion.div>
  );
}

function Tally({ label, n, tone }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`font-poster text-2xl ${tone === 'amber' ? 'amber-text' : 'text-bone'}`}>{n}</span>
      <span className="eyebrow">{label}</span>
    </div>
  );
}
