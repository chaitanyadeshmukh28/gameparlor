// Blackjack table — the whole round on one no-scroll screen: dealer up top, the
// seats below, and a phase-aware action dock pinned to the bottom.
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, DealtCard, Chip, DecoFan } from '../cards.jsx';
import { RulesButton } from './RulesSheet.jsx';

const CHIPS = [10, 25, 50, 100];

export default function Table({ state, you, code, send, error }) {
  const me = state.players.find((p) => p.id === you) || null;
  const isOver = state.phase === 'over';

  return (
    <div className="felt-bg relative z-0 h-[100dvh] flex flex-col overflow-hidden">
      <TopBar state={state} me={me} send={send} />

      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        <div className="min-h-full flex flex-col px-3 pb-2">
          <Dealer state={state} />
          <Seats state={state} you={you} />
        </div>
      </main>

      <Dock state={state} me={me} you={you} send={send} error={error} />

      <AnimatePresence>{isOver && <GameOver state={state} send={send} />}</AnimatePresence>
    </div>
  );
}

function TopBar({ state, me, send }) {
  const goal = state.config?.goal ?? 1500;
  const pct = me ? Math.min(100, Math.round((me.chips / goal) * 100)) : 0;
  return (
    <header className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-gild/15">
      <div className="leading-none">
        <div className="font-display text-xl gild-text">Blackjack</div>
        <div className="text-[0.6rem] text-moss tracking-[0.2em] uppercase">Table {code(state)} · Hand {state.roundNo}</div>
      </div>
      {me && (
        <div className="ml-auto flex items-center gap-2 min-w-0">
          <div className="text-right leading-none">
            <div className="font-body font-bold text-gild text-lg">{me.chips}</div>
            <div className="text-[0.55rem] text-moss uppercase tracking-widest">chips → {goal}</div>
          </div>
          <div className="w-16 h-1.5 rounded-full bg-felt-deep overflow-hidden border border-gild/20">
            <div className="h-full bg-gild/80" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      <div className="pl-1"><RulesButton label="Rules" /></div>
      {state.isHost && (
        <button onClick={() => send({ t: 'restart' })}
          className="text-[0.6rem] text-moss hover:text-crimson uppercase tracking-widest transition" title="Return everyone to the lobby">Lobby</button>
      )}
    </header>
  );
}
const code = (state) => state.code || '';

function Dealer({ state }) {
  const d = state.dealer || { hand: [] };
  const revealed = d.value != null;
  return (
    <section className="relative shrink-0 pt-3 pb-4 grid place-items-center">
      <div className="absolute -top-1 text-gild/20"><DecoFan className="w-52 h-24" /></div>
      <div className="relative flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2">
          <span className="eyebrow">The House</span>
          {revealed && (
            <span className={`text-xs font-bold ${d.value.bust ? 'text-crimson' : 'text-ivory'}`}>
              {d.value.bust ? `Bust · ${d.value.total}` : d.value.blackjack ? 'Blackjack' : d.value.total}
            </span>
          )}
        </div>
        <div className="flex gap-1.5 min-h-[4.5rem] items-start">
          {d.hand.length === 0 && <span className="text-moss/50 text-sm italic self-center">waiting for bets…</span>}
          {d.hand.map((c, i) => (
            <DealtCard key={i} card={c} faceDown={!c} size="md" delay={i * 0.12} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Seats({ state, you }) {
  const seats = state.players;
  return (
    <section className="flex-1 grid gap-2 content-start"
      style={{ gridTemplateColumns: `repeat(${seats.length <= 3 ? seats.length : 2}, minmax(0, 1fr))` }}>
      {seats.map((p) => <Seat key={p.id} p={p} me={p.id === you} phase={state.phase} />)}
    </section>
  );
}

function Seat({ p, me, phase }) {
  const v = p.value;
  const acting = p.isTurn && phase === 'player';
  const spectating = p.out || (p.sitOut && p.hasBet);
  return (
    <motion.div layout
      className={`relative rounded-xl border px-2.5 py-2 flex flex-col gap-1.5 transition
        ${acting ? 'border-gild bg-felt-raised/70 shadow-rail' : 'border-gild/15 bg-felt-rail/50'}
        ${spectating ? 'opacity-45' : ''}`}>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="truncate font-body text-sm text-ivory">{p.name}{me && <span className="text-moss"> (you)</span>}</span>
        {p.isBot && <span className="text-[0.42rem] uppercase tracking-wider text-gild/80 border border-gild/30 rounded px-1 leading-tight">AI</span>}
        {!p.connected && !p.isBot && <span className="text-[0.5rem] text-crimson/80">off</span>}
        <span className="ml-auto flex items-center gap-1 text-gild font-bold text-xs">
          <Chip value={p.chips} size={16} />{p.chips}
        </span>
      </div>

      <div className="flex items-end gap-2 min-h-[3.5rem]">
        <div className="flex gap-1">
          {(!p.hand || p.hand.length === 0)
            ? <span className="text-moss/50 text-xs italic self-center">{spectating ? 'sitting out' : phase === 'betting' ? (p.hasBet ? 'bet in' : 'betting…') : '—'}</span>
            : p.hand.map((c, i) => <DealtCard key={i} card={c} size="sm" delay={i * 0.08} dim={p.busted} />)}
        </div>
        {v && (
          <span className={`ml-auto text-sm font-bold leading-none ${v.bust ? 'text-crimson' : v.blackjack ? 'text-gild' : 'text-ivory'}`}>
            {v.bust ? 'BUST' : v.blackjack ? '21!' : (v.soft ? `${v.total - 10}/${v.total}` : v.total)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 h-4">
        {p.bet > 0 && phase !== 'roundEnd' && phase !== 'over' && (
          <span className="text-[0.6rem] text-moss">bet <b className="text-gild">{p.bet}</b>{p.doubled && ' ×2'}</span>
        )}
        {acting && <span className="text-[0.55rem] uppercase tracking-widest text-gild animate-pulse">acting…</span>}
        {p.result && <ResultBadge result={p.result} delta={p.delta} />}
      </div>
    </motion.div>
  );
}

function ResultBadge({ result, delta }) {
  const map = {
    blackjack: ['Blackjack', 'text-felt-rail bg-gild'],
    win: ['Win', 'text-felt-rail bg-jade'],
    push: ['Push', 'text-ivory bg-moss/40'],
    lose: ['Lost', 'text-ivory bg-crimson/70'],
    bust: ['Bust', 'text-ivory bg-crimson/70'],
  };
  const [label, cls] = map[result] || ['', ''];
  return (
    <span className={`text-[0.55rem] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 ${cls}`}>
      {label} {delta > 0 ? `+${delta}` : delta < 0 ? delta : ''}
    </span>
  );
}

// ---- the action dock -------------------------------------------------------
function Dock({ state, me, you, send, error }) {
  return (
    <footer className="shrink-0 border-t border-gild/20 bg-felt-rail/80 backdrop-blur px-3 py-3 min-h-[5rem] flex flex-col justify-center">
      <ErrorNote error={error} />
      {state.phase === 'betting' && <BetDock me={me} send={send} config={state.config} />}
      {state.phase === 'player' && <PlayDock state={state} me={me} you={you} send={send} />}
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
          className="text-center text-xs text-crimson mb-1.5">{show}</motion.p>
      )}
    </AnimatePresence>
  );
}

function BetDock({ me, send, config }) {
  const [bet, setBet] = useState(0);
  const min = config?.minBet ?? 10;
  if (!me) return null;
  if (me.out) return <p className="text-center text-sm text-moss">You’re out of chips — spectating this round.</p>;
  if (me.hasBet) {
    return (
      <p className="text-center text-sm text-moss">
        {me.sitOut ? 'Sitting this hand out.' : <>Bet <b className="text-gild">{me.bet}</b> is in — waiting for the table…</>}
      </p>
    );
  }
  const add = (n) => setBet((b) => Math.min(me.chips, b + n));
  const canPlace = bet >= Math.min(min, me.chips) && bet <= me.chips && bet > 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2">
        <span className="eyebrow">Your bet</span>
        <span className="font-display text-2xl gild-text leading-none min-w-[2ch] text-center">{bet}</span>
        {bet > 0 && <button onClick={() => setBet(0)} className="text-[0.6rem] text-moss hover:text-ivory uppercase tracking-widest">clear</button>}
      </div>
      <div className="flex items-center justify-center gap-2">
        {CHIPS.filter((c) => c <= me.chips).map((c) => (
          <button key={c} onClick={() => add(c)}
            className="chip-btn w-11 h-11 text-white/95"
            style={{ borderColor: c >= 100 ? '#e8c877' : c >= 50 ? '#f6e2a6' : c >= 25 ? '#f6e2a6' : '#fff6df',
                     background: `radial-gradient(circle at 50% 38%, ${c >= 100 ? '#3a3f4b' : c >= 50 ? '#c0392b' : c >= 25 ? '#1c7a55' : '#e8c877'}, ${c >= 100 ? '#20232a' : c >= 50 ? '#8d2740' : c >= 25 ? '#0e4a35' : '#c99a3f'})` }}>
            {c}
          </button>
        ))}
        <button onClick={() => setBet(me.chips)} className="btn-ghost !px-3 !py-2 text-xs">All in</button>
      </div>
      <div className="flex gap-2">
        <button className="btn-ghost flex-1 !py-2.5 text-sm" onClick={() => send({ t: 'sitout' })}>Sit out</button>
        <button className="btn-gild flex-[2] !py-2.5" disabled={!canPlace} onClick={() => send({ t: 'bet', amount: bet })}>
          {canPlace ? `Place ${bet}` : `Min ${Math.min(min, me.chips)}`}
        </button>
      </div>
    </div>
  );
}

function PlayDock({ state, me, you, send }) {
  const myTurn = state.turn === you && me && !me.done;
  if (!myTurn) {
    const who = state.players.find((p) => p.id === state.turn);
    return <p className="text-center text-sm text-moss">{who ? <>Waiting on <b className="text-ivory">{who.name}</b>…</> : 'Dealing…'}</p>;
  }
  const canDouble = me.hand?.length === 2 && me.chips >= me.bet * 2;
  return (
    <div className="flex gap-2">
      <button className="btn-act flex-1 border-jade/60 text-jade bg-jade/10 hover:bg-jade/20" onClick={() => send({ t: 'hit' })}>Hit</button>
      <button className="btn-act flex-1 border-gild/60 text-gild bg-gild/10 hover:bg-gild/20" onClick={() => send({ t: 'stand' })}>Stand</button>
      <button className="btn-act flex-1 border-crimson/60 text-crimson bg-crimson/10 hover:bg-crimson/20 disabled:opacity-30"
        disabled={!canDouble} onClick={() => send({ t: 'double' })} title={canDouble ? 'Double your bet, take one card' : 'Only on your first two cards, chips permitting'}>
        Double
      </button>
    </div>
  );
}

function RoundEndDock({ state, me, send }) {
  const r = state.roundResult;
  return (
    <div className="space-y-2">
      {r?.text && <p className="text-center text-sm text-ivory/90">{r.text}</p>}
      {me && me.result && !me.out && (
        <p className="text-center text-xs text-moss">
          You {me.delta > 0 ? <span className="text-jade font-bold">won {me.delta}</span> : me.delta < 0 ? <span className="text-crimson font-bold">lost {-me.delta}</span> : <span className="text-ivory">pushed</span>} · now {me.chips} chips
        </p>
      )}
      {state.isHost
        ? <button className="btn-gild w-full" onClick={() => send({ t: 'next' })}>Deal next hand</button>
        : <p className="text-center text-xs text-moss">Waiting for the host to deal the next hand…</p>}
    </div>
  );
}

function GameOver({ state, send }) {
  const winner = state.players.find((p) => p.id === state.gameWinnerId);
  const ranked = [...state.players].sort((a, b) => b.chips - a.chips);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 grid place-items-center p-5 bg-black/75 backdrop-blur-sm overflow-y-auto no-scrollbar">
      <motion.div initial={{ scale: 0.9, y: 16 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 20 }}
        className="panel my-auto w-full max-w-sm p-6 text-center space-y-4">
        <div className="text-gild/30 flex justify-center"><DecoFan className="w-40 h-16" /></div>
        <p className="eyebrow">The night is settled</p>
        <h2 className="font-display text-4xl gild-text leading-none">
          {winner ? `${winner.name} wins` : 'House wins'}
        </h2>
        <p className="text-sm text-moss">
          {winner ? `Walked with ${winner.chips} chips.` : 'The table was cleaned out.'}
        </p>
        <ul className="space-y-1 text-left">
          {ranked.map((p, i) => (
            <li key={p.id} className="flex items-center gap-2 rounded-lg bg-felt-deep/50 px-3 py-1.5">
              <span className="w-5 text-center text-moss font-bold">{i + 1}</span>
              <span className="text-ivory truncate">{p.name}</span>
              {p.id === state.gameWinnerId && <span className="text-gild">♛</span>}
              <span className="ml-auto font-bold text-gild">{p.chips}</span>
            </li>
          ))}
        </ul>
        {state.isHost
          ? <button className="btn-gild w-full" onClick={() => send({ t: 'restart' })}>Play again</button>
          : <p className="text-xs text-moss">Waiting for the host to start a new night…</p>}
      </motion.div>
    </motion.div>
  );
}
