import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Card from './Card.jsx';
import PlayerSeat, { Coins } from './PlayerSeat.jsx';
import { ActionBar, ResponsePrompt, LossPrompt, ExchangePrompt } from './Prompts.jsx';
import StatusTray from './StatusTray.jsx';
import { CheatSheetButton } from './CheatSheet.jsx';
import { Emblem } from '../emblems.jsx';
import { CHARACTERS as CHAR_META } from '../game-meta.js';

export default function Table({ state, code, send, error }) {
  const me = state.players.find((p) => p.id === state.you);
  const opponents = state.players.filter((p) => p.id !== state.you);
  const myTurn = state.phase === 'turn' && state.turn === state.you;
  const [targeting, setTargeting] = useState(null); // an action key awaiting a target

  useEffect(() => { if (state.phase !== 'turn') setTargeting(null); }, [state.phase, state.turn]);

  const choose = (key, meta) => {
    if (meta.needsTarget) setTargeting(key);
    else send({ t: 'action', action: key });
  };
  const pickTarget = (targetId) => {
    if (!targeting) return;
    send({ t: 'action', action: targeting, target: targetId });
    setTargeting(null);
  };

  const pd = state.pending;
  const actorId = pd?.actor;
  const targetId = pd?.target;
  const blockerId = pd?.block?.blocker;

  return (
    <div className="relative z-10 h-[100dvh] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-2 border-b border-parch/10">
        <div className="flex items-baseline gap-3">
          <span className="font-display font-black text-xl gilt-text">Coup</span>
          <span className="font-mono text-xs tracking-[0.3em] text-parch-faint">{code}</span>
        </div>
        <div className="flex items-center gap-2">
          <CheatSheetButton />
          <button className="btn-ghost !py-1.5 !px-3 text-xs" onClick={() => send({ t: 'leave' })}>Leave</button>
        </div>
      </header>

      {/* Table surface — a single screen, no scrolling. */}
      <main className="flex-1 min-h-0 w-full max-w-5xl mx-auto flex flex-col px-2 sm:px-5 py-2 sm:py-3 gap-2 sm:gap-3 overflow-y-auto no-scrollbar">
        {/* Who's acted, who we're waiting on */}
        <StatusTray state={state} />

        {/* Opponents — one row, scrolls sideways if the table is full */}
        <div className="shrink-0 flex justify-start sm:justify-center gap-2 sm:gap-3 overflow-x-auto pb-1">
          {opponents.map((p) => (
            <PlayerSeat
              key={p.id}
              player={p}
              isTurn={state.turn === p.id && state.phase === 'turn'}
              isActor={actorId === p.id}
              isTarget={targetId === p.id}
              isBlocker={blockerId === p.id}
              targetable={!!targeting && !p.eliminated}
              onTarget={pickTarget}
            />
          ))}
        </div>

        {/* The court: the deck and a recap of what just happened.
            Scrolls internally on short screens so the action dock below is never clipped. */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <div className="min-h-full grid place-items-center py-2">
            <Court state={state} />
          </div>
        </div>

        {/* Bottom dock: your hand on the left, what you can do on the right */}
        <div className="shrink-0 grid lg:grid-cols-[auto_1fr] gap-2 sm:gap-3 items-start">
          <div className="panel p-2.5 sm:p-3">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <span className="grid place-items-center w-7 h-7 rounded-full bg-gilt/15 text-gilt font-display font-bold text-sm">
                  {me.name[0]?.toUpperCase()}
                </span>
                <div className="leading-tight">
                  <div className="font-medium text-sm">{me.name} <span className="text-parch-faint">(you)</span></div>
                  <Coins n={me.coins} />
                </div>
              </div>
              {me.eliminated && <span className="font-display text-assassin text-xs uppercase tracking-widest">Out</span>}
            </div>
            <div className="flex gap-2 justify-center">
              {me.cards.map((card, i) => (
                <Card key={i} char={card.char} faceUp dead={card.revealed} size="md" delay={i * 0.08} />
              ))}
            </div>
          </div>

          {/* Active prompt */}
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <Prompt key={promptKey(state)} state={state} me={me} myTurn={myTurn} send={send} choose={choose} />
            </AnimatePresence>
          </div>
        </div>
      </main>

      <AnimatePresence>{state.phase === 'over' && <GameOver state={state} send={send} />}</AnimatePresence>
      <Toast error={error} />
    </div>
  );
}

function promptKey(state) {
  if (state.phase === 'response') return 'response-' + state.pending?.mode;
  if (state.phase === 'lose') return 'lose-' + state.pendingLoss?.playerId;
  return state.phase + '-' + state.turn;
}

function Prompt({ state, me, myTurn, send, choose }) {
  if (me.eliminated && state.phase !== 'over') {
    return <Waiting>You're out — watching how it unfolds.</Waiting>;
  }
  if (state.phase === 'turn') {
    if (myTurn) return <ActionBar me={me} onChoose={choose} />;
    const who = state.players.find((p) => p.id === state.turn);
    return <Waiting>{who?.name} is deciding their move…</Waiting>;
  }
  if (state.phase === 'response') return <ResponsePrompt state={state} send={send} />;
  if (state.phase === 'lose') {
    if (state.pendingLoss?.playerId === state.you) return <LossPrompt me={me} send={send} />;
    const who = state.players.find((p) => p.id === state.pendingLoss?.playerId);
    return <Waiting>{who?.name} is choosing a card to lose…</Waiting>;
  }
  if (state.phase === 'exchange') {
    if (state.exchange) return <ExchangePrompt exchange={state.exchange} send={send} />;
    const who = state.players.find((p) => p.id === state.turn);
    return <Waiting>{who?.name} is exchanging with the deck…</Waiting>;
  }
  return null;
}

function Waiting({ children }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="panel p-4 flex items-center gap-3 text-sm text-parch-dim">
      <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-gilt/30 border-t-gilt animate-spin" />
      {children}
    </motion.div>
  );
}

// Skip pure turn-handoff lines so the recap is about what players actually did.
const isNoise = (text) => /^It is .* turn\.$/.test(text) || /^The game begins/.test(text) || /^Back to the lobby/.test(text);

function Court({ state }) {
  const events = (state.log || []).filter((e) => !isNoise(e.text));
  const recent = events.slice(-3); // most recent first below

  return (
    <div className="flex flex-col items-center gap-2.5 sm:gap-4 max-h-full">
      {/* Court deck */}
      <div className="relative">
        <div className="card-back w-11 h-16 sm:w-14 sm:h-20 rounded-lg border border-gilt/30 -rotate-3" />
        <div className="card-back w-11 h-16 sm:w-14 sm:h-20 rounded-lg border border-gilt/30 absolute inset-0 rotate-3 -z-10" />
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 font-mono text-[0.55rem] text-parch-faint bg-felt-deep px-1.5 rounded whitespace-nowrap">
          {state.deckCount} in deck
        </span>
      </div>

      {/* Deck composition: how many of each character remain unseen (unseen / total).
          Coup ships 3 of each — track the dead cards to deduce who holds what. */}
      {state.charCounts?.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1 max-w-[16rem]">
          {state.charCounts.map(({ char, total, revealed }) => {
            const meta = CHAR_META[char];
            const unseen = total - revealed;
            return (
              <div
                key={char}
                className="flex items-center gap-1 rounded border bg-white/[0.02] px-1.5 py-0.5"
                style={{ borderColor: `${meta?.color || '#c9a227'}33` }}
                title={`${meta?.name || char}: ${unseen} of ${total} unseen (${revealed} revealed)`}
              >
                <span style={{ color: meta?.color }}><Emblem name={char} className="w-3 h-3" /></span>
                <span className="font-mono text-[0.6rem] leading-none">
                  <span className="text-parch">{unseen}</span>
                  <span className="text-parch-faint">/{total}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* What just happened — a short recap, newest at the bottom */}
      <div className="text-center min-w-0 max-w-md">
        <p className="eyebrow mb-1 sm:mb-1.5">Last moves</p>
        {recent.length === 0 ? (
          <p className="text-sm text-parch-faint">The table is quiet. Make the first move.</p>
        ) : (
          <div className="space-y-0.5">
            {recent.map((e, i) => {
              const newest = i === recent.length - 1;
              const oldestOfThree = recent.length === 3 && i === 0; // trim to 2 lines on phones
              return (
                <motion.p
                  key={e.ts + '-' + e.text}
                  initial={newest ? { opacity: 0, y: 6 } : false}
                  animate={{ opacity: newest ? 1 : 0.45 - (recent.length - 2 - i) * 0.12 }}
                  className={`leading-snug ${oldestOfThree ? 'hidden sm:block' : ''} ${newest ? 'text-parch text-sm font-medium' : 'text-parch-dim text-xs'}`}
                >
                  {e.text}
                </motion.p>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function GameOver({ state, send }) {
  const winner = state.players.find((p) => p.id === state.winner);
  const iWon = state.winner === state.you;
  // The server reveals the winner's final hand at game over.
  const survivors = (winner?.cards || []).filter((c) => c.char);
  // How it ended: the last few meaningful log lines (eliminations, the winning blow).
  const recap = (state.log || []).filter((e) => !isNoise(e.text)).slice(-3);
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-felt-deep/85 backdrop-blur-md px-5 py-8"
    >
      <motion.div initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} className="panel p-7 sm:p-8 text-center max-w-sm w-full my-auto">
        <p className="eyebrow mb-3">{iWon ? 'The last seat is yours' : 'The dust settles'}</p>
        <h2 className="font-display text-4xl font-black mb-2 gilt-text">{winner ? winner.name : 'No one'} wins</h2>
        <p className="text-parch-dim text-sm mb-5">
          {state.winReason || `${winner?.name || 'No one'} was the last conspirator standing.`}
        </p>

        {survivors.length > 0 && (
          <div className="mb-5">
            <p className="eyebrow mb-2">{iWon ? 'Your winning hand' : `${winner.name}'s winning hand`}</p>
            <div className="flex gap-2 justify-center">
              {survivors.map((c, i) => (
                <Card key={i} char={c.char} faceUp dead={c.revealed} size="md" delay={i * 0.1} />
              ))}
            </div>
          </div>
        )}

        {recap.length > 0 && (
          <div className="mb-6 text-left rounded-lg border border-parch/10 bg-white/[0.02] p-3 space-y-1">
            <p className="eyebrow mb-1">How it ended</p>
            {recap.map((e, i) => (
              <p key={i} className="text-xs text-parch-dim leading-snug">{e.text}</p>
            ))}
          </div>
        )}

        {state.isHost ? (
          <button className="btn-gilt w-full" onClick={() => send({ t: 'restart' })}>Play again</button>
        ) : (
          <p className="text-sm text-parch-faint">Waiting for the host to deal another round…</p>
        )}
      </motion.div>
    </motion.div>
  );
}

function Toast({ error }) {
  const [show, setShow] = useState(null);
  useEffect(() => {
    if (!error) return;
    setShow(error);
    const t = setTimeout(() => setShow(null), 3200);
    return () => clearTimeout(t);
  }, [error]);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] rounded-lg border border-assassin/50 bg-felt-raised px-4 py-2.5 text-sm text-parch shadow-card"
        >
          {show.message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
