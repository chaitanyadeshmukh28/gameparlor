import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Letter from './Letter.jsx';
import { RulesButton } from './RulesSheet.jsx';
import { META, RANKS, Emblem, SealMark } from '../cards.jsx';

export default function Table({ state, code, send, error }) {
  const you = state.you;
  const me = state.players.find((p) => p.id === you);
  const opponents = state.players.filter((p) => p.id !== you);
  const myTurn = state.phase === 'play' && state.turn === you && !me?.eliminated;

  const [selected, setSelected] = useState(null);   // rank chosen to play
  const [target, setTarget] = useState(null);       // target player id (or you)
  const [guess, setGuess] = useState(null);         // Guard rank guess

  // Reset the composer whenever the turn or phase changes.
  useEffect(() => { setSelected(null); setTarget(null); setGuess(null); }, [state.turn, state.phase]);

  // A secret learned only by you (a peek, a duel, a trade) plays as a personal,
  // animated card reveal — never as a text-only whisper. The server already
  // redacts privateInfo to the entitled player(s); we just dramatize it once.
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const piKey = state.privateInfo ? JSON.stringify(state.privateInfo) : null;
  const [reveal, setReveal] = useState(null);
  const revealKey = useRef(null);
  useEffect(() => {
    if (!piKey) { revealKey.current = null; return; }
    if (piKey === revealKey.current) return;   // same secret — don't re-trigger
    revealKey.current = piKey;
    setReveal(JSON.parse(piKey));
    const t = setTimeout(() => setReveal(null), reducedRef.current ? 3400 : 2400);
    return () => clearTimeout(t);
  }, [piKey]); // depend on the secret's identity only, so the timer isn't reset

  const validTargets = (rank) => {
    const others = opponents.filter((p) => !p.eliminated && !p.protected);
    return rank === 5 ? [me, ...others] : others;
  };

  const sel = selected ? META[selected] : null;
  const needsTarget = selected && [1, 2, 3, 5, 6].includes(selected) && validTargets(selected).length > 0;
  const fizzles = selected && [1, 2, 3, 6].includes(selected) && validTargets(selected).length === 0;
  const ready = selected && (!needsTarget || target) && (selected !== 1 || !needsTarget || guess);

  const submit = () => {
    if (!ready) return;
    send({ t: 'play', card: selected, target: needsTarget ? target : null, guess: selected === 1 ? guess : null });
  };

  return (
    <div className="salon-bg relative z-0 h-[100dvh] flex flex-col overflow-hidden">
      <header className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-rose/10">
        <div className="flex items-baseline gap-3">
          <span className="font-display font-bold text-2xl tracking-wide gilt-text">Sealed</span>
          <span className="font-body text-xs tracking-[0.32em] text-rose-faint">{code}</span>
        </div>
        <div className="flex items-center gap-2">
          <RulesButton />
          <button className="btn-ghost !py-1.5 !px-3 text-xs" onClick={() => send({ t: 'leave' })}>Leave</button>
        </div>
      </header>

      <main className="flex-1 min-h-0 w-full max-w-3xl mx-auto flex flex-col px-3 sm:px-5 py-2 gap-2">
        {/* status */}
        <Status state={state} me={me} myTurn={myTurn} />

        {/* hearts leaderboard */}
        <Leaderboard state={state} />

        {/* opponents */}
        <div className="shrink-0 flex justify-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar pb-1">
          {opponents.map((p) => (
            <OpponentSeat
              key={p.id} p={p} state={state}
              isTurn={state.turn === p.id && state.phase === 'play'}
              targetable={!!needsTarget && validTargets(selected).some((t) => t.id === p.id)}
              chosen={target === p.id}
              onPick={() => needsTarget && setTarget(p.id)}
            />
          ))}
        </div>

        {/* courier / delivery */}
        <div className="flex-1 min-h-0 grid place-items-center overflow-hidden">
          <Courier state={state} />
        </div>

        {/* your hand + composer */}
        <div className="shrink-0">
          <YourSide
            state={state} me={me} myTurn={myTurn}
            selected={selected} setSelected={setSelected}
            sel={sel} needsTarget={needsTarget} fizzles={fizzles}
            target={target} setTarget={setTarget}
            guess={guess} setGuess={setGuess} ready={ready} submit={submit}
            validTargets={validTargets}
          />
        </div>
      </main>

      <AnimatePresence>
        {state.phase === 'roundEnd' && <RoundEndCard key="re" state={state} send={send} />}
        {state.phase === 'over' && <GameOverCard key="go" state={state} send={send} />}
      </AnimatePresence>
      <AnimatePresence>
        {reveal && (
          <RevealOverlay key="reveal" info={reveal} players={state.players} you={you}
            reduced={reduced} onClose={() => setReveal(null)} />
        )}
      </AnimatePresence>
      <Toast error={error} />
    </div>
  );
}

function Status({ state, me, myTurn }) {
  const turnP = state.players.find((p) => p.id === state.turn);
  return (
    <div className="shrink-0 flex items-center justify-between gap-3 text-sm">
      <div className="min-w-0">
        {myTurn ? (
          <span className="font-display text-lg text-blush">Your move — draw is in hand.</span>
        ) : (
          <span className="text-rose-faint">
            <span className="inline-block w-2 h-2 rounded-full bg-gilt/70 mr-2 animate-pulse align-middle" />
            {turnP ? `${turnP.name} is composing a letter…` : 'The salon stirs…'}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0 text-rose-faint">
        <span className="flex items-center gap-1" title="Letters left in the courier’s satchel">
          <SatchelIcon /> <span className="font-body tabular-nums">{state.deckCount}</span>
        </span>
        <span className="hidden sm:inline text-cream-dim/70">Favors to win: <b className="text-gilt">{state.favorGoal}</b></span>
      </div>
    </div>
  );
}

function OpponentSeat({ p, state, isTurn, targetable, chosen, onPick }) {
  const reveal = (state.phase === 'roundEnd' || state.phase === 'over') && Array.isArray(p.hand) ? p.hand[0] : null;
  return (
    <motion.button
      type="button"
      onClick={onPick}
      disabled={!targetable}
      animate={chosen ? { scale: 1.04 } : { scale: 1 }}
      className={`relative shrink-0 w-[5.6rem] sm:w-24 rounded-2xl border px-2 py-2 flex flex-col items-center gap-1 transition
        ${isTurn ? 'border-gilt/60 bg-gilt/[0.07]' : 'border-rose/12 bg-plum-raised/50'}
        ${targetable ? 'cursor-pointer ring-1 ring-rose/50 hover:ring-gilt' : ''}
        ${p.eliminated ? 'opacity-45' : ''}`}
    >
      <div className="flex items-center gap-1 w-full">
        <span className="grid place-items-center w-5 h-5 rounded-full bg-rose/15 text-blush font-display text-[0.7rem] font-bold">
          {p.name[0]?.toUpperCase()}
        </span>
        <span className="truncate text-xs text-cream">{p.name}</span>
      </div>
      <Letter rank={reveal} faceUp={!!reveal} dead={p.eliminated} size="sm" />
      <div className="flex items-center justify-between w-full text-[0.6rem] text-rose-faint">
        <Favors n={p.tokens} goal={state.favorGoal} />
        <span title="letters discarded" className="tabular-nums">▰ {p.discards.length}</span>
      </div>
      <AnimatePresence>
        {p.protected && !p.eliminated && (
          <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 rounded-full bg-plum-soft border border-rose/40 text-[0.55rem] text-blush whitespace-nowrap">
            protected
          </motion.span>
        )}
      </AnimatePresence>
      {p.eliminated && (
        <span className="absolute inset-0 grid place-items-center font-display text-wax/80 text-xs uppercase tracking-widest">out</span>
      )}
      {!p.connected && !p.eliminated && (
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[0.5rem] text-cream-dim/60">away</span>
      )}
    </motion.button>
  );
}

function Favors({ n, goal }) {
  return (
    <span className="flex items-center gap-0.5 text-gilt" title={`${n} of ${goal} Favors`}>
      <SealMark className="w-2.5 h-2.5" />
      <span className="tabular-nums">{n}</span>
    </span>
  );
}

// A row of wax-seal hearts — one per Favor won. The `newCount` most-recently
// earned hearts land last, in wax red with a glow, so a just-awarded Favor is
// unmistakable as it animates onto the leaderboard.
function Hearts({ n, size = 'sm', newCount = 0 }) {
  const px = size === 'lg' ? 'w-4 h-4' : 'w-3 h-3';
  if (n <= 0) return <SealMark className={`${px} text-rose/25`} />;
  const firstFresh = n - Math.min(newCount, n);
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: n }).map((_, i) => {
        const fresh = i >= firstFresh;
        return (
          <motion.span key={i} className="inline-grid"
            initial={fresh ? { scale: 0, rotate: -35, y: -14 } : { scale: 0, rotate: -35 }}
            animate={{ scale: fresh ? [0, 1.45, 1] : 1, rotate: 0, y: 0 }}
            transition={fresh
              ? { duration: 0.6, times: [0, 0.6, 1], delay: 0.45 + (i - firstFresh) * 0.14 }
              : { type: 'spring', stiffness: 340, damping: 15, delay: i * 0.045 }}>
            <SealMark className={`${px} ${fresh ? 'text-wax drop-shadow-[0_0_6px_rgba(176,42,62,0.85)]' : 'text-gilt'}`} />
          </motion.span>
        );
      })}
    </span>
  );
}

// Compact in-play leaderboard: every player, ranked, with their Favor hearts.
function Leaderboard({ state }) {
  const players = [...state.players].sort((a, b) => (b.tokens || 0) - (a.tokens || 0));
  return (
    <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
      <span className="eyebrow !text-[0.5rem] shrink-0">Favors</span>
      {players.map((p) => (
        <div key={p.id}
          className={`shrink-0 flex items-center gap-1.5 rounded-full border pl-1.5 pr-2 py-0.5 ${p.id === state.you ? 'border-gilt/45 bg-gilt/[0.07]' : 'border-rose/15 bg-plum-raised/40'} ${p.eliminated ? 'opacity-55' : ''}`}>
          <span className="text-[0.72rem] text-cream max-w-[4.5rem] truncate">{p.name}</span>
          <Hearts n={p.tokens || 0} />
        </div>
      ))}
    </div>
  );
}

// A tiny color-coded chip for a discarded card — emblem + rank.
function DiscardPip({ rank }) {
  const c = META[rank];
  return (
    <span className="relative grid place-items-center w-5 h-5 rounded-md" title={`${c.name} (rank ${rank})`}
      style={{ background: `${c.color}1f`, color: c.color }}>
      <Emblem rank={rank} className="w-3.5 h-3.5" />
      <span className="absolute -bottom-1 -right-1 grid place-items-center w-3 h-3 rounded-full text-[0.45rem] font-bold text-plum-deep" style={{ background: c.color }}>{rank}</span>
    </span>
  );
}

// The prominent leaderboard shown on the round-over / game-over screens.
// `awardNew` animates the freshly-won Favor heart onto each winner's row.
function OverlayLeaderboard({ state, winners = [], awardNew = false, goalId = null }) {
  const players = [...state.players].sort((a, b) => (b.tokens || 0) - (a.tokens || 0));
  return (
    <div className="space-y-1.5 mb-5 text-left">
      {players.map((p) => {
        const won = winners.includes(p.id);
        const reachedGoal = p.id === goalId;
        return (
          <motion.div key={p.id}
            initial={won ? { borderColor: 'rgba(227,189,134,0.1)' } : false}
            animate={won ? { borderColor: 'rgba(227,189,134,0.55)' } : {}}
            transition={{ delay: 0.4, duration: 0.5 }}
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 ${won ? 'border-gilt/55 bg-gilt/[0.09]' : 'border-rose/12 bg-plum-deep/30'}`}>
            <span className="grid place-items-center w-6 h-6 rounded-full bg-rose/15 text-blush font-display text-xs font-bold">{p.name[0]?.toUpperCase()}</span>
            <span className="text-sm text-cream flex-1 truncate">{p.name}{p.id === state.you ? ' (you)' : ''}</span>
            {reachedGoal && <span className="eyebrow !text-[0.5rem] !tracking-[0.18em] text-gilt">{state.favorGoal} Favors</span>}
            {won && !reachedGoal && (
              <motion.span initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}
                className="eyebrow !text-[0.5rem] !tracking-[0.18em] text-gilt">+1</motion.span>
            )}
            <Hearts n={p.tokens || 0} size="lg" newCount={awardNew && won ? 1 : 0} />
          </motion.div>
        );
      })}
    </div>
  );
}

// The courier's satchel + the shared "what just happened" stage. Public plays
// resolve here with animated card reveals (a Guard knockout, a Prince discard,
// a Baron's loser falling, a King's swap). Secret outcomes go to RevealOverlay.
function Courier({ state }) {
  const reduced = useReducedMotion();
  const move = state.lastMove;
  const [delivery, setDelivery] = useState(null);
  const lastSeq = useRef(-1);

  useEffect(() => {
    if (!move) { setDelivery(null); return; }   // a new round clears the satchel
    if (state.seq !== lastSeq.current) {
      lastSeq.current = state.seq;
      setDelivery({ ...move, seq: state.seq });
    }
  }, [state.seq, move]);

  return (
    <div className="flex flex-col items-center gap-3 max-h-full">
      <div className="relative">
        <div className="letter-back w-12 h-16 sm:w-14 sm:h-20 rounded-xl border border-rose/25 -rotate-6" />
        <div className="letter-back w-12 h-16 sm:w-14 sm:h-20 rounded-xl border border-rose/25 absolute inset-0 rotate-3 -z-10" />
        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 eyebrow !text-[0.5rem] whitespace-nowrap">the courier</span>
      </div>

      <div className="min-h-[7rem] grid place-items-center w-full">
        <AnimatePresence mode="wait">
          {delivery ? (
            <Delivery key={delivery.seq} move={delivery} players={state.players} reduced={reduced} />
          ) : (
            <motion.p key="quiet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-rose-faint text-sm text-center max-w-xs">
              A hush over the salon. The first letter awaits.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Public outcome of a play, derived from the post-move snapshot (no secrets).
function outcomeOf(move, players) {
  if (move.fizzled) return null;
  const t = move.targetId ? players.find((p) => p.id === move.targetId) : null;
  const a = players.find((p) => p.id === move.actorId);
  const last = (p) => (p && p.discards && p.discards.length ? p.discards[p.discards.length - 1] : null);
  if (move.rank === 1 && t) return { kind: 'guard', card: move.guess, hit: !!(t.eliminated && last(t) === move.guess) };
  if (move.rank === 5 && t) return { kind: 'prince', card: last(t), eliminated: !!t.eliminated };
  if (move.rank === 3 && t) {
    const loser = a?.eliminated ? a : (t.eliminated ? t : null);
    return { kind: 'baron', loserId: loser?.id ?? null, loserCard: loser ? last(loser) : null };
  }
  if (move.rank === 6 && t) return { kind: 'king' };
  return null;
}

function Delivery({ move, players, reduced }) {
  const actor = players.find((p) => p.id === move.actorId);
  const targetP = move.targetId ? players.find((p) => p.id === move.targetId) : null;
  const out = outcomeOf(move, players);
  return (
    <motion.div initial={{ opacity: 0, y: 16, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }} className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-2">
        <PlayedStamp rank={move.rank} reduced={reduced} />
        {out && out.kind !== 'king' && <span className="text-rose-faint text-lg select-none" aria-hidden>→</span>}
        {out?.kind === 'guard' && (out.hit
          ? <OutcomeCard rank={out.card} mode="knockout" reduced={reduced} />
          : <MissMark reduced={reduced} />)}
        {out?.kind === 'prince' && out.card != null && <OutcomeCard rank={out.card} mode={out.eliminated ? 'knockout' : 'discard'} reduced={reduced} />}
        {out?.kind === 'baron' && out.loserCard != null && <OutcomeCard rank={out.loserCard} mode="knockout" reduced={reduced} />}
        {out?.kind === 'king' && <SwapMark reduced={reduced} />}
      </div>
      <p className="text-center text-sm max-w-[17rem] leading-snug" style={{ color: move.fizzled ? '#cdbfae' : '#f6eede' }}>
        {captionFor(move, actor, targetP, out)}
      </p>
    </motion.div>
  );
}

function captionFor(move, actor, targetP, out) {
  const who = actor?.name ?? 'Someone';
  const them = targetP?.name ?? 'a rival';
  const self = move.targetId === move.actorId;
  const c = META[move.rank];
  if (move.fizzled) return `${who} plays the ${c.name}, but every rival is shielded.`;
  switch (move.rank) {
    case 1: return out?.hit
      ? `${who} names the ${META[move.guess].name} — ${them} is out!`
      : `${who} guesses ${them} holds the ${META[move.guess].name}. A miss.`;
    case 2: return `${who} reads ${them}’s hand in secret.`;
    case 3: return out?.loserId
      ? `${who} duels ${them} — ${out.loserId === actor?.id ? who : them} holds the lesser and falls.`
      : `${who} duels ${them} — matched, both remain.`;
    case 4: return `${who} plays the Handmaid — untouchable until their next turn.`;
    case 5: return out?.eliminated
      ? `${who} forces ${self ? 'their own' : them + '’s'} Princess to be discarded — out!`
      : `${who} forces ${self ? 'themselves' : them} to discard the ${out?.card != null ? META[out.card].name : 'card'} and draw anew.`;
    case 6: return `${who} trades hands with ${them}.`;
    case 7: return `${who} discards the Countess.`;
    case 8: return `${who} discards the Princess — and is out.`;
    default: return `${who} plays the ${c.name}.`;
  }
}

// The played card with the wax seal stamping on then breaking.
function PlayedStamp({ rank, reduced }) {
  return (
    <div className="relative">
      <Letter rank={rank} faceUp size="sm" />
      {!reduced && (
        <motion.div className="absolute inset-0 grid place-items-center pointer-events-none"
          initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 0.6, duration: 0.3 }}>
          <motion.div initial={{ scale: 1.5, rotate: -12, opacity: 0 }} animate={{ scale: [1.5, 0.9, 1], rotate: 0, opacity: 1 }}
            transition={{ times: [0, 0.6, 1], duration: 0.4 }} className="grid place-items-center rounded-full bg-wax shadow-seal" style={{ width: 22, height: 22 }}>
            <SealMark className="w-3 h-3 text-blush" />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

// A revealed card that either shakes into a knockout (✕) or slides to the pile.
function OutcomeCard({ rank, mode, reduced }) {
  const knock = mode === 'knockout';
  const discard = mode === 'discard';
  const anim = reduced ? {}
    : knock ? { x: [0, -3, 3, -2, 2, 0] }
    : discard ? { y: [0, 2, 26], opacity: [1, 1, 0.2], rotate: [0, 0, 8] } : {};
  return (
    <div className="relative">
      <motion.div animate={anim} transition={{ delay: 1.0, duration: knock ? 0.5 : 0.7 }}>
        <Letter rank={rank} faceUp size="sm" delay={reduced ? 0 : 0.5} />
      </motion.div>
      {knock && <KnockX reduced={reduced} />}
    </div>
  );
}

function KnockX({ reduced }) {
  return (
    <motion.div className="absolute inset-0 grid place-items-center pointer-events-none"
      initial={reduced ? { opacity: 1 } : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: reduced ? 0 : 1.1, type: 'spring', stiffness: 300, damping: 14 }}>
      <span className="font-display text-2xl text-wax drop-shadow">✕</span>
    </motion.div>
  );
}

function MissMark({ reduced }) {
  return (
    <motion.div initial={reduced ? { opacity: 0.65 } : { opacity: 0, scale: 0.8 }} animate={{ opacity: 0.65, scale: 1 }}
      transition={{ delay: reduced ? 0 : 0.5 }}
      className="letter-back w-11 h-[4.3rem] rounded-2xl border border-rose/25 grid place-items-center">
      <span className="text-rose-faint text-xl">?</span>
    </motion.div>
  );
}

function SwapMark({ reduced }) {
  const A = reduced ? {} : { x: [0, 22, 22] };
  const B = reduced ? {} : { x: [0, -22, 22 * 0] };
  return (
    <div className="relative w-[3.8rem] h-[4.3rem]">
      <motion.div className="absolute left-0 top-0 letter-back w-9 h-[4.3rem] rounded-xl border border-rose/25"
        animate={A} transition={{ delay: 0.4, duration: 0.8, times: [0, 0.5, 1] }} />
      <motion.div className="absolute right-0 top-0 letter-back w-9 h-[4.3rem] rounded-xl border border-gilt/35"
        animate={B} transition={{ delay: 0.4, duration: 0.8, times: [0, 0.5, 1] }} />
    </div>
  );
}

function YourSide(props) {
  const {
    state, me, myTurn, selected, setSelected, sel, needsTarget, fizzles,
    target, setTarget, guess, setGuess, ready, submit, validTargets,
  } = props;
  if (!me) return null;
  const eliminated = me.eliminated;

  return (
    <div className="panel p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="grid place-items-center w-7 h-7 rounded-full bg-gilt/15 text-gilt font-display font-bold">{me.name[0]?.toUpperCase()}</span>
          <div className="leading-tight">
            <div className="text-sm text-cream">{me.name} <span className="text-rose-faint">(you)</span></div>
            <span className="flex items-center gap-1 text-gilt text-xs"><SealMark className="w-3 h-3" /><span className="tabular-nums">{me.tokens}</span> <span className="text-cream-dim/60">/ {state.favorGoal} Favors</span></span>
          </div>
        </div>
        {eliminated && <span className="font-display text-wax uppercase tracking-widest text-sm">Out this round</span>}
        {me.discards.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 text-rose-faint text-xs">
            <span className="eyebrow !text-[0.5rem]">discarded</span>
            {me.discards.slice(-4).map((r, i) => <DiscardPip key={i} rank={r} />)}
          </div>
        )}
      </div>

      {/* A compact, icon-based memo of what only you know — the dramatic reveal
          plays as a RevealOverlay; this keeps the knowledge at a glance after. */}
      {state.privateInfo && <PrivateMemo info={state.privateInfo} players={state.players} />}

      {/* Hand */}
      <div className="flex items-end justify-center gap-3 sm:gap-4">
        {(me.hand || []).map((rank, i) => (
          <Letter
            key={`${rank}-${i}`} rank={rank} faceUp size="lg"
            selectable={myTurn && !forcedAway(me.hand, rank)}
            selected={selected === rank}
            onClick={() => { setSelected(rank); setTarget(null); setGuess(null); }}
            delay={i * 0.06}
          />
        ))}
        {(!me.hand || me.hand.length === 0) && (
          <div className="h-44 grid place-items-center text-rose-faint text-sm">Your letter has left your hands.</div>
        )}
      </div>

      {/* Composer */}
      <div className="mt-3 min-h-[3.2rem]">
        {!myTurn && !eliminated && (
          <p className="text-center text-rose-faint text-sm">Hold tight — your turn will come.</p>
        )}
        {eliminated && state.phase !== 'over' && (
          <p className="text-center text-rose-faint text-sm">You’re out of this round. Watch the intrigue unfold.</p>
        )}
        {myTurn && (
          <AnimatePresence mode="wait">
            {!selected ? (
              <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-center text-rose-faint text-sm">
                {state.mustPlayCountess ? 'The Countess insists — she must be the one you discard.' : 'Choose a letter to play.'}
              </motion.p>
            ) : (
              <motion.div key="compose" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-2">
                <p className="text-center text-sm text-cream">{fizzles ? `Every rival is shielded — ${sel.name} will have no effect.` : sel.prompt}</p>

                {needsTarget && (
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {validTargets(selected).map((t) => (
                      <button key={t.id} onClick={() => setTarget(t.id)}
                        className={`px-3 py-1 rounded-full text-xs border transition ${target === t.id ? 'bg-gilt text-plum-deep border-gilt' : 'border-rose/30 text-cream hover:border-gilt/60'}`}>
                        {t.id === me.id ? 'Yourself' : t.name}
                      </button>
                    ))}
                  </div>
                )}

                {selected === 1 && needsTarget && (
                  <div className="w-full">
                    <p className="text-center eyebrow !text-[0.5rem] mb-1">Guess their card</p>
                    <div className="flex justify-start sm:justify-center gap-1.5 overflow-x-auto no-scrollbar px-1 pb-1">
                      {RANKS.filter((r) => r !== 1).map((r) => {
                        const c = META[r];
                        const on = guess === r;
                        return (
                          <button key={r} onClick={() => setGuess(r)} title={`${c.name} (rank ${r})`}
                            className="shrink-0 w-14 rounded-xl border px-1 py-1.5 flex flex-col items-center gap-0.5 transition"
                            style={{
                              borderColor: on ? c.color : 'rgba(226,154,178,0.25)',
                              background: on ? `${c.color}22` : 'transparent',
                              boxShadow: on ? `0 0 0 1px ${c.color}` : undefined,
                            }}>
                            <span className="relative grid place-items-center" style={{ color: c.color }}>
                              <Emblem rank={r} className="w-6 h-6" />
                              <span className="absolute -top-1.5 -right-2 grid place-items-center w-3.5 h-3.5 rounded-full text-[0.5rem] font-bold text-plum-deep" style={{ background: c.color }}>{r}</span>
                            </span>
                            <span className="text-[0.55rem] leading-none text-cream">{c.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button onClick={() => { props.setSelected(null); setTarget(null); setGuess(null); }}
                    className="btn-ghost text-xs !py-1.5">Back</button>
                  <button onClick={submit} disabled={!ready}
                    className="btn-gilt text-sm disabled:opacity-40">
                    Seal &amp; send
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );

  // When the Countess is forced, the other letter cannot be selected.
  function forcedAway(hand, rank) {
    if (!state.mustPlayCountess) return false;
    return rank !== 7;
  }
}

// A compact, icon-led reminder of what only you know (after the big reveal).
function PrivateMemo({ info, players }) {
  const other = players.find((p) => p.id === info.targetId);
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="mb-2 mx-auto max-w-md rounded-xl border border-rose/25 bg-rose/[0.07] px-3 py-1.5 flex items-center justify-center gap-2 text-xs text-cream">
      <span className="eyebrow !text-[0.5rem]">you know</span>
      {info.type === 'peek' && <>
        <DiscardPip rank={info.card} />
        <span>{other?.name} holds the <b style={{ color: META[info.card].color }}>{META[info.card].name}</b></span>
      </>}
      {info.type === 'duel' && <>
        <DiscardPip rank={info.yours} /><span className="text-rose-faint">vs</span><DiscardPip rank={info.theirs} />
        <span>your duel with {other?.name}</span>
      </>}
      {info.type === 'swap' && <>
        <DiscardPip rank={info.card} />
        <span>you hold the <b style={{ color: META[info.card].color }}>{META[info.card].name}</b> from {other?.name}</span>
      </>}
    </motion.div>
  );
}

// A personal, animated card reveal — only the entitled viewer ever renders this
// (the server redacts privateInfo). Replaces the old text-only "whisper".
function RevealOverlay({ info, players, you, reduced, onClose }) {
  const other = players.find((p) => p.id === info.targetId);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} role="dialog" aria-label="A secret revealed to you"
      className="fixed inset-0 z-[55] grid place-items-center bg-plum-deep/80 backdrop-blur-md px-6">
      <motion.div initial={{ scale: 0.92, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()} className="text-center">
        <p className="eyebrow mb-3">For your eyes only</p>
        {info.type === 'peek' && <PeekReveal card={info.card} other={other} reduced={reduced} />}
        {info.type === 'duel' && <DuelReveal info={info} other={other} reduced={reduced} />}
        {info.type === 'swap' && <SwapReveal card={info.card} other={other} reduced={reduced} />}
        <button onClick={onClose} className="mt-5 btn-ghost text-xs">Got it</button>
      </motion.div>
    </motion.div>
  );
}

// A soft halo in the card's hue, drawn after the card flips up.
function Glow({ color, children }) {
  return (
    <motion.div className="rounded-2xl inline-block"
      initial={{ boxShadow: `0 0 0px ${color}00` }} animate={{ boxShadow: `0 0 38px -6px ${color}cc` }}
      transition={{ delay: 0.55, duration: 0.6 }}>
      {children}
    </motion.div>
  );
}

function PeekReveal({ card, other, reduced }) {
  const c = META[card];
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-cream text-lg font-display">You glance at {other?.name}’s hand…</p>
      <Glow color={c.color}><Letter rank={card} faceUp size="lg" delay={reduced ? 0 : 0.15} /></Glow>
      <p className="text-cream/85 text-sm">It is the <b style={{ color: c.color }}>{c.name}</b> <span className="text-rose-faint">(rank {card})</span>.</p>
    </div>
  );
}

function DuelReveal({ info, other, reduced }) {
  const youWin = info.yours > info.theirs;
  const theyWin = info.theirs > info.yours;
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-cream text-lg font-display">Your duel with {other?.name}</p>
      <div className="flex items-end gap-4">
        <DuelSide rank={info.yours} label="You" win={youWin} lose={theyWin} reduced={reduced} />
        <span className="font-display text-rose-faint text-xl pb-8">vs</span>
        <DuelSide rank={info.theirs} label={other?.name} win={theyWin} lose={youWin} reduced={reduced} />
      </div>
      <p className="text-cream/85 text-sm max-w-[18rem]">
        {youWin ? <>Your <b>{META[info.yours].name}</b> beats the <b>{META[info.theirs].name}</b> — {other?.name} falls.</>
          : theyWin ? <>Their <b>{META[info.theirs].name}</b> beats your <b>{META[info.yours].name}</b> — you fall.</>
          : 'Matched hearts — both of you remain.'}
      </p>
    </div>
  );
}

function DuelSide({ rank, label, win, lose, reduced }) {
  const c = META[rank];
  const anim = reduced ? {}
    : win ? { scale: [1, 1.08, 1] }
    : lose ? { y: [0, 4, 16], opacity: [1, 1, 0.4], rotate: [0, 0, 6] } : {};
  return (
    <div className="flex flex-col items-center gap-1">
      <motion.div className="relative" animate={anim} transition={{ delay: 1.0, duration: win ? 0.6 : 0.7 }}>
        <Glow color={win ? '#e3bd86' : c.color}><Letter rank={rank} faceUp size="md" delay={reduced ? 0 : 0.15} /></Glow>
        {lose && <KnockX reduced={reduced} />}
      </motion.div>
      <span className={`text-[0.7rem] truncate max-w-[5.5rem] ${win ? 'text-gilt' : 'text-rose-faint'}`}>{label}{win ? ' · wins' : ''}</span>
    </div>
  );
}

function SwapReveal({ card, other, reduced }) {
  const c = META[card];
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-cream text-lg font-display">You trade hands with {other?.name}</p>
      <Glow color={c.color}><Letter rank={card} faceUp size="lg" delay={reduced ? 0 : 0.2} /></Glow>
      <p className="text-cream/85 text-sm">You now hold the <b style={{ color: c.color }}>{c.name}</b>.</p>
    </div>
  );
}

function RoundEndCard({ state, send }) {
  const rr = state.roundResult || {};
  const winnerIds = rr.winners || [];
  const winners = winnerIds.map((id) => state.players.find((p) => p.id === id)).filter(Boolean);
  const iWon = winnerIds.includes(state.you);
  const reason = rr.reason;

  // The face-up showdown: survivors first (winners leading), then the fallen,
  // each revealing the letter they were caught holding.
  const nameOf = (id) => state.players.find((p) => p.id === id)?.name ?? '';
  const survivors = (rr.hands || [])
    .map((h) => ({ id: h.id, card: h.card, name: nameOf(h.id), won: winnerIds.includes(h.id), out: false }))
    .sort((a, b) => (b.won ? 1 : 0) - (a.won ? 1 : 0));
  const fallen = (rr.fallen || []).map((h) => ({ id: h.id, card: h.card, name: nameOf(h.id), won: false, out: true }));
  const reveal = [...survivors, ...fallen];

  return (
    <Overlay>
      <motion.div initial={{ scale: 0.9, y: 12 }} animate={{ scale: 1, y: 0 }} className="panel p-6 sm:p-7 text-center max-w-md w-full max-h-[90vh] overflow-y-auto no-scrollbar">
        <FlourishSeal />
        <p className="eyebrow mt-3 mb-1">{reason === 'last' ? 'The last letter standing' : 'The satchel runs dry'}</p>
        <h2 className="font-display text-3xl font-bold rose-text mb-2">
          {winners.length === 1 ? `${winners[0].name} wins the round` : winners.length ? `${winners.map((w) => w.name).join(' & ')} share it` : 'No victor this round'}
        </h2>
        {/* The server's plain, authoritative sentence — the WHY. */}
        {rr.reasonText && (
          <p className="text-cream/85 text-sm mb-1.5 max-w-sm mx-auto leading-snug">{rr.reasonText}</p>
        )}
        <p className="text-gilt text-xs mb-4 flex items-center justify-center gap-1.5">
          <SealMark className="w-3 h-3" />
          {iWon ? 'A Favor is yours — the courtship continues.'
            : winners.length ? `A Favor goes to ${winners.map((w) => w.name).join(' & ')}.` : 'No Favor is awarded.'}
        </p>

        <Showdown reveal={reveal} />

        <OverlayLeaderboard state={state} winners={winnerIds} awardNew />
        {state.isHost ? (
          <button className="btn-gilt w-full" onClick={() => send({ t: 'next' })}>Deal the next round</button>
        ) : (
          <p className="text-sm text-rose-faint">Waiting for the host to deal again…</p>
        )}
      </motion.div>
    </Overlay>
  );
}

// The end-of-round reveal: every relevant hand turned face-up. Winners wear a
// gilt ring; the fallen are greyed with the letter that undid them (Letter's own
// ✕). Cards flip in one after another for a readable reveal.
function Showdown({ reveal }) {
  if (!reveal.length) return null;
  return (
    <div className="flex flex-wrap justify-center gap-2.5 mb-5">
      {reveal.map((h, i) => (
        <motion.div key={h.id} initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: i * 0.12, type: 'spring', stiffness: 240, damping: 22 }}
          className="flex flex-col items-center gap-1">
          <div className={`rounded-2xl ${h.won ? 'ring-2 ring-gilt/80 shadow-[0_0_18px_-2px_rgba(227,189,134,0.6)]' : ''}`}>
            <Letter rank={h.card} faceUp={h.card != null} dead={h.out} size="sm" delay={i * 0.1} />
          </div>
          <span className={`text-[0.62rem] truncate max-w-[4.4rem] ${h.won ? 'text-gilt' : 'text-rose-faint'}`}>{h.name}</span>
          <span className={`eyebrow !text-[0.42rem] !tracking-[0.16em] ${h.won ? 'text-gilt' : h.out ? 'text-wax/80' : 'text-cream-dim/60'}`}>
            {h.won ? '♥ won' : h.out ? 'out' : 'stood'}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function GameOverCard({ state, send }) {
  const winner = state.players.find((p) => p.id === state.gameWinnerId);
  const iWon = state.gameWinnerId === state.you;
  return (
    <Overlay>
      <motion.div initial={{ scale: 0.9, y: 12 }} animate={{ scale: 1, y: 0 }} className="panel p-7 sm:p-8 text-center max-w-sm w-full max-h-[90vh] overflow-y-auto no-scrollbar">
        <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 12 }}
          className="mx-auto grid place-items-center w-16 h-16 rounded-full bg-wax shadow-seal mb-3">
          <SealMark className="w-9 h-9 text-blush" />
        </motion.div>
        <p className="eyebrow mb-2">{iWon ? 'Every Favor courted' : 'The soirée ends'}</p>
        <h2 className="font-display text-4xl font-bold gilt-text mb-2">{winner ? winner.name : 'No one'} wins the soirée</h2>
        <p className="text-cream/85 text-sm mb-1 max-w-sm mx-auto leading-snug">
          {winner
            ? `${iWon ? 'You were' : `${winner.name} was`} first to reach ${state.favorGoal} Favors${winner ? ` — ${winner.tokens} in all.` : '.'}`
            : 'The salon empties with no clear victor.'}
        </p>
        <p className="text-gilt text-xs mb-5">{iWon ? 'The whole salon swoons. The season is yours.' : 'A toast to the season’s sweetheart.'}</p>
        <OverlayLeaderboard state={state} winners={state.gameWinnerId ? [state.gameWinnerId] : []} goalId={state.gameWinnerId} />
        {state.isHost ? (
          <button className="btn-gilt w-full" onClick={() => send({ t: 'restart' })}>Back to the parlor</button>
        ) : (
          <p className="text-sm text-rose-faint">Waiting for the host to return to the parlor…</p>
        )}
      </motion.div>
    </Overlay>
  );
}

function FlourishSeal() {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 12 }}
      className="mx-auto grid place-items-center w-14 h-14 rounded-full bg-wax shadow-seal">
      <SealMark className="w-8 h-8 text-blush" />
    </motion.div>
  );
}

function Overlay({ children }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-plum-deep/85 backdrop-blur-md px-5">
      {children}
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] rounded-full border border-wax/50 bg-plum-raised px-4 py-2.5 text-sm text-cream shadow-lg">
          {show.message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SatchelIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 9 h14 l-1 10 a1 1 0 0 1 -1 1 H7 a1 1 0 0 1 -1 -1 Z" />
      <path d="M8 9 a4 4 0 0 1 8 0" /><path d="M9 13 h6" />
    </svg>
  );
}
