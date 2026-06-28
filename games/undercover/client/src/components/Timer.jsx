import { useEffect, useRef, useState } from 'react';

// Server-authoritative countdown. The server sends an end-timestamp plus its own
// clock, so every client agrees regardless of local clock skew. When the round
// pauses (a vote, a guess), roundEndsAt is null and we freeze remainingMs.
export default function Timer({ state }) {
  const offset = useRef(0); // serverNow - localNow at last sync
  const [ms, setMs] = useState(state.remainingMs ?? 0);

  useEffect(() => {
    offset.current = (state.serverNow ?? Date.now()) - Date.now();
  }, [state.serverNow]);

  useEffect(() => {
    if (!state.timerRunning || state.roundEndsAt == null) {
      setMs(state.remainingMs ?? 0);
      return;
    }
    const tick = () => {
      const now = Date.now() + offset.current;
      setMs(Math.max(0, state.roundEndsAt - now));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [state.timerRunning, state.roundEndsAt, state.remainingMs]);

  const total = (state.durationSec ?? 480) * 1000;
  const frac = Math.max(0, Math.min(1, ms / total));
  const mm = Math.floor(ms / 60000);
  const ss = Math.floor((ms % 60000) / 1000);
  const low = ms <= 30000;
  const paused = !state.timerRunning;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="eyebrow">{paused ? 'Clock held' : 'Interrogation clock'}</span>
        <span
          className={`font-mono font-bold tabular-nums tracking-wider text-lg leading-none ${
            paused ? 'text-bone-dim' : low ? 'text-bone animate-pulse' : 'amber-text'
          }`}
        >
          {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-noir-black overflow-hidden border border-bone/10">
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-200 ease-linear"
          style={{
            width: `${frac * 100}%`,
            background: paused
              ? 'linear-gradient(90deg,#5C5C66,#9A9AA4)'
              : low
                ? 'linear-gradient(90deg,#FFB020,#ECECEF)'   // white-hot as it runs out
                : 'linear-gradient(90deg,#B9760A,#FFCB5C)',
            boxShadow: paused ? 'none' : '0 0 14px rgba(255,176,32,0.6)',
          }}
        />
      </div>
    </div>
  );
}
