import { motion } from 'framer-motion';

// A glanceable strip showing where every player stands right now: who is
// choosing a move, who has acted, and — crucially — who we're still waiting on
// to respond. Built so beginners never wonder "is it stuck, or is it me?".
export default function StatusTray({ state }) {
  const status = statusFor(state);
  const heading = trayHeading(state);

  return (
    <div className="rounded-xl border border-parch/10 bg-felt-raised/50 px-2.5 sm:px-3 py-2">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="eyebrow hidden sm:inline">Table status</span>
        <span className="text-[0.7rem] sm:text-xs text-parch-dim truncate">{heading}</span>
      </div>
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-0.5">
        {state.players.map((p) => {
          const s = status(p);
          return (
            <div key={p.id}
              className="shrink-0 flex items-center gap-1.5 sm:gap-2 rounded-lg border px-2 py-1 sm:px-2.5 sm:py-1.5"
              style={{ borderColor: `${s.color}40`, background: `${s.color}12` }}
            >
              <Indicator tone={s.tone} color={s.color} initial={p.name[0]?.toUpperCase()} />
              <div className="leading-tight">
                <div className="text-[0.7rem] sm:text-xs font-medium flex items-center gap-1">
                  {p.name}{p.id === state.you && <span className="text-parch-faint">(you)</span>}
                </div>
                <div className="text-[0.58rem] sm:text-[0.62rem]" style={{ color: s.color }}>{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Indicator({ tone, color, initial }) {
  const pulsing = tone === 'wait' || tone === 'act';
  return (
    <span className="relative grid place-items-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[0.55rem] sm:text-[0.6rem] font-display font-bold"
      style={{ background: `${color}22`, color }}>
      {tone === 'done' ? '✓' : tone === 'out' ? '✕' : initial}
      {pulsing && (
        <motion.span
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: color }}
          animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
    </span>
  );
}

const TONES = {
  act:  '#e8cd72', // choosing a move — gilt
  wait: '#e08236', // we're waiting on them — amber
  done: '#4f9a5a', // acted / responded — green
  idle: '#7c6f5b', // nothing required of them
  out:  '#8a5560', // eliminated
};

function trayHeading(state) {
  switch (state.phase) {
    case 'turn': return `${nameOf(state, state.turn)} is choosing a move.`;
    case 'response': {
      const waiting = state.pending?.responders || [];
      if (!waiting.length) return 'Resolving…';
      const names = waiting.map((id) => nameOf(state, id));
      return `Waiting on ${list(names)} to respond.`;
    }
    case 'lose': return `${nameOf(state, state.pendingLoss?.playerId)} is losing influence.`;
    case 'exchange': return `${nameOf(state, state.turn)} is exchanging cards.`;
    default: return '';
  }
}

// Returns a function (player) -> { tone, color, label }.
function statusFor(state) {
  const pd = state.pending;
  return (p) => {
    const tone = (t) => ({ tone: t, color: TONES[t] });
    if (p.eliminated) return { ...tone('out'), label: 'Out' };

    switch (state.phase) {
      case 'turn':
        return p.id === state.turn
          ? { ...tone('act'), label: 'Choosing a move' }
          : { ...tone('idle'), label: 'Waiting their turn' };

      case 'response': {
        if (!pd) return { ...tone('idle'), label: '' };
        // Whoever made the claim (or the declared block) has already acted.
        if (pd.mode === 'block_challenge' && pd.block?.blocker === p.id) return { ...tone('done'), label: 'Blocked' };
        if (pd.mode !== 'block_challenge' && pd.actor === p.id) return { ...tone('done'), label: 'Made a move' };
        if ((pd.eligible || []).includes(p.id)) {
          return pd.responders.includes(p.id)
            ? { ...tone('wait'), label: 'Needs to respond' }
            : { ...tone('done'), label: 'Responded' };
        }
        return { ...tone('idle'), label: 'Not involved' };
      }

      case 'lose':
        return p.id === state.pendingLoss?.playerId
          ? { ...tone('wait'), label: 'Losing a card' }
          : { ...tone('idle'), label: 'Watching' };

      case 'exchange':
        return p.id === state.turn
          ? { ...tone('wait'), label: 'Exchanging' }
          : { ...tone('idle'), label: 'Watching' };

      default:
        return { ...tone('idle'), label: '' };
    }
  };
}

const nameOf = (state, id) => state.players.find((p) => p.id === id)?.name || 'Someone';
const list = (names) =>
  names.length <= 1 ? (names[0] || '') : names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
