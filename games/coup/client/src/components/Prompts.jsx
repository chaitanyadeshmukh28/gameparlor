import { useState } from 'react';
import { motion } from 'framer-motion';
import Card from './Card.jsx';
import { ACTIONS, CHARACTERS, charName, actionLabel } from '../game-meta.js';

const wrap = 'panel p-4';

// ---- the action bar (your turn) -------------------------------------------
const ACTION_KEYS = ['income', 'foreign_aid', 'tax', 'steal', 'exchange', 'assassinate', 'coup'];

export function ActionBar({ me, onChoose }) {
  const forcedCoup = me.coins >= 10;
  return (
    <div className="panel p-2.5 sm:p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-display text-base sm:text-lg">Your move</h3>
        {forcedCoup && <span className="text-[0.65rem] sm:text-xs text-assassin">10+ coins — you must coup.</span>}
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 sm:gap-2">
        {ACTION_KEYS.map((key) => {
          const a = ACTIONS[key];
          const cost = a.cost || 0;
          const disabled = (forcedCoup && key !== 'coup') || (cost && me.coins < cost);
          const claimColor = a.claim ? CHARACTERS[a.claim].color : null;
          return (
            <button
              key={key}
              disabled={disabled}
              onClick={() => onChoose(key, a)}
              className={`group relative flex flex-col items-start gap-0.5 sm:gap-1 rounded-lg border p-1.5 sm:p-2.5 text-left transition
                disabled:opacity-30 disabled:cursor-not-allowed
                ${a.danger ? 'border-assassin/30 hover:border-assassin/70 hover:bg-assassin/10'
                           : 'border-parch/12 hover:border-gilt/50 hover:bg-white/[0.04]'}`}
            >
              <span className="font-display font-semibold text-xs sm:text-sm leading-tight">{a.label}</span>
              <span className="hidden sm:block text-[0.62rem] text-parch-dim leading-tight">{a.hint}</span>
              {a.claim && (
                <span className="text-[0.5rem] sm:text-[0.55rem] font-mono uppercase tracking-wider leading-none" style={{ color: claimColor }}>
                  {charName(a.claim)}
                </span>
              )}
              {cost > 0 && (
                <span className="absolute top-1 right-1.5 sm:top-2 sm:right-2 font-mono text-[0.55rem] sm:text-[0.6rem] text-gilt-bright">−{cost}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- response window (challenge / block / allow) --------------------------
export function ResponsePrompt({ state, send }) {
  const pd = state.pending;
  const actor = state.players.find((p) => p.id === pd.actor);
  const target = pd.target ? state.players.find((p) => p.id === pd.target) : null;
  const amResponder = pd.responders.includes(state.you);

  let headline;
  if (pd.mode === 'block_challenge') {
    const blocker = state.players.find((p) => p.id === pd.block.blocker);
    headline = <>{blocker.name} blocks with <b style={{ color: CHARACTERS[pd.block.claim].color }}>{charName(pd.block.claim)}</b>.</>;
  } else if (pd.action === 'foreign_aid') {
    headline = <>{actor.name} reaches for <b>Foreign Aid</b> (+2).</>;
  } else {
    headline = <>{actor.name} claims <b style={{ color: CHARACTERS[pd.claim]?.color }}>{charName(pd.claim)}</b> to {actionLabel(pd.action).toLowerCase()}{target ? <> {target.name}</> : null}.</>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={wrap}>
      <p className="text-sm mb-3">{headline}</p>
      {amResponder ? (
        <div className="flex flex-wrap gap-2">
          {pd.canChallenge && (
            <button className="btn-danger" onClick={() => send({ t: 'respond', kind: 'challenge' })}>
              {pd.mode === 'block_challenge' ? 'Challenge the block' : 'Challenge'}
            </button>
          )}
          {pd.canBlock && pd.blockChars.map((c) => (
            <button key={c} className="btn-ghost" style={{ borderColor: `${CHARACTERS[c].color}66` }}
              onClick={() => send({ t: 'respond', kind: 'block', blockChar: c })}>
              Block as {charName(c)}
            </button>
          ))}
          <button className="btn-gilt" onClick={() => send({ t: 'respond', kind: 'pass' })}>Allow</button>
        </div>
      ) : (
        <p className="text-sm text-parch-faint flex items-center gap-2">
          <Spinner /> Waiting for {pd.responders.length} player{pd.responders.length === 1 ? '' : 's'} to respond…
        </p>
      )}
    </motion.div>
  );
}

// ---- losing influence ------------------------------------------------------
export function LossPrompt({ me, send }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${wrap} text-center`}>
      <h3 className="font-display text-lg text-assassin mb-1">Lose an influence</h3>
      <p className="text-sm text-parch-dim mb-4">Choose which card to reveal. A revealed card is gone for good.</p>
      <div className="flex justify-center gap-4">
        {me.cards.map((card, i) =>
          card.revealed ? null : (
            <Card key={i} char={card.char} faceUp size="md" selectable onClick={() => send({ t: 'lose', cardIndex: i })} />
          )
        )}
      </div>
    </motion.div>
  );
}

// ---- ambassador exchange ---------------------------------------------------
export function ExchangePrompt({ exchange, send }) {
  const [picked, setPicked] = useState([]);
  const toggle = (i) => setPicked((p) => p.includes(i) ? p.filter((x) => x !== i) : p.length < exchange.keep ? [...p, i] : p);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${wrap} text-center`}>
      <h3 className="font-display text-lg mb-1">Exchange with the court</h3>
      <p className="text-sm text-parch-dim mb-4">Keep {exchange.keep} card{exchange.keep > 1 ? 's' : ''}; the rest return to the deck.</p>
      <div className="flex flex-wrap justify-center gap-3 mb-4">
        {exchange.cards.map((char, i) => (
          <Card key={i} char={char} faceUp size="md" selectable selected={picked.includes(i)} onClick={() => toggle(i)} />
        ))}
      </div>
      <button className="btn-gilt" disabled={picked.length !== exchange.keep} onClick={() => send({ t: 'exchange', keep: picked })}>
        Keep {picked.length}/{exchange.keep}
      </button>
    </motion.div>
  );
}

function Spinner() {
  return <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-gilt/30 border-t-gilt animate-spin" />;
}
