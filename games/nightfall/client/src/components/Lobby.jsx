import { motion } from 'framer-motion';
import { Emblem, Rooftops } from '../emblems.jsx';
import { ROLES } from '../game-meta.js';
import { RulesButton } from './Rules.jsx';

const COMP_ORDER = ['werewolf', 'seer', 'robber', 'troublemaker', 'insomniac', 'tanner', 'villager'];

export default function Lobby({ state, code, send }) {
  const enough = state.players.length >= state.minPlayers;
  const comp = state.composition || {};
  const total = state.players.length + 3;

  return (
    <div className="relative z-10 min-h-[100dvh] flex flex-col items-center justify-center px-5 py-8">
      <Rooftops className="fixed bottom-0 left-0 w-full h-24 -z-10" />
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="panel w-full max-w-md p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="eyebrow mb-1">The village gathers</p>
            <h1 className="font-display text-3xl font-bold moon-text leading-none">Nightfall</h1>
          </div>
          <RulesButton />
        </div>

        <div className="text-center rounded-xl border border-moon/10 bg-night-abyss/50 py-3 mb-4">
          <div className="eyebrow mb-1">Village code</div>
          <div className="font-mono text-4xl tracking-[0.4em] moon-text pl-2">{code}</div>
        </div>

        <div className="eyebrow mb-2">Around the fire · {state.players.length}/{state.maxPlayers}</div>
        <ul className="space-y-1.5 mb-4">
          {state.players.map((p, i) => (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-lg bg-white/[0.03] border border-moon/10 px-3 py-2"
            >
              <span className="grid place-items-center w-7 h-7 rounded-full bg-frost/15 text-frost font-display font-bold text-sm">
                {p.name[0]?.toUpperCase()}
              </span>
              <span className="font-medium text-sm">{p.name}</span>
              {p.id === state.you && <span className="text-xs text-moon-faint">(you)</span>}
              {i === 0 && <span className="ml-auto eyebrow !text-[0.55rem]">host</span>}
            </motion.li>
          ))}
        </ul>

        {enough && (
          <div className="rounded-xl border border-moon/10 bg-night-abyss/40 p-3 mb-4">
            <div className="eyebrow mb-2">Tonight's deck · {total} cards</div>
            <div className="flex flex-wrap gap-1.5">
              {COMP_ORDER.filter((k) => comp[k]).map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                  style={{ borderColor: `${ROLES[k].color}40`, background: `${ROLES[k].color}12`, color: ROLES[k].color }}>
                  <Emblem name={k} className="w-3.5 h-3.5" />
                  {ROLES[k].name}{comp[k] > 1 ? ` ×${comp[k]}` : ''}
                </span>
              ))}
            </div>
            <p className="text-[0.7rem] text-moon-faint mt-2">Three of these will be hidden in the center — so a role you see here might not be in anyone's hand.</p>
          </div>
        )}

        {state.isHost ? (
          <button className="btn-moon w-full" disabled={!enough} onClick={() => send({ t: 'start' })}>
            {enough ? 'Begin the night' : `Need ${state.minPlayers - state.players.length} more villager${state.minPlayers - state.players.length === 1 ? '' : 's'}`}
          </button>
        ) : (
          <p className="text-center text-sm text-moon-dim">Waiting for the host to begin the night…</p>
        )}
      </motion.div>
    </div>
  );
}
