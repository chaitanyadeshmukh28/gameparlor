import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Card from './Card.jsx';
import PlayerSeat, { Coins } from './PlayerSeat.jsx';
import { ActionBar, ResponsePrompt, LossPrompt, ExchangePrompt } from './Prompts.jsx';
import StatusTray from './StatusTray.jsx';
import { CheatSheetButton } from './CheatSheet.jsx';

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
      <main className="flex-1 min-h-0 w-full max-w-5xl mx-auto flex flex-col px-2 sm:px-5 py-2 sm:py-3 gap-2 sm:gap-3 overflow-y-auto">
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

        {/* The court: the deck and a recap of what just happened */}
        <div className="flex-1 min-h-0 grid place-items-center overflow-hidden">
          <Court state={state} />
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
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-felt-deep/85 backdrop-blur-md px-5"
    >
      <motion.div initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} className="panel p-8 text-center max-w-sm w-full">
        <p className="eyebrow mb-3">{iWon ? 'The last seat is yours' : 'The dust settles'}</p>
        <h2 className="font-display text-4xl font-black mb-2 gilt-text">{winner ? winner.name : 'No one'} wins</h2>
        <p className="text-parch-dim text-sm mb-6">
          {iWon ? 'Every rival outplayed, outbluffed, undone.' : `${winner?.name} was the last conspirator standing.`}
        </p>
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
