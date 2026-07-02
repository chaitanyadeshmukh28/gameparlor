import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Tile from './Tile.jsx';
import { Seal, Emblem } from './Emblem.jsx';
import { RulesButton } from './Rules.jsx';
import { TEAMS, other } from '../meta.js';

export default function OpsRoom({ state, code, send, error }) {
  const me = state.me;
  const { turn, turnRole, clue, score, board, phase, winner, endReason } = state;
  const isMyTurn = me.team === turn;
  const canClue = phase === 'play' && isMyTurn && me.isSpymaster && turnRole === 'clue';
  const canGuess = phase === 'play' && isMyTurn && !me.isSpymaster && turnRole === 'guess';
  const t = TEAMS[me.team] || TEAMS.red;

  return (
    <div className="relative z-10 h-[100dvh] flex flex-col px-3 pt-2 pb-3 max-w-2xl mx-auto overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 text-brass">
          <Seal className="w-4 h-4" />
          <span className="stencil text-sm brass-text">CIPHER</span>
          <span className="font-mono text-[0.6rem] text-manila-faint ml-1">/{code}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="label-tab border" style={{ color: t.bright, borderColor: `${t.hex}66`, background: `${t.hex}14` }}>
            {me.isSpymaster ? 'Spymaster' : 'Operative'} · {t.name}
          </span>
          <RulesButton />
        </div>
      </div>

      {/* Scoreboard */}
      <Scoreboard score={score} turn={turn} className="shrink-0 mt-2" />

      {/* Transmission banner */}
      <Transmission clue={clue} turn={turn} turnRole={turnRole} className="shrink-0 mt-2" />

      {/* The 5x5 grid — the signature element. Scrolls on short screens so the
          board is never clipped and the action tray below stays reachable. */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="min-h-full grid place-items-center py-2">
        <div className="grid grid-cols-5 gap-1.5 w-full max-w-[30rem]">
          {board.map((tile, i) => (
            <Tile
              key={i}
              tile={tile}
              isSpymaster={me.isSpymaster}
              selectable={canGuess && !tile.revealed}
              onSelect={() => send({ t: 'guess', index: i })}
              delay={Math.min(i * 0.012, 0.3)}
            />
          ))}
        </div>
        </div>
      </div>

      {/* Action tray */}
      <ActionTray
        state={state} me={me} canClue={canClue} canGuess={canGuess}
        isMyTurn={isMyTurn} send={send}
      />

      <Toast error={error} />
      <GameOver phase={phase} winner={winner} endReason={endReason}
        isHost={state.isHost} myTeam={me.team} send={send} board={board} state={state} />
    </div>
  );
}

function Scoreboard({ score, turn, className = '' }) {
  return (
    <div className={`relative flex items-stretch gap-2 ${className}`}>
      {['red', 'blue'].map((team, idx) => {
        const t = TEAMS[team];
        const active = turn === team;
        const counter = (
          <motion.div
            key={`${team}-${score[team].remaining}`}
            initial={{ scale: 1.3, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }}
            className="stencil text-3xl leading-none tabular-nums"
            style={{ color: t.bright }}
          >{score[team].remaining}</motion.div>
        );
        return (
          <div key={team}
            className={`frame flex-1 px-3 py-1.5 flex items-center gap-2 ${idx === 1 ? 'flex-row-reverse text-right' : ''}`}
            style={{ borderColor: active ? t.bright : `${t.hex}40`, boxShadow: active ? `0 0 18px -6px ${t.hex}` : undefined }}>
            {counter}
            <div className={idx === 1 ? 'text-right' : ''}>
              <div className="stencil text-xs" style={{ color: t.bright }}>{t.name}</div>
              <div className="eyebrow !text-[0.5rem]">agents left</div>
            </div>
          </div>
        );
      })}
      <div className="absolute left-1/2 -translate-x-1/2 grid place-items-center pointer-events-none">
        <motion.div
          key={turn} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="w-9 h-9 rounded-full grid place-items-center border"
          style={{ borderColor: TEAMS[turn].bright, background: '#0b0c0f' }}>
          <span className="w-2.5 h-2.5 rounded-full animate-flicker" style={{ background: TEAMS[turn].bright }} />
        </motion.div>
      </div>
    </div>
  );
}

function Transmission({ clue, turn, turnRole, className = '' }) {
  const t = TEAMS[turn];
  return (
    <div className={`frame px-3 py-2 overflow-hidden ${className}`} style={{ borderColor: `${t.hex}55` }}>
      <AnimatePresence mode="wait">
        {clue ? (
          <motion.div key={clue.word + clue.count}
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            className="flex items-center gap-2">
            <span className="eyebrow !text-[0.52rem] shrink-0" style={{ color: t.bright }}>▸ Transmission</span>
            <span className="font-mono font-bold text-base sm:text-lg tracking-wide text-parch truncate">
              {clue.word}
            </span>
            <span className="font-mono text-sm px-1.5 rounded-sm shrink-0"
              style={{ background: `${t.hex}22`, color: t.bright }}>{clue.count}</span>
            <span className="ml-auto flex items-center gap-1 shrink-0" aria-label="guesses remaining">
              {Array.from({ length: clue.guessesAllowed }).map((_, i) => (
                <span key={i} className="w-2 h-2 rounded-full"
                  style={{ background: i < clue.guessesMade ? t.bright : `${t.hex}33` }} />
              ))}
            </span>
          </motion.div>
        ) : (
          <motion.div key="await"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-manila-dim">
            <span className="eyebrow !text-[0.52rem]" style={{ color: t.bright }}>▸ {t.name} channel</span>
            <span className="font-mono text-sm">spymaster composing<motion.span
              animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.4 }}>…</motion.span></span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionTray({ state, me, canClue, canGuess, isMyTurn, send }) {
  const { turn, clue, score } = state;
  const t = TEAMS[me.team] || TEAMS.red;
  const remaining = score[me.team]?.remaining ?? 9;

  if (canClue) return <ClueForm send={send} max={remaining} teamColor={t} />;

  if (canGuess) {
    const canStop = clue && clue.guessesMade >= 1;
    return (
      <div className="shrink-0 frame px-3 py-2.5 flex items-center gap-3" style={{ borderColor: `${t.hex}66` }}>
        <div className="flex-1">
          <div className="font-semibold text-sm" style={{ color: t.bright }}>Your move, operative.</div>
          <div className="text-[0.7rem] text-manila-dim">Tap a codeword you think is yours.</div>
        </div>
        <button className="btn !py-2 !px-3 border border-manila/30 text-parch disabled:opacity-30 hover:border-brass/60"
          disabled={!canStop} onClick={() => send({ t: 'stop' })}>End turn</button>
      </div>
    );
  }

  // Spectator / waiting states.
  let msg;
  if (me.isSpymaster && isMyTurn) msg = 'Your operatives are decoding your clue…';
  else if (me.isSpymaster) msg = `${TEAMS[turn].name} command is operating. Hold position.`;
  else if (isMyTurn) msg = 'Your spymaster is composing a clue…';
  else msg = `${TEAMS[turn].name} Command has the board.`;
  return (
    <div className="shrink-0 frame px-3 py-3 flex items-center gap-2 text-manila-dim">
      <span className="w-2 h-2 rounded-full animate-flicker" style={{ background: TEAMS[turn].bright }} />
      <span className="text-sm">{msg}</span>
    </div>
  );
}

function ClueForm({ send, max, teamColor }) {
  const [word, setWord] = useState('');
  const [count, setCount] = useState(1);
  const valid = /^[a-zA-Z]+(?:[-'][a-zA-Z]+)?$/.test(word.trim());
  const submit = () => {
    if (!valid) return;
    send({ t: 'clue', word: word.trim(), count });
    setWord(''); setCount(1);
  };
  const clamp = (n) => Math.max(1, Math.min(max, n));

  return (
    <div className="shrink-0 frame p-2.5" style={{ borderColor: `${teamColor.hex}66` }}>
      <div className="eyebrow !text-[0.52rem] mb-1.5" style={{ color: teamColor.bright }}>Compose transmission</div>
      <div className="flex items-center gap-2">
        <input
          className="field !py-2 flex-1 font-mono uppercase tracking-wide"
          placeholder="ONE WORD" maxLength={20} value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          autoFocus
        />
        <div className="flex items-center rounded-sm border border-manila/25 overflow-hidden shrink-0">
          <button onClick={() => setCount((c) => clamp(c - 1))} aria-label="decrease number"
            className="w-8 h-9 grid place-items-center text-parch hover:bg-white/5 text-lg">−</button>
          <span className="w-7 text-center stencil text-lg tabular-nums" style={{ color: teamColor.bright }}>{count}</span>
          <button onClick={() => setCount((c) => clamp(c + 1))} aria-label="increase number"
            className="w-8 h-9 grid place-items-center text-parch hover:bg-white/5 text-lg">+</button>
        </div>
        <button className="btn-brass !py-2 !px-3 shrink-0" disabled={!valid} onClick={submit}>Transmit</button>
      </div>
    </div>
  );
}

function Toast({ error }) {
  const [show, setShow] = useState(null);
  useEffect(() => {
    if (!error) return;
    setShow(error);
    const id = setTimeout(() => setShow(null), 2600);
    return () => clearTimeout(id);
  }, [error]);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
          className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[60] px-4 py-2 rounded-sm border border-red/50 bg-ink-deep/95 text-red-bright text-sm shadow-lg">
          {show.message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function GameOver({ phase, winner, endReason, isHost, myTeam, send }) {
  if (phase !== 'over') return null;
  const t = TEAMS[winner];
  const won = winner === myTeam;
  const assassin = endReason === 'assassin';
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="fixed inset-0 z-[90] grid place-items-center p-6"
        style={{ background: assassin ? 'rgba(40,4,4,0.92)' : 'rgba(5,5,6,0.9)', backdropFilter: 'blur(6px)' }}>
        {assassin && (
          <motion.div className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.7 }}
            style={{ background: '#d4232e' }} />
        )}
        <motion.div
          initial={{ scale: 0.85, y: 16 }} animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 20 }}
          className="panel max-w-sm w-full p-7 text-center">
          {assassin && (
            <div className="mx-auto mb-3 w-14 h-14 text-assassin"><Emblem type="assassin" className="w-full h-full" /></div>
          )}
          <p className="eyebrow mb-2">{assassin ? 'Assassin triggered' : 'Mission complete'}</p>
          <h2 className="stencil text-4xl mb-1" style={{ color: t.bright }}>{t.name} wins</h2>
          <p className="text-manila-dim text-sm mb-5">
            {assassin
              ? `${TEAMS[other(winner)].name} Command uncovered the assassin.`
              : `${t.name} Command contacted every agent first.`}
            {' '}{won ? 'Stellar work.' : 'Regroup and run it back.'}
          </p>
          {isHost ? (
            <button className="btn-brass w-full" onClick={() => send({ t: 'restart' })}>New mission</button>
          ) : (
            <p className="text-sm text-manila-dim">Waiting for the host to start a new mission…</p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
