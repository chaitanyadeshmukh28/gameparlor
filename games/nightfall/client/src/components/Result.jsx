import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Card from './Card.jsx';
import { ROLES, roleName, TEAMS, recapLine } from '../game-meta.js';

const HEADLINE = {
  village: 'The Village wins',
  werewolf: 'The Werewolves win',
  outcast: 'The Tanner wins',
  none: 'No one wins',
};

export default function Result({ state, send }) {
  const result = state.result;
  const reduce = useReducedMotion();
  // The reveal plays as a sequence: first the village's vote tally flies in,
  // then the cards flip up + the eliminated are stamped, then the win banner
  // sweeps in with the full breakdown (QA #13 / #14).
  const [stage, setStage] = useState(reduce ? 'reveal' : 'tally');

  const hasVotes = result && Object.keys(result.votes || {}).length > 0;
  useEffect(() => {
    if (stage !== 'tally') return;
    // Skip the tally beat entirely if nobody actually voted.
    const t = setTimeout(() => setStage('reveal'), hasVotes ? 2800 : 0);
    return () => clearTimeout(t);
  }, [stage, hasVotes]);

  if (!result) return null;

  return (
    <AnimatePresence mode="wait">
      {stage === 'tally'
        ? <Tally key="tally" state={state} onDone={() => setStage('reveal')} />
        : <Reveal key="reveal" state={state} send={send} />}
    </AnimatePresence>
  );
}

// "The village decides…" — arrows from each voter to the accused, counters
// ticking up, before we cut to the reveal (QA #14).
function Tally({ state, onDone }) {
  const result = state.result;
  const players = state.players;
  const nameOf = (id) => players.find((p) => p.id === id)?.name ?? '—';
  const initialOf = (id) => (nameOf(id)[0] || '?').toUpperCase();
  const accused = Object.keys(result.counts || {});
  // Who voted for each accused player.
  const votersFor = (target) => Object.entries(result.votes || {}).filter(([, t]) => t === target).map(([v]) => v);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }}
      role="button" tabIndex={0} onClick={onDone}
      className="relative z-10 min-h-[100dvh] w-full flex flex-col items-center justify-center px-5 cursor-pointer select-none"
    >
      <motion.p initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="eyebrow mb-1">The reckoning</motion.p>
      <motion.h2 initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-display text-3xl text-moon mb-6">The village decides…</motion.h2>

      <div className="w-full max-w-sm space-y-2.5">
        {accused.map((target, i) => {
          const voters = votersFor(target);
          return (
            <motion.div
              key={target}
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.18 }}
              className="rounded-xl border border-blood/30 bg-blood/[0.08] px-3 py-2.5 flex items-center gap-3"
            >
              <span className="grid place-items-center w-9 h-9 rounded-full bg-blood/20 text-blood-bright font-display font-bold">{initialOf(target)}</span>
              <div className="min-w-0 flex-1 text-left">
                <div className="text-sm text-moon truncate">{nameOf(target)}</div>
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  {voters.map((v, j) => (
                    <motion.span
                      key={v}
                      initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.35 + i * 0.18 + j * 0.12 }}
                      className="text-[0.62rem] text-moon-faint inline-flex items-center gap-0.5"
                    >
                      <span className="text-blood/70">↳</span>{nameOf(v)}
                    </motion.span>
                  ))}
                </div>
              </div>
              <motion.span
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.4 + i * 0.18 }}
                className="font-mono text-xl text-blood-bright"
              >
                {result.counts[target]}
              </motion.span>
            </motion.div>
          );
        })}
      </div>
      <p className="text-[0.7rem] text-moon-faint mt-6">tap to reveal the truth</p>
    </motion.div>
  );
}

// The full reveal — win banner sweeps in, every card flips up, the eliminated
// are stamped, and the night recap is laid out (QA #13).
function Reveal({ state, send }) {
  const result = state.result;
  const players = state.players;
  const meEntry = players.find((p) => p.isYou);
  const youWon = !!meEntry?.winner;
  const nameOf = (id) => players.find((p) => p.id === id)?.name ?? '—';
  const team = TEAMS[result.team] || TEAMS.none;
  const recap = (result.nightActions || []).map(recapLine).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="relative z-10 min-h-[100dvh] w-full overflow-y-auto px-4 pt-14 pb-8 flex flex-col items-center"
    >
      {/* 1 + 2 — who won, and why, with the banner sweeping in */}
      <motion.div
        initial={{ x: '-110%', opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 90, damping: 18 }}
        className="text-center mb-5 max-w-md"
      >
        <p className="eyebrow mb-2" style={{ color: team.color }}>{youWon ? 'You win' : 'You lose'}</p>
        <h2 className="font-display text-4xl font-bold leading-none" style={{ color: team.color }}>{HEADLINE[result.team]}</h2>
        <p className="mt-3 text-moon text-[0.95rem] leading-snug rounded-xl border px-4 py-3"
          style={{ borderColor: `${team.color}40`, background: `${team.color}12` }}>
          {result.reason}
        </p>
        <p className="text-moon-faint text-xs mt-2">
          {result.deaths.length === 0 ? 'No one was eliminated.' : `Voted out: ${result.deaths.map(nameOf).join(', ')}.`}
          {' '}{youWon ? 'You are among the winners.' : 'You did not win this round.'}
        </p>
      </motion.div>

      {/* 3 — full reveal: every player's final role, and their starting role if it changed */}
      <p className="eyebrow mb-2">The reveal</p>
      <div className="w-full max-w-lg grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {players.map((p, i) => {
          const swapped = p.dealt !== p.final;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 + i * 0.07 }}
              className={`rounded-xl border p-2 flex flex-col items-center text-center ${p.winner ? 'border-lantern/60 bg-lantern/[0.07]' : 'border-moon/10 bg-night-raised/40'}`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="font-medium text-sm text-moon truncate max-w-[7rem]">{p.name}{p.isYou && ' (you)'}</span>
                {p.winner && <span aria-label="winner" title="winner">👑</span>}
              </div>
              <Card role={p.final} faceUp dead={p.dead} size="md" delay={0.24 + i * 0.07} />
              <div className="mt-1.5 leading-tight space-y-0.5">
                {p.dead && <div className="font-mono text-[0.6rem] uppercase tracking-wider text-blood-bright">voted out</div>}
                {swapped ? (
                  <div className="text-[0.66rem] text-frost-bright">started {roleName(p.dealt)} → ended {roleName(p.final)}</div>
                ) : (
                  <div className="text-[0.66rem] text-moon-faint">stayed the {roleName(p.final)}</div>
                )}
                {p.votedFor && <div className="text-[0.62rem] text-moon-faint">voted {nameOf(p.votedFor)}</div>}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* The three center cards */}
      <p className="eyebrow mb-2">The center held</p>
      <div className="flex justify-center gap-2 mb-6">
        {result.center.map((role, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Card role={role} faceUp size="sm" delay={0.3 + i * 0.08} />
            <span className="text-[0.6rem] text-moon-faint">{roleName(role)}</span>
          </div>
        ))}
      </div>

      {/* A short recap of what happened in the dark */}
      {recap.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="w-full max-w-md mb-7">
          <p className="eyebrow mb-2 text-center">In the dark</p>
          <ul className="rounded-xl border border-moon/10 bg-night-abyss/50 divide-y divide-moon/5">
            {recap.map((line, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 + i * 0.08 }}
                className="px-4 py-2.5 text-sm text-moon-dim leading-snug flex gap-2"
              >
                <span className="text-frost/70">›</span><span>{line}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      {state.isHost ? (
        <button className="btn-moon w-full max-w-xs" onClick={() => send({ t: 'restart' })}>Play again</button>
      ) : (
        <p className="text-sm text-moon-faint">Waiting for the host to gather the village again…</p>
      )}
    </motion.div>
  );
}
