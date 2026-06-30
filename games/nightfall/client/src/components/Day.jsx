import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SecretDock } from './Night.jsx';

const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

export default function Day({ state, send }) {
  const { day, me } = state;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const remaining = day.endsAt ? Math.max(0, Math.ceil((day.endsAt - now) / 1000)) : null;
  const expired = day.endsAt && remaining === 0;
  const mm = remaining != null ? String(Math.floor(remaining / 60)).padStart(1, '0') : '0';
  const ss = remaining != null ? String(remaining % 60).padStart(2, '0') : '00';
  const me_ready = me?.ready;

  return (
    <motion.div {...fade} className="w-full max-w-md mx-auto flex flex-col items-center gap-2 text-center">
      <div>
        <p className="eyebrow mb-0.5">Dawn breaks</p>
        <h2 className="font-display text-2xl sm:text-3xl text-moon leading-none">The village debates</h2>
        <p className="text-xs sm:text-sm text-moon-dim mt-1">Who acted strangely in the dark? When you're ready, call the vote.</p>
      </div>

      {day.endsAt ? (
        <motion.div
          key="timer"
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className={`font-mono text-4xl sm:text-5xl tracking-wider leading-none ${expired ? 'text-blood-bright' : 'text-lantern'}`}
          style={{ textShadow: expired ? '0 0 24px rgba(196,73,94,0.5)' : '0 0 24px rgba(240,192,112,0.45)' }}
        >
          {mm}:{ss}
        </motion.div>
      ) : state.isHost ? (
        // Collapse the three timer presets into one compact segmented control (QA #8).
        <div className="flex items-center gap-2 text-xs text-moon-dim">
          <span className="eyebrow !text-[0.5rem]">Discussion timer</span>
          <div className="flex rounded-lg border border-moon/15 overflow-hidden divide-x divide-moon/15">
            {[2, 3, 5].map((m) => (
              <button key={m} className="px-3 py-1.5 hover:bg-frost/10 transition" onClick={() => send({ t: 'startTimer', seconds: m * 60 })}>
                {m}m
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-moon-faint">No timer running — talk as long as you like.</p>
      )}

      <div className="w-full panel p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="eyebrow">Ready to vote</span>
          <span className="text-xs text-moon-dim">{day.readyCount}/{state.players.filter((p) => p.connected).length} ready</span>
        </div>
        <button
          className={me_ready ? 'btn-lantern w-full' : 'btn-moon w-full'}
          onClick={() => send({ t: 'ready' })}
        >
          {me_ready ? "You're ready — tap to wait" : "I'm ready to vote"}
        </button>
        {(state.isHost || expired) && (
          <button className="btn-blood w-full mt-2" onClick={() => send({ t: 'callVote' })}>
            Call the vote now
          </button>
        )}
        {!state.isHost && !expired && (
          <p className="text-[0.7rem] text-moon-faint mt-2">Voting begins when everyone is ready, the timer ends, or the host calls it.</p>
        )}
      </div>

      <SecretDock me={me} strip />
    </motion.div>
  );
}
