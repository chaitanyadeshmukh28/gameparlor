// Blackjack table — the whole hand on one no-scroll screen. The House sits under
// a brass "21" medallion up top; the seats fan below; a phase-aware dock is
// pinned to the bottom. Every number is tabular mono (the count), and a
// per-turn clock keeps play moving.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, DealtCard, HoleCard, Chip, ChipStack, DecoMedallion, TimerRing } from '../cards.jsx';
import { RulesButton } from './RulesSheet.jsx';
import { MuteButton } from './MuteButton.jsx';
import { sfx } from '../sfx.js';

const BET_CHIPS = [10, 25, 50, 100];

export default function Table({ state, you, code, send, error }) {
  const me = state.players.find((p) => p.id === you) || null;
  useSounds(state, you);
  const clock = useTurnClock(state, you);
  const isOver = state.phase === 'over';

  return (
    <div className="lacquer-bg relative z-0 h-[100dvh] flex flex-col overflow-hidden">
      <TopBar state={state} me={me} code={code} send={send} />
      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        {/* House up top, seats down by the dock — the empty middle reads as the
            table's betting space (like real felt), never as dead layout. */}
        <div className="min-h-full flex flex-col justify-between gap-3 px-3 pt-1 pb-3">
          <Dealer state={state} />
          <Seats state={state} you={you} clock={clock} />
        </div>
      </main>
      <Dock state={state} me={me} you={you} send={send} error={error} clock={clock} />
      <AnimatePresence>{isOver && <GameOver state={state} send={send} />}</AnimatePresence>
    </div>
  );
}

// ---- sound + clock hooks ---------------------------------------------------
function useSounds(state, you) {
  const prev = useRef({});
  useEffect(() => {
    const me = state.players.find((p) => p.id === you);
    const cards = state.players.reduce((n, p) => n + (p.hand?.length || 0), 0) + (state.dealer?.hand?.length || 0);
    const revealed = state.dealer?.value != null;
    const p = prev.current;
    if (p.cards != null && cards > p.cards) sfx.deal();
    if (revealed && p.revealed === false) sfx.flip();
    if (state.phase === 'player' && state.turn === you && p.turn !== you && me && !me.done) sfx.turn();
    if (state.phase === 'roundEnd' && p.phase !== 'roundEnd' && me && me.result) {
      if (me.result === 'blackjack') sfx.blackjack();
      else if (me.result === 'win') sfx.win();
      else if (me.result === 'bust') sfx.bust();
      else if (me.result === 'lose') sfx.lose();
    }
    prev.current = { cards, revealed, turn: state.turn, phase: state.phase };
  }, [state, you]);
}

// Local smooth countdown synced to the server's turnEndsInMs on every message.
function useTurnClock(state, you) {
  const endAt = useRef(null);
  const total = (state.turnSeconds || 0) * 1000;
  const [, force] = useState(0);
  const lastTick = useRef(-1);

  useEffect(() => {
    if (state.turnEndsInMs == null) { endAt.current = null; return; }
    endAt.current = Date.now() + state.turnEndsInMs;
  }, [state.turnEndsInMs, state.turn, state.phase, state.roundNo]);

  useEffect(() => {
    if (state.turnEndsInMs == null) return;
    const id = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [state.turnEndsInMs == null, state.turn, state.phase]);

  if (endAt.current == null || total <= 0) return { active: false };
  const msLeft = Math.max(0, endAt.current - Date.now());
  const seconds = Math.ceil(msLeft / 1000);
  const frac = msLeft / total;
  const urgent = seconds <= 5;

  // Tick in the final five seconds when it's my move / my bet.
  const me = state.players.find((p) => p.id === you);
  const mine = (state.phase === 'player' && state.turn === you && me && !me.done)
    || (state.phase === 'betting' && me && !me.hasBet && !me.out);
  if (mine && urgent && seconds !== lastTick.current && seconds > 0) { lastTick.current = seconds; sfx.tick(); }

  return { active: true, frac, seconds, urgent };
}

// ---- header ----------------------------------------------------------------
function TopBar({ state, me, code, send }) {
  const goal = state.config?.goal ?? 1500;
  const pct = me ? Math.min(100, Math.round((me.chips / goal) * 100)) : 0;
  return (
    <header className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-brass/15">
      <div className="leading-none">
        <div className="font-display text-xl brass-text">Blackjack</div>
        <div className="text-[0.56rem] text-sand tracking-[0.18em] uppercase font-data">{code} · Hand {state.roundNo}</div>
      </div>
      {me && (
        <div className="ml-auto flex items-center gap-2 min-w-0">
          <div className="text-right leading-none">
            <div className="font-data font-bold text-brass text-lg tnum">{me.chips}</div>
            <div className="text-[0.5rem] text-sand uppercase tracking-widest">chips → {goal}</div>
          </div>
          <div className="w-14 h-1.5 rounded-full bg-obsidian-deep overflow-hidden border border-brass/20">
            <div className="h-full bg-brass/80" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      <MuteButton />
      <div className="hidden sm:block"><RulesButton label="Rules" /></div>
      {state.isHost && (
        <button onClick={() => send({ t: 'restart' })}
          className="text-[0.56rem] text-sand hover:text-vermillion uppercase tracking-widest transition" title="Return everyone to the lobby">Lobby</button>
      )}
    </header>
  );
}

// ---- the House -------------------------------------------------------------
function Dealer({ state }) {
  const d = state.dealer || { hand: [] };
  const revealed = d.value != null;
  return (
    <section className="relative shrink-0 pt-4 pb-5 grid place-items-center">
      <motion.div className="absolute -top-2 text-brass/25"
        animate={{ color: revealed ? 'rgba(206,43,55,0.30)' : 'rgba(217,178,106,0.22)', scale: revealed ? 1.04 : 1 }}
        transition={{ duration: 0.5 }}>
        <DecoMedallion className="w-44 h-44" glow={revealed} />
      </motion.div>
      <div className="relative flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 h-5">
          <span className="eyebrow">The House</span>
          {revealed && (
            <span className={`font-data font-bold text-sm tnum ${d.value.bust ? 'text-vermillion' : 'text-bone'}`}>
              {d.value.bust ? `${d.value.total} · bust` : d.value.blackjack ? 'blackjack' : d.value.total}
            </span>
          )}
        </div>
        <div className="flex gap-1.5 min-h-[74px] items-start">
          {d.hand.length === 0 && <span className="text-sand/50 text-sm italic self-center">waiting for bets…</span>}
          {d.hand.map((c, i) => (
            i === 1
              ? <HoleCard key="hole" card={revealed ? c : null} size="md" delay={0.12} />
              : <DealtCard key={i} card={c} faceDown={!c} size="md" delay={i * 0.12} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- seats -----------------------------------------------------------------
function Seats({ state, you, clock }) {
  const seats = state.players;
  const cols = seats.length <= 2 ? seats.length : seats.length <= 4 ? 2 : 3;
  return (
    <section className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {seats.map((p) => <Seat key={p.id} p={p} me={p.id === you} phase={state.phase} clock={clock} />)}
    </section>
  );
}

function Seat({ p, me, phase, clock }) {
  const v = p.value;
  const acting = p.isTurn && phase === 'player';
  const betting = phase === 'betting' && !p.hasBet && !p.out;
  const showRing = clock?.active && (acting || betting);
  const spectating = p.out || (p.sitOut && p.hasBet);
  return (
    <motion.div layout
      className={`relative rounded-xl border px-2.5 py-2 flex flex-col gap-1.5 transition
        ${acting ? 'border-brass bg-walnut-raised/70 shadow-rail' : 'border-brass/15 bg-walnut/50'}
        ${spectating ? 'opacity-45' : ''}`}>
      <div className="flex items-center gap-1.5 min-w-0">
        {showRing
          ? <TimerRing frac={clock.frac} seconds={clock.seconds} urgent={clock.urgent} size={26} />
          : <span className="grid place-items-center w-6 h-6 rounded-full bg-brass/12 text-brass text-[0.65rem] font-display shrink-0">{p.name[0]?.toUpperCase()}</span>}
        <span className="truncate font-body text-sm text-bone">{p.name}{me && <span className="text-sand"> (you)</span>}</span>
        {p.isBot && <span className="text-[0.4rem] uppercase tracking-wider text-brass/80 border border-brass/30 rounded px-1 leading-tight">AI</span>}
        {!p.connected && !p.isBot && <span className="text-[0.5rem] text-vermillion/80">off</span>}
        <span className="ml-auto flex items-center gap-1 text-brass font-data font-bold text-xs tnum">
          <Chip value={p.chips} size={15} />{p.chips}
        </span>
      </div>

      <div className="flex items-end gap-2 min-h-[58px]">
        <div className="flex gap-1 items-end">
          {(!p.hand || p.hand.length === 0)
            ? <span className="text-sand/50 text-xs italic self-center">{spectating ? 'sitting out' : phase === 'betting' ? (p.hasBet ? 'bet in' : 'betting…') : '—'}</span>
            : p.hand.map((c, i) => <DealtCard key={i} card={c} size="sm" delay={i * 0.07} dim={p.busted} />)}
        </div>
        {v && (
          <span className={`ml-auto font-data font-bold text-sm leading-none tnum ${v.bust ? 'text-vermillion' : v.blackjack ? 'text-brass' : 'text-bone'}`}>
            {v.bust ? 'BUST' : v.blackjack ? '21' : (v.soft ? `${v.total - 10}/${v.total}` : v.total)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 h-5">
        {p.bet > 0 && phase !== 'roundEnd' && phase !== 'over' && (
          <span className="flex items-center gap-1 text-[0.6rem] text-sand">
            <ChipStack amount={p.bet} size={16} /> <b className="text-brass font-data tnum">{p.bet}</b>{p.doubled && <span className="text-vermillion">×2</span>}
          </span>
        )}
        {acting && !showRing && <span className="text-[0.55rem] uppercase tracking-widest text-brass pulse-brass">acting…</span>}
        {p.result && <ResultBadge result={p.result} delta={p.delta} />}
      </div>
    </motion.div>
  );
}

function ResultBadge({ result, delta }) {
  const map = {
    blackjack: ['Blackjack', 'text-obsidian bg-brass'],
    win: ['Win', 'text-obsidian bg-brass/90'],
    push: ['Push', 'text-bone bg-sand/30'],
    lose: ['Lost', 'text-bone bg-vermillion/70'],
    bust: ['Bust', 'text-bone bg-vermillion/70'],
  };
  const [label, cls] = map[result] || ['', ''];
  return (
    <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16 }}
      className={`text-[0.55rem] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 font-data ${cls}`}>
      {label} {delta > 0 ? `+${delta}` : delta < 0 ? delta : ''}
    </motion.span>
  );
}

// ---- action dock -----------------------------------------------------------
function Dock({ state, me, you, send, error, clock }) {
  return (
    <footer className="shrink-0 border-t border-brass/20 bg-walnut/85 backdrop-blur px-3 py-3 min-h-[5.5rem] flex flex-col justify-center">
      <ErrorNote error={error} />
      {state.phase === 'betting' && <BetDock key={state.roundNo} me={me} send={send} config={state.config} clock={clock} />}
      {state.phase === 'player' && <PlayDock state={state} me={me} you={you} send={send} clock={clock} />}
      {(state.phase === 'dealer' || state.phase === 'roundEnd') && <RoundEndDock state={state} me={me} send={send} />}
    </footer>
  );
}

function ErrorNote({ error }) {
  const [show, setShow] = useState(null);
  useEffect(() => {
    if (!error) return;
    setShow(error.message);
    const t = setTimeout(() => setShow(null), 2600);
    return () => clearTimeout(t);
  }, [error?.at]);
  return (
    <AnimatePresence>
      {show && (
        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="text-center text-xs text-vermillion mb-1.5">{show}</motion.p>
      )}
    </AnimatePresence>
  );
}

function BetDock({ me, send, config, clock }) {
  const [bet, setBet] = useState(0);
  const placed = useRef(false);
  const min = config?.minBet ?? 10;
  const floor = me ? Math.min(min, me.chips) : min;
  const canPlace = !!me && bet >= floor && bet <= me.chips && bet > 0;

  // If the betting clock is about to run out and you've stacked a stake but not
  // pressed Place, place it for you — so slow hands aren't silently folded.
  useEffect(() => {
    if (!me || me.hasBet || me.out) return;
    if (clock?.active && clock.seconds <= 1 && canPlace && !placed.current) {
      placed.current = true;
      send({ t: 'bet', amount: bet });
    }
  }, [clock?.seconds]);

  if (!me) return null;
  if (me.out) return <p className="text-center text-sm text-sand">You’re out of chips — spectating this hand.</p>;
  if (me.hasBet) {
    return (
      <p className="text-center text-sm text-sand">
        {me.sitOut ? 'Sitting this hand out.' : <>Bet <b className="text-brass font-data tnum">{me.bet}</b> is in — waiting for the table…</>}
      </p>
    );
  }
  const add = (n) => { setBet((b) => Math.min(me.chips, b + n)); sfx.chip(); };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-3">
        {bet > 0 && <ChipStack amount={bet} size={22} />}
        <div className="text-center leading-none">
          <div className="eyebrow mb-0.5">your bet</div>
          <div className="font-data font-bold text-3xl brass-text tnum min-w-[2ch]">{bet}</div>
        </div>
        {clock?.active && <TimerRing frac={clock.frac} seconds={clock.seconds} urgent={clock.urgent} size={30} />}
      </div>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {BET_CHIPS.filter((c) => c <= me.chips).map((c) => (
          <button key={c} onClick={() => add(c)} className="active:scale-90 transition" aria-label={`Add ${c}`}>
            <Chip value={c} size={42} />
          </button>
        ))}
        <button onClick={() => { setBet(me.chips); sfx.chip(); }} className="btn-ghost !px-3 !py-2 text-xs">All&nbsp;in</button>
        {bet > 0 && <button onClick={() => setBet(0)} className="btn-ghost !px-3 !py-2 text-xs">Reset</button>}
      </div>
      <div className="flex gap-2">
        <button className="btn-ghost flex-1 !py-2.5 text-sm" onClick={() => send({ t: 'sitout' })}>Sit out</button>
        <button className="btn-brass flex-[2] !py-2.5" disabled={!canPlace} onClick={() => send({ t: 'bet', amount: bet })}>
          {bet > 0 ? `Place ${bet}` : 'Place bet'}
        </button>
      </div>
      {!canPlace && <p className="text-center text-[0.6rem] text-sand/70">Tap chips to wager — table minimum {floor}. {clock?.active && 'Your stake auto-places when the clock runs out.'}</p>}
    </div>
  );
}

function PlayDock({ state, me, you, send, clock }) {
  const myTurn = state.turn === you && me && !me.done;
  if (!myTurn) {
    const who = state.players.find((p) => p.id === state.turn);
    return <p className="text-center text-sm text-sand">{who ? <>Waiting on <b className="text-bone">{who.name}</b>…</> : 'Dealing…'}</p>;
  }
  const canDouble = me.hand?.length === 2 && me.chips >= me.bet * 2;
  return (
    <div className="space-y-2">
      {clock?.active && (
        <div className="h-1 rounded-full bg-obsidian-deep overflow-hidden">
          <div className={`h-full ${clock.urgent ? 'bg-vermillion' : 'bg-brass'}`} style={{ width: `${clock.frac * 100}%`, transition: 'width 0.25s linear' }} />
        </div>
      )}
      <div className="flex gap-2">
        <button className="btn-act flex-1 border-brass/50 text-bone bg-bone/5 hover:bg-bone/10" onClick={() => send({ t: 'hit' })}>Hit</button>
        <button className="btn-act flex-1 border-brass/60 text-brass bg-brass/10 hover:bg-brass/20" onClick={() => send({ t: 'stand' })}>Stand</button>
        <button className="btn-act flex-1 border-vermillion/60 text-vermillion bg-vermillion/10 hover:bg-vermillion/20 disabled:opacity-30"
          disabled={!canDouble} onClick={() => send({ t: 'double' })}
          title={canDouble ? 'Double your bet, take one card' : 'Only on your first two cards, chips permitting'}>
          Double
        </button>
      </div>
    </div>
  );
}

function RoundEndDock({ state, me, send }) {
  const r = state.roundResult;
  return (
    <div className="space-y-2">
      {r?.text && <p className="text-center text-sm text-bone/90">{r.text}</p>}
      {me && me.result && !me.out && (
        <p className="text-center text-xs text-sand">
          You {me.delta > 0 ? <span className="text-brass font-bold font-data">won {me.delta}</span> : me.delta < 0 ? <span className="text-vermillion font-bold font-data">lost {-me.delta}</span> : <span className="text-bone">pushed</span>} · now <span className="font-data tnum">{me.chips}</span> chips
        </p>
      )}
      {state.isHost
        ? <button className="btn-brass w-full" onClick={() => send({ t: 'next' })}>Deal next hand</button>
        : <p className="text-center text-xs text-sand">Waiting for the host to deal the next hand…</p>}
    </div>
  );
}

function GameOver({ state, send }) {
  const winner = state.players.find((p) => p.id === state.gameWinnerId);
  const ranked = [...state.players].sort((a, b) => b.chips - a.chips);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 grid place-items-center p-5 bg-black/78 backdrop-blur-sm overflow-y-auto no-scrollbar">
      <motion.div initial={{ scale: 0.9, y: 16 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 20 }}
        className="panel my-auto w-full max-w-sm p-6 text-center space-y-4">
        <div className="text-brass/40 flex justify-center"><DecoMedallion className="w-28 h-28" /></div>
        <p className="eyebrow">the night is settled</p>
        <h2 className="font-display text-4xl brass-text leading-none">
          {winner ? `${winner.name} wins` : 'House wins'}
        </h2>
        <p className="text-sm text-sand">
          {winner ? <>Walked with <span className="font-data text-brass tnum">{winner.chips}</span> chips.</> : 'The table was cleaned out.'}
        </p>
        <ul className="space-y-1 text-left">
          {ranked.map((p, i) => (
            <li key={p.id} className="flex items-center gap-2 rounded-lg bg-obsidian-deep/60 px-3 py-1.5">
              <span className="w-5 text-center text-sand font-data font-bold">{i + 1}</span>
              <span className="text-bone truncate">{p.name}</span>
              {p.id === state.gameWinnerId && <span className="text-brass">♛</span>}
              <span className="ml-auto font-data font-bold text-brass tnum">{p.chips}</span>
            </li>
          ))}
        </ul>
        {state.isHost
          ? <button className="btn-brass w-full" onClick={() => send({ t: 'restart' })}>Play again</button>
          : <p className="text-xs text-sand">Waiting for the host to start a new night…</p>}
      </motion.div>
    </motion.div>
  );
}
