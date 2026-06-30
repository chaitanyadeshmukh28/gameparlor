import { useState } from 'react';
import { motion } from 'framer-motion';
import { ROLES } from '../game-meta.js';

const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

export default function Vote({ state, send }) {
  const { vote, me } = state;
  const others = state.players.filter((p) => !p.isYou);
  const r = me?.role ? ROLES[me.role] : null;
  const [mine, setMine] = useState(null); // local-only highlight of who you accused

  const accuse = (id) => { setMine(id); send({ t: 'vote', target: id }); };

  return (
    <motion.div {...fade} className="w-full max-w-md mx-auto flex flex-col items-center gap-3 text-center">
      <div>
        <p className="eyebrow mb-1">The reckoning</p>
        <h2 className="font-display text-3xl text-moon leading-none">Point at the wolf</h2>
        <p className="text-sm text-moon-dim mt-1.5">
          {vote.youVoted
            ? 'Your accusation is in. You can change it until everyone has voted.'
            : 'Choose who the village eliminates. Votes are revealed only when all are in.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full">
        {others.map((p) => {
          const chosen = mine === p.id;
          return (
            <button
              key={p.id}
              onClick={() => accuse(p.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-frost ${
                chosen ? 'border-blood bg-blood/20 text-moon' : 'border-moon/15 bg-white/[0.03] text-moon hover:border-blood/60 hover:bg-blood/10'
              }`}
            >
              {/* Disconnected players stay accusable — the village can still hang an
                  absentee, so the last connected player never gets vote-locked (QA #3). */}
              <span className="grid place-items-center w-8 h-8 rounded-full bg-blood/15 text-blood-bright font-display font-bold">{p.name[0]?.toUpperCase()}</span>
              <span className={`truncate flex-1 ${!p.connected ? 'opacity-60' : ''}`}>{p.name}{!p.connected && <span className="text-moon-faint text-xs"> (offline)</span>}{chosen && <span className="text-blood-bright"> ◂ accused</span>}</span>
              {p.voted && <span className="text-xs text-frost" title="has voted">✓</span>}
            </button>
          );
        })}
      </div>

      <div className="w-full rounded-xl border border-moon/10 bg-night-abyss/50 px-4 py-3 flex items-center justify-between">
        <span className="eyebrow">Votes cast</span>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-28 rounded-full bg-moon/10 overflow-hidden">
            <motion.div className="h-full bg-blood" animate={{ width: `${(vote.votedCount / Math.max(1, vote.total)) * 100}%` }} />
          </div>
          <span className="font-mono text-sm text-moon-dim">{vote.votedCount}/{vote.total}</span>
        </div>
      </div>

      {r && (
        <p className="text-xs text-moon-faint">
          Remember — you hold the <b style={{ color: r.color }}>{r.name}</b>.{vote.youVoted ? ' Waiting on the rest of the village…' : ''}
        </p>
      )}
    </motion.div>
  );
}
