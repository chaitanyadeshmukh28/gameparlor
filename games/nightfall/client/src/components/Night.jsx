import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Emblem } from '../emblems.jsx';
import { ROLES, roleName, infoLine } from '../game-meta.js';
import Card from './Card.jsx';

const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

// Night-action results that are worth SHOWING with a card flip rather than a
// bullet of text (QA #12). 'troublemaker'/'skip'/'wolves' reveal no card.
const REVEAL_KINDS = ['seer-player', 'seer-center', 'robber', 'wolf-peek', 'insomniac'];

export default function Night({ state, send }) {
  const { night, me } = state;
  const infoCount = me?.info?.length ?? 0;
  const lastSeen = useRef(infoCount);
  const [reveal, setReveal] = useState(null);

  // When a fresh reveal-worthy piece of knowledge arrives (i.e. just after you
  // acted), play it as a card flip before settling back into the dark.
  useEffect(() => {
    if (infoCount > lastSeen.current && !night?.youAreActive) {
      const latest = me.info[me.info.length - 1];
      if (latest && REVEAL_KINDS.includes(latest.k)) setReveal(latest);
    }
    lastSeen.current = infoCount;
  }, [infoCount, night?.youAreActive]); // eslint-disable-line react-hooks/exhaustive-deps

  if (reveal) return <ActionReveal key="reveal" entry={reveal} onDone={() => setReveal(null)} />;
  if (night?.youAreActive) return <WakePrompt key="wake" state={state} send={send} />;
  return <Sleeping key="sleep" me={me} />;
}

// A revealed card (or two), flipped face-up with a glow, then dismissed.
function ActionReveal({ entry, onDone }) {
  const reduce = useReducedMotion();
  const roles = entry.k === 'seer-center' ? entry.roles : [entry.role];
  const caption = infoLine(entry);
  const title = {
    'seer-player': 'You read their card',
    'seer-center': 'You read the center',
    robber: 'You took a new card',
    'wolf-peek': 'You glimpsed the center',
    insomniac: 'You wake and check your card',
  }[entry.k] || 'Revealed';

  useEffect(() => {
    const t = setTimeout(onDone, reduce ? 1100 : 2600);
    return () => clearTimeout(t);
  }, [onDone, reduce]);

  return (
    <motion.div
      {...fade}
      role="button" tabIndex={0}
      onClick={onDone} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onDone()}
      className="w-full max-w-md mx-auto flex flex-col items-center text-center gap-4 cursor-pointer select-none"
    >
      <p className="eyebrow">{title}</p>
      <motion.div
        className="flex justify-center gap-3"
        animate={reduce ? undefined : { filter: ['drop-shadow(0 0 0 transparent)', 'drop-shadow(0 0 18px rgba(142,162,255,0.6))', 'drop-shadow(0 0 6px rgba(142,162,255,0.3))'] }}
        transition={{ duration: 1.6 }}
      >
        {roles.map((role, i) => (
          <Card key={i} role={role} faceUp size="lg" delay={reduce ? 0 : 0.15 + i * 0.18} />
        ))}
      </motion.div>
      <p className="text-sm text-moon leading-snug max-w-xs">{caption}</p>
      <p className="text-[0.7rem] text-moon-faint">tap to return to the dark</p>
    </motion.div>
  );
}

// What everyone who isn't currently acting sees — secrecy preserved. Includes an
// ambient, non-leaking sense of night progress (QA #15) and a notice if you
// slept through your own turn after a disconnect (QA #5).
function Sleeping({ me }) {
  const reduce = useReducedMotion();
  return (
    <motion.div {...fade} className="w-full max-w-md mx-auto flex flex-col items-center text-center gap-4">
      <motion.div
        animate={reduce ? undefined : { opacity: [0.4, 1, 0.4] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="text-frost/70"
      >
        <Emblem name="eye" className="w-9 h-9" />
      </motion.div>
      <div>
        <p className="font-display text-2xl text-moon">The village sleeps</p>
        <p className="text-sm text-moon-dim mt-1">Someone is moving in the dark. Keep your eyes shut…</p>
      </div>

      {/* Ambient progress — purely cosmetic stirring dots; reveals no role data. */}
      <div className="flex items-center gap-1.5" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-frost/60"
            animate={reduce ? undefined : { opacity: [0.2, 1, 0.2], scale: [0.8, 1.15, 0.8] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.28 }}
          />
        ))}
      </div>
      <p className="text-[0.7rem] text-moon-faint -mt-2">roles still stirring…</p>

      {me?.missedTurn && (
        <div className="w-full rounded-lg border border-lantern/40 bg-lantern/10 px-3 py-2 text-xs text-lantern leading-snug">
          You dropped during your turn and slept through your night action. Nothing you can do until dawn — your card still stands.
        </div>
      )}

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
          {ctx.partners.length ? (
            <WolfPack partners={ctx.partners} />
          ) : (
            <p className="text-sm text-moon-dim mb-3">
              {ctx.lone ? 'You hunt alone tonight — no fellow Werewolf woke. You may glimpse one center card.'
                : 'No fellow Werewolves stirred.'}
            </p>
          )}
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
        <TroublemakerStep others={others} picks={picks} togglePick={togglePick} send={send} />
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

// Werewolf intro — glow the partner names and draw a connecting line between
// them and you, rather than a bare "Fellow Werewolves: …" sentence (QA #12).
function WolfPack({ partners }) {
  const reduce = useReducedMotion();
  const pulse = reduce ? undefined : { boxShadow: ['0 0 0 0 rgba(214,86,104,0)', '0 0 18px 2px rgba(214,86,104,0.55)', '0 0 0 0 rgba(214,86,104,0)'] };
  return (
    <div className="mb-3">
      <p className="text-sm text-moon-dim mb-3">The pack recognizes its own. Stay hidden and survive the vote.</p>
      <div className="relative flex items-center justify-center gap-3 py-2">
        <div className="absolute inset-x-8 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-blood/60 to-transparent" aria-hidden />
        <motion.span
          className="relative z-10 grid place-items-center w-12 h-12 rounded-full bg-blood/20 border border-blood/50 text-blood-bright font-display font-bold"
          animate={pulse} transition={{ duration: 2, repeat: Infinity }}
        >
          You
        </motion.span>
        {partners.map((name, i) => (
          <motion.span
            key={name + i}
            className="relative z-10 flex items-center gap-1.5 rounded-full bg-blood/15 border border-blood/45 px-3 py-2 text-sm text-blood-bright"
            animate={pulse} transition={{ duration: 2, repeat: Infinity, delay: 0.4 + i * 0.3 }}
          >
            <Emblem name="werewolf" className="w-4 h-4" />
            <b className="font-display">{name}</b>
          </motion.span>
        ))}
      </div>
    </div>
  );
}

// Troublemaker — emphasize the MOTION of two cards crossing (you never see their
// faces), then commit the swap (QA #12).
function TroublemakerStep({ others, picks, togglePick, send }) {
  const reduce = useReducedMotion();
  const [crossing, setCrossing] = useState(false);

  const swap = () => {
    if (picks.length !== 2) return;
    if (reduce) { send({ t: 'night', a: picks[0], b: picks[1] }); return; }
    setCrossing(true);
    setTimeout(() => send({ t: 'night', a: picks[0], b: picks[1] }), 1100);
  };

  if (crossing) {
    return (
      <div className="flex flex-col items-center gap-3 py-2">
        <p className="eyebrow">Swapping their fates…</p>
        <div className="relative h-28 w-40">
          <motion.div className="absolute left-2 top-2" animate={{ x: [0, 96, 96], y: [0, 18, 0], rotate: [0, 8, 0] }} transition={{ duration: 1, ease: 'easeInOut' }}>
            <Card size="md" label="A card" />
          </motion.div>
          <motion.div className="absolute right-2 top-2" animate={{ x: [0, -96, -96], y: [0, -18, 0], rotate: [0, -8, 0] }} transition={{ duration: 1, ease: 'easeInOut' }}>
            <Card size="md" label="Another card" />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-moon-dim mb-3">Swap two other players' cards. You won't see either one — but it changes their fate.</p>
      <p className="eyebrow mb-2">Pick two ({picks.length}/2)</p>
      <PlayerGrid others={others} selected={picks} multi onPick={(id) => togglePick(id, 2)} />
      <div className="flex gap-2 mt-1">
        <button className="btn-ghost flex-1" onClick={() => send({ t: 'night', skip: true })}>Cause no trouble</button>
        <button className="btn-moon flex-1" disabled={picks.length !== 2} onClick={swap}>Swap them</button>
      </div>
    </div>
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
// `strip` is a single-row, height-minimal variant so the day view fits one
// no-scroll mobile screen even for the host (QA #8).
export function SecretDock({ me, compact, strip }) {
  if (!me?.role) return null;
  const r = ROLES[me.role];
  const lines = (me.info || []).map(infoLine).filter(Boolean);
  if (strip) {
    return (
      <div className="w-full rounded-lg border border-moon/10 bg-night-abyss/55 px-2.5 py-2 flex items-center gap-2.5 text-left">
        <Card role={me.role} faceUp size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="eyebrow !text-[0.5rem]">Your card</span>
            <span className="font-display text-base leading-none" style={{ color: r.color }}>{r.name}</span>
          </div>
          {lines.length > 0 ? (
            <p className="mt-0.5 text-[0.7rem] text-moon-dim leading-snug">{lines.join('  •  ')}</p>
          ) : (
            <p className="mt-0.5 text-[0.7rem] text-moon-faint leading-snug">{r.blurb}</p>
          )}
        </div>
      </div>
    );
  }
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
