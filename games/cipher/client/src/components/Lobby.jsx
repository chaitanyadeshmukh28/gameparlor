import { motion } from 'framer-motion';
import { Seal } from './Emblem.jsx';
import { RulesButton } from './Rules.jsx';
import { TEAMS } from '../meta.js';

// Validate the roster exactly as the server's setup() does, so the host sees
// why the mission can't start yet.
function readiness(players) {
  if (players.some((p) => !p.team)) return 'Everyone must pick a team.';
  for (const t of ['red', 'blue']) {
    const team = players.filter((p) => p.team === t);
    if (team.length < 2) return `${TEAMS[t].name} needs at least 2 agents.`;
    const spies = team.filter((p) => p.role === 'spymaster').length;
    if (spies === 0) return `${TEAMS[t].name} needs a spymaster.`;
    if (spies > 1) return `${TEAMS[t].name} can have only one spymaster.`;
  }
  return null;
}

function TeamColumn({ team, players, you, send }) {
  const t = TEAMS[team];
  const roster = players.filter((p) => p.team === team);
  const spymaster = roster.find((p) => p.role === 'spymaster');
  const operatives = roster.filter((p) => p.role !== 'spymaster');
  const mine = you?.team === team;

  return (
    <div className="frame p-3 flex flex-col gap-2" style={{ borderColor: `${t.hex}66` }}>
      <div className="flex items-center justify-between">
        <h3 className="stencil text-base" style={{ color: t.bright }}>{t.label}</h3>
        <span className="font-mono text-[0.6rem]" style={{ color: t.bright }}>{roster.length}</span>
      </div>

      <div className="rounded-sm border px-2 py-1.5" style={{ borderColor: `${t.hex}44`, background: `${t.hex}12` }}>
        <div className="eyebrow !text-[0.52rem] mb-0.5" style={{ color: t.bright }}>Spymaster · sees the key</div>
        <div className="font-semibold text-sm text-parch min-h-[1.25rem]">
          {spymaster ? `${spymaster.name}${spymaster.id === you?.id ? ' (you)' : ''}` : <span className="text-manila-faint font-normal">— empty —</span>}
        </div>
      </div>

      <div>
        <div className="eyebrow !text-[0.52rem] mb-1">Operatives</div>
        <ul className="space-y-1 min-h-[1.5rem]">
          {operatives.length === 0 && <li className="text-manila-faint text-xs">— none yet —</li>}
          {operatives.map((p) => (
            <li key={p.id} className="text-sm text-parch flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.connected ? t.bright : '#555' }} />
              {p.name}{p.id === you?.id && ' (you)'}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-1.5 mt-auto pt-1">
        <button
          onClick={() => send({ t: 'seat', team, role: 'operative' })}
          className={`btn !py-1.5 !px-2 !text-[0.6rem] border ${mine && you?.role === 'operative' ? 'text-ink-deep' : 'text-parch'}`}
          style={mine && you?.role === 'operative'
            ? { background: t.bright, borderColor: t.bright }
            : { borderColor: `${t.hex}55`, background: `${t.hex}10` }}
        >Operative</button>
        <button
          onClick={() => send({ t: 'seat', team, role: 'spymaster' })}
          disabled={spymaster && spymaster.id !== you?.id}
          className={`btn !py-1.5 !px-2 !text-[0.6rem] border disabled:opacity-30 ${mine && you?.role === 'spymaster' ? 'text-ink-deep' : 'text-parch'}`}
          style={mine && you?.role === 'spymaster'
            ? { background: t.bright, borderColor: t.bright }
            : { borderColor: `${t.hex}55`, background: `${t.hex}10` }}
        >Spymaster</button>
      </div>
    </div>
  );
}

export default function Lobby({ state, code, send }) {
  const you = state.players.find((p) => p.id === state.you);
  const blocked = readiness(state.players);
  const unseated = state.players.filter((p) => !p.team);

  return (
    <div className="relative z-10 min-h-[100dvh] flex flex-col items-center px-4 py-5">
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-brass">
          <Seal className="w-5 h-5" />
          <span className="stencil text-lg brass-text">CIPHER</span>
        </div>
        <RulesButton />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="panel w-full max-w-md p-4 mb-4 text-center"
      >
        <div className="eyebrow mb-1">Channel code · share to recruit</div>
        <div className="stencil text-4xl tracking-[0.3em] brass-text">{code}</div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-md mb-3">
        <TeamColumn team="red" players={state.players} you={you} send={send} />
        <TeamColumn team="blue" players={state.players} you={you} send={send} />
      </div>

      {unseated.length > 0 && (
        <p className="text-xs text-manila-dim mb-3 text-center max-w-md">
          Unassigned: {unseated.map((p) => p.name).join(', ')}
        </p>
      )}

      <div className="w-full max-w-md mt-auto">
        {state.isHost ? (
          <>
            <button className="btn-brass w-full" disabled={!!blocked} onClick={() => send({ t: 'start' })}>
              {blocked ? 'Awaiting roster' : 'Begin the mission'}
            </button>
            <p className="text-center text-[0.68rem] text-manila-dim mt-2 min-h-[1.1em]">
              {blocked || 'All stations ready. Transmit when you are.'}
            </p>
          </>
        ) : (
          <p className="text-center text-sm text-manila-dim">
            {blocked ? blocked : 'Roster ready — waiting for the host to begin.'}
          </p>
        )}
      </div>
    </div>
  );
}
