import { useState } from 'react';
import { motion } from 'framer-motion';
import { Emblem } from '../emblems.jsx';
import { ROLES, roleName, infoLine } from '../game-meta.js';
import Card from './Card.jsx';

const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

export default function Night({ state, send }) {
  const { night, me } = state;
  if (night?.youAreActive) return <WakePrompt key="wake" state={state} send={send} />;
  return <Sleeping key="sleep" me={me} />;
}

// What everyone who isn't currently acting sees — secrecy preserved.
function Sleeping({ me }) {
  return (
    <motion.div {...fade} className="w-full max-w-md mx-auto flex flex-col items-center text-center gap-4">
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="text-frost/70"
      >
        <Emblem name="eye" className="w-9 h-9" />
      </motion.div>
      <div>
        <p className="font-display text-2xl text-moon">The village sleeps</p>
        <p className="text-sm text-moon-dim mt-1">Someone is moving in the dark. Keep your eyes shut…</p>
      </div>
      <SecretDock me={me} compact />
    </motion.div>
  );
}

function WakePrompt({ state, send }) {
  const ctx = state.night.context;
  const role = ctx.role;
  const others = state.players.filter((p) => !p.isYou);
  const centers = Array.from({ length: state.centerCount }, (_, i) => i);

  const [mode, setMode] = useState(null);       // seer: 'player' | 'center'
  const [picks, setPicks] = useState([]);       // selected center slots / players

  const togglePick = (v, max) => setPicks((cur) => cur.includes(v) ? cur.filter((x) => x !== v) : (cur.length >= max ? [...cur.slice(1), v] : [...cur, v]));

  const r = ROLES[role];
  const Header = (
    <div className="flex items-center gap-3 mb-3">
      <span className="grid place-items-center w-11 h-11 rounded-lg" style={{ color: r.color, background: `${r.color}18` }}>
        <Emblem name={role} className="w-7 h-7" />
      </span>
      <div className="leading-tight text-left">
        <div className="eyebrow !text-[0.55rem]">You wake as</div>
        <div className="font-display text-xl" style={{ color: r.color }}>{r.name}</div>
      </div>
    </div>
  );

  return (
    <motion.div {...fade} className="w-full max-w-md mx-auto panel p-4">
      {Header}

      {role === 'werewolf' && (
        <div>
          <p className="text-sm text-moon-dim mb-3">
            {ctx.partners.length
              ? <>Fellow Werewolves: <b className="text-blood-bright">{ctx.partners.join(', ')}</b>. Stay hidden and survive the vote.</>
              : ctx.lone ? 'You hunt alone tonight — no fellow Werewolf woke. You may glimpse one center card.'
              : 'No fellow Werewolves stirred.'}
          </p>
          {ctx.lone ? (
            <>
              <p className="eyebrow mb-2">Peek a center card?</p>
              <div className="flex justify-center gap-3 mb-3">
                {centers.map((i) => (
                  <Card key={i} size="md" selectable label={`Center card ${i + 1}`} onClick={() => send({ t: 'night', center: i })} />
                ))}
              </div>
              <button className="btn-ghost w-full" onClick={() => send({ t: 'night', skip: true })}>Don't peek — back to the shadows</button>
            </>
          ) : (
            <button className="btn-moon w-full" onClick={() => send({ t: 'night' })}>I've seen the pack — continue</button>
          )}
        </div>
      )}

      {role === 'seer' && (
        <div>
          <p className="text-sm text-moon-dim mb-3">Read the truth: study one player's card, or two of the center cards.</p>
          {!mode && (
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-ghost" onClick={() => { setMode('player'); setPicks([]); }}>Read a player</button>
              <button className="btn-ghost" onClick={() => { setMode('center'); setPicks([]); }}>Read the center</button>
            </div>
          )}
          {mode === 'player' && (
            <>
              <PlayerGrid others={others} selected={picks} onPick={(id) => send({ t: 'night', mode: 'player', target: id })} />
              <BackRow onBack={() => setMode(null)} />
            </>
          )}
          {mode === 'center' && (
            <>
              <p className="eyebrow mb-2 mt-1">Choose two ({picks.length}/2)</p>
              <div className="flex justify-center gap-3 mb-3">
                {centers.map((i) => (
                  <Card key={i} size="md" selectable selected={picks.includes(i)} label={`Center card ${i + 1}`} onClick={() => togglePick(i, 2)} />
                ))}
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost flex-1" onClick={() => setMode(null)}>Back</button>
                <button className="btn-moon flex-1" disabled={picks.length !== 2} onClick={() => send({ t: 'night', mode: 'center', center: picks })}>Reveal</button>
              </div>
            </>
          )}
        </div>
      )}

      {role === 'robber' && (
        <div>
          <p className="text-sm text-moon-dim mb-3">Steal another player's card and take their role — then see what you became.</p>
          <PlayerGrid others={others} selected={picks} onPick={(id) => send({ t: 'night', target: id })} />
          <button className="btn-ghost w-full mt-1" onClick={() => send({ t: 'night', skip: true })}>Don't rob anyone</button>
        </div>
      )}

      {role === 'troublemaker' && (
        <div>
          <p className="text-sm text-moon-dim mb-3">Swap two other players' cards. You won't see either one — but it changes their fate.</p>
          <p className="eyebrow mb-2">Pick two ({picks.length}/2)</p>
          <PlayerGrid others={others} selected={picks} multi onPick={(id) => togglePick(id, 2)} />
          <div className="flex gap-2 mt-1">
            <button className="btn-ghost flex-1" onClick={() => send({ t: 'night', skip: true })}>Cause no trouble</button>
            <button className="btn-moon flex-1" disabled={picks.length !== 2} onClick={() => send({ t: 'night', a: picks[0], b: picks[1] })}>Swap them</button>
          </div>
        </div>
      )}

      {role === 'insomniac' && (
        <div>
          <p className="text-sm text-moon-dim mb-3">The night is nearly over. Lie awake and check the card you now hold — it may have changed.</p>
          <button className="btn-moon w-full" onClick={() => send({ t: 'night' })}>Check your card</button>
        </div>
      )}
    </motion.div>
  );
}

function PlayerGrid({ others, selected = [], onPick, multi }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {others.map((p) => {
        const on = selected.includes(p.id);
        return (
          <button
            key={p.id}
            onClick={() => onPick(p.id)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-frost ${
              on ? 'border-frost bg-frost/15 text-moon' : 'border-moon/15 bg-white/[0.03] text-moon-dim hover:border-frost/50 hover:text-moon'
            } ${!p.connected ? 'opacity-50' : ''}`}
          >
            <span className="grid place-items-center w-7 h-7 rounded-full bg-frost/15 text-frost font-display font-bold text-xs">{p.name[0]?.toUpperCase()}</span>
            <span className="truncate">{p.name}</span>
            {multi && on && <span className="ml-auto text-frost">✓</span>}
          </button>
        );
      })}
    </div>
  );
}

function BackRow({ onBack }) {
  return <button className="btn-ghost w-full mt-2" onClick={onBack}>Back</button>;
}

// Persistent reminder of your secret role + everything you've learned tonight.
export function SecretDock({ me, compact }) {
  if (!me?.role) return null;
  const r = ROLES[me.role];
  const lines = (me.info || []).map(infoLine).filter(Boolean);
  return (
    <div className={`w-full ${compact ? 'max-w-sm' : ''} rounded-xl border border-moon/10 bg-night-abyss/50 p-3 flex items-start gap-3`}>
      <Card role={me.role} faceUp size="sm" />
      <div className="min-w-0 flex-1 text-left">
        <div className="eyebrow !text-[0.55rem]">Your card</div>
        <div className="font-display text-lg leading-tight" style={{ color: r.color }}>{r.name}</div>
        {lines.length > 0 ? (
          <ul className="mt-1 space-y-0.5">
            {lines.map((l, i) => <li key={i} className="text-xs text-moon-dim leading-snug">• {l}</li>)}
          </ul>
        ) : (
          <p className="text-xs text-moon-faint mt-1">{r.blurb}</p>
        )}
      </div>
    </div>
  );
}
