// Quest — client. Server-authoritative; we render the per-player view and send
// intents. Arthurian heraldry: steel night, gold leaf, crimson shadow.
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameSocket } from './net.js';
import { Wordmark, Sigil, Ballot, ROMAN } from './components/Crest.jsx';
import QuestTrack, { RejectTrack } from './components/QuestTrack.jsx';
import Rules from './components/Rules.jsx';

const EVIL = new Set(['assassin', 'morgana', 'minion']);
const roleColor = (role) => (EVIL.has(role) ? 'text-crimson-bright' : 'text-gold');

export default function App() {
  const { status, state, you, code, error, create, join, send } = useGameSocket();
  if (!state || !you) return <Landing onCreate={create} onJoin={join} status={status} error={error} />;
  if (state.phase === 'lobby') return <Lobby state={state} code={code} send={send} />;
  return <Game state={state} code={code} send={send} error={error} />;
}

/* ───────────────────────── Landing ───────────────────────── */
function Landing({ onCreate, onJoin, status, error }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('create');
  const go = () => (mode === 'create' ? onCreate(name.trim()) : onJoin(name.trim(), code));
  return (
    <div className="min-h-[100dvh] grid place-items-center p-6">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className="w-full max-w-sm text-center">
        <motion.div initial={{ scale: 0.7, rotate: -8 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 14 }} className="grid place-items-center">
          <Wordmark size={84} />
        </motion.div>
        <h1 className="mt-3 font-display text-5xl font-black gold-leaf tracking-emblem">QUEST</h1>
        <p className="mt-1 eyebrow">Loyalty &amp; Betrayal at the Round Table</p>

        <div className="panel mt-6 rounded-2xl p-5 space-y-3 text-left">
          <div className="flex gap-2">
            {['create', 'join'].map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 rounded-lg py-2 font-display text-sm tracking-emblem capitalize transition
                  ${mode === m ? 'bg-gold text-steel-deep font-semibold' : 'bg-white/5 text-parch/70 hover:bg-white/10'}`}>
                {m === 'create' ? 'Hold Court' : 'Join Court'}
              </button>
            ))}
          </div>
          <input className="w-full rounded-lg bg-steel-deep/70 border border-gold/20 px-3 py-2.5 text-parch placeholder:text-parch/30"
            placeholder="Your name" maxLength={16} value={name}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && go()} />
          {mode === 'join' && (
            <input className="w-full rounded-lg bg-steel-deep/70 border border-gold/20 px-3 py-2.5 uppercase tracking-[0.3em] text-center font-display text-parch placeholder:text-parch/30"
              placeholder="CODE" maxLength={4} value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && go()} />
          )}
          <button className="w-full rounded-lg bg-gradient-to-b from-gold-bright to-gold py-2.5 font-display tracking-emblem text-steel-deep font-bold disabled:opacity-40 hover:brightness-110"
            disabled={!name.trim() || (mode === 'join' && code.length < 4)} onClick={go}>
            {mode === 'create' ? 'Summon the Court' : 'Enter the Hall'}
          </button>
          <p className="text-xs text-parch/40 text-center">
            {status === 'open' ? 'Connected to the realm.' : 'Reaching the realm…'} {error?.message}
          </p>
        </div>
        <p className="mt-4 text-xs text-parch/40">5–10 players · one phone each</p>
      </motion.div>
    </div>
  );
}

/* ───────────────────────── Lobby ───────────────────────── */
function Lobby({ state, code, send }) {
  const enough = state.players.length >= state.minPlayers;
  return (
    <div className="min-h-[100dvh] grid place-items-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="grid place-items-center"><Wordmark size={56} /></div>
        <p className="eyebrow mt-2">The court gathers</p>
        <div className="panel mt-4 rounded-2xl p-5">
          <div className="text-sm text-parch/50 font-display tracking-emblem">Court code</div>
          <div className="font-display text-5xl tracking-[0.35em] gold-leaf">{code}</div>

          <ul className="mt-4 space-y-1.5">
            <AnimatePresence>
              {state.players.map((p) => (
                <motion.li key={p.id} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-3 rounded-lg bg-white/[0.04] border border-gold/10 px-3 py-2 text-left">
                  <span className="text-gold/70"><Sigil role="loyal" size={22} /></span>
                  <span className="font-display tracking-wide">{p.name}{p.id === state.you && <span className="text-gold/60"> · you</span>}</span>
                  {p.id === state.you && state.isHost && <span className="ml-auto eyebrow text-gold/60">Host</span>}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <div className="mt-4">
            {state.isHost ? (
              <button className="w-full rounded-lg bg-gradient-to-b from-gold-bright to-gold py-2.5 font-display tracking-emblem text-steel-deep font-bold disabled:opacity-40"
                disabled={!enough} onClick={() => send({ t: 'start' })}>
                {enough ? 'Begin the Quest' : `Need ${state.minPlayers - state.players.length} more`}
              </button>
            ) : (
              <p className="text-sm text-parch/50">Awaiting the host’s command…</p>
            )}
          </div>
        </div>
        <p className="mt-4 text-xs text-parch/40">Share the code. Reconnect anytime by entering the same name.</p>
      </div>
    </div>
  );
}

/* ───────────────────────── Game shell ───────────────────────── */
function Game({ state, send, error }) {
  const [rules, setRules] = useState(false);
  const [flash, setFlash] = useState(null);
  useEffect(() => { if (error) { setFlash(error.message); const t = setTimeout(() => setFlash(null), 2600); return () => clearTimeout(t); } }, [error]);

  const name = (id) => state.players.find((p) => p.id === id)?.name ?? '—';

  return (
    <div className="flex min-h-[100dvh] max-h-[100dvh] flex-col px-3 pt-2 pb-3 max-w-md mx-auto">
      {/* Header */}
      <header className="flex items-center gap-2 shrink-0">
        <Wordmark size={30} />
        <div className="leading-none">
          <div className="font-display text-lg font-bold gold-leaf tracking-emblem">QUEST</div>
        </div>
        <span className="ml-1 rounded bg-white/5 px-2 py-0.5 font-display text-xs tracking-[0.25em] text-parch/60">{state.code}</span>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <div className="eyebrow text-parch/40 leading-none">Rejections</div>
            <div className="mt-1"><RejectTrack count={state.rejectCount} /></div>
          </div>
          <button onClick={() => setRules(true)} aria-label="How to play"
            className="grid h-8 w-8 place-items-center rounded-full border border-gold/30 text-gold-bright font-display">?</button>
        </div>
      </header>

      {/* Quest track — the signature strip */}
      <div className="panel mt-2 rounded-xl px-2 py-2 shrink-0">
        <QuestTrack results={state.results} questIndex={state.questIndex} teamSizes={state.teamSizes} n={state.n} />
      </div>

      {/* Phase stage */}
      <main className="relative flex-1 min-h-0 mt-2 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={state.phase}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }} className="h-full">
            <Stage state={state} send={send} name={name} />
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {flash && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 rounded-lg bg-crimson-deep border border-crimson-bright/50 px-4 py-2 text-sm text-parch shadow-lg">
            {flash}
          </motion.div>
        )}
      </AnimatePresence>

      <Rules open={rules} onClose={() => setRules(false)} />
    </div>
  );
}

/* ───────────────────────── Phase router ───────────────────────── */
function Stage({ state, send, name }) {
  switch (state.phase) {
    case 'reveal':     return <RevealStage state={state} send={send} />;
    case 'propose':    return <ProposeStage state={state} send={send} name={name} />;
    case 'vote':       return <VoteStage state={state} send={send} name={name} />;
    case 'voteReveal': return <VoteRevealStage state={state} send={send} />;
    case 'quest':      return <QuestStage state={state} send={send} />;
    case 'questReveal':return <QuestRevealStage state={state} send={send} />;
    case 'assassin':   return <AssassinStage state={state} send={send} name={name} />;
    case 'over':       return <OverStage state={state} send={send} />;
    default:           return null;
  }
}

/* ── Night reveal — your private dossier ── */
function RevealStage({ state, send }) {
  const r = state.yourRole;
  const k = state.knowledge;
  const evil = EVIL.has(r?.key);
  return (
    <div className="flex h-full flex-col items-center justify-start gap-3 pb-1 overflow-y-auto no-bar">
      <p className="eyebrow mt-1">Your secret oath</p>
      <RoleCard role={r} evil={evil} />
      {k && (
        <div className="panel w-full rounded-xl p-3">
          <div className="eyebrow mb-1">{k.title}</div>
          {k.ids.length ? (
            <>
              <div className="flex flex-wrap gap-2">
                {k.ids.map((id) => (
                  <span key={id} className="rounded-full bg-white/[0.06] border border-gold/20 px-3 py-1 font-display text-sm">
                    {state.players.find((p) => p.id === id)?.name}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs italic text-parch/50">{k.hint}</p>
            </>
          ) : <p className="text-sm text-parch/50">{k.hint}</p>}
        </div>
      )}
      <div className="mt-auto w-full pt-1">
        {state.ready ? (
          <p className="text-center text-sm text-parch/60">Oath sworn. Waiting for the others…</p>
        ) : (
          <button onClick={() => send({ t: 'ready' })}
            className="w-full rounded-lg bg-gradient-to-b from-gold-bright to-gold py-3 font-display tracking-emblem text-steel-deep font-bold">
            I have memorised my fate
          </button>
        )}
      </div>
    </div>
  );
}

function RoleCard({ role, evil }) {
  return (
    <motion.div initial={{ rotateY: 180, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 16 }}
      className={`w-full rounded-2xl border p-4 text-center ${evil ? 'border-crimson/50 bg-crimson-deep/30' : 'border-gold/40 bg-steel-mid/40'}`}>
      <div className={`grid place-items-center ${evil ? 'text-crimson-bright' : 'text-gold-bright'}`}>
        <Sigil role={role?.key} size={56} />
      </div>
      <h2 className={`mt-1 font-display text-2xl font-bold ${evil ? 'text-crimson-bright' : 'gold-leaf'}`}>{role?.name}</h2>
      {role?.subtitle && <p className="text-xs italic text-parch/55">{role.subtitle}</p>}
      <p className={`mt-0.5 eyebrow ${evil ? 'text-crimson-bright/80' : 'text-gold/80'}`}>{evil ? 'Sworn to Mordred' : 'Loyal to Arthur'}</p>
      <p className="mt-2 text-sm text-parch/80 leading-relaxed">{role?.blurb}</p>
    </motion.div>
  );
}

/* ── Propose ── */
function ProposeStage({ state, send, name }) {
  const amLeader = state.you === state.leader;
  const [sel, setSel] = useState([]);
  const size = state.teamSize;
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < size ? [...s, id] : s));

  return (
    <div className="flex h-full flex-col gap-2 pb-1">
      <Banner
        title={`Quest ${ROMAN[state.questIndex]}`}
        sub={amLeader ? `Choose ${size} companions for the quest` : `${name(state.leader)} is choosing ${size} companions`}
      />
      <SeatList state={state} selectable={amLeader} selected={sel} onToggle={toggle} />
      {amLeader ? (
        <button disabled={sel.length !== size} onClick={() => send({ t: 'propose', team: sel })}
          className="w-full rounded-lg bg-gradient-to-b from-gold-bright to-gold py-3 font-display tracking-emblem text-steel-deep font-bold disabled:opacity-40">
          Send the team ({sel.length}/{size})
        </button>
      ) : (
        <p className="text-center text-sm text-parch/50 animate-pulse">Awaiting the Leader’s decree…</p>
      )}
    </div>
  );
}

/* ── Vote ── */
function VoteStage({ state, send, name }) {
  const voted = state.yourVote !== null;
  return (
    <div className="flex h-full flex-col gap-2 pb-1">
      <Banner title="The vote" sub={`${name(state.leader)} proposes this team. Approve or reject.`} />
      <SeatList state={state} highlightTeam />
      <div className="text-center text-xs text-parch/50">{state.voteProgress}/{state.n} ballots cast</div>
      {voted ? (
        <div className="text-center">
          <p className="text-sm text-parch/70">Your ballot is sealed: <b className={state.yourVote ? 'text-gold-bright' : 'text-crimson-bright'}>{state.yourVote ? 'Approve' : 'Reject'}</b></p>
          <p className="text-xs text-parch/40 mt-1">Waiting for the court…</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => send({ t: 'vote', approve: true })}
            className="rounded-xl border border-gold/50 bg-gold/10 py-3 font-display tracking-emblem text-gold-bright font-bold flex flex-col items-center gap-1 hover:bg-gold/20">
            <Ballot approve size={34} /> Approve
          </button>
          <button onClick={() => send({ t: 'vote', approve: false })}
            className="rounded-xl border border-crimson/50 bg-crimson/10 py-3 font-display tracking-emblem text-crimson-bright font-bold flex flex-col items-center gap-1 hover:bg-crimson/20">
            <Ballot approve={false} size={34} /> Reject
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Vote reveal — the ballot flip ── */
function VoteRevealStage({ state, send }) {
  const v = state.lastVote;
  const approves = Object.values(v.votes).filter(Boolean).length;
  return (
    <div className="flex h-full flex-col gap-2 pb-1">
      <Banner
        title={v.approved ? 'Approved' : 'Rejected'}
        sub={`${approves} approve · ${state.n - approves} reject`}
        tone={v.approved ? 'good' : 'evil'}
      />
      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0 overflow-y-auto no-bar content-start">
        {state.players.map((p, i) => {
          const ap = v.votes[p.id];
          return (
            <motion.div key={p.id} initial={{ rotateY: 180 }} animate={{ rotateY: 0 }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 160, damping: 14 }}
              className={`flex items-center gap-2 rounded-lg border px-2 py-2 h-fit ${ap ? 'border-gold/40 bg-gold/5' : 'border-crimson/40 bg-crimson/5'}`}>
              <Ballot approve={!!ap} size={24} />
              <span className="font-display text-sm truncate">{p.name}</span>
            </motion.div>
          );
        })}
      </div>
      <ProceedButton state={state} send={send} label={v.approved ? 'On to the quest' : 'Pass leadership'} />
    </div>
  );
}

/* ── Quest — secret success/fail ── */
function QuestStage({ state, send }) {
  const onQuest = state.onQuest;
  const played = state.yourCard !== null;
  const isEvil = EVIL.has(state.yourRole?.key);
  return (
    <div className="flex h-full flex-col gap-2 pb-1">
      <Banner title={`Quest ${ROMAN[state.questIndex]} rides out`}
        sub={`${state.questProgress}/${state.proposal.length} have played · ${state.needed === 2 ? 'needs 2 fails' : '1 fail sinks it'}`} />
      <SeatList state={state} highlightTeam />
      {!onQuest ? (
        <p className="text-center text-sm text-parch/50 animate-pulse">You ride not on this quest. Await its outcome…</p>
      ) : played ? (
        <p className="text-center text-sm text-parch/70">Your card is laid <b className={state.yourCard ? 'text-gold-bright' : 'text-crimson-bright'}>face down</b>. Waiting…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => send({ t: 'play', success: true })}
              className="rounded-xl border border-gold/50 bg-gold/10 py-4 font-display tracking-emblem text-gold-bright font-bold hover:bg-gold/20">
              Success
            </button>
            <button onClick={() => isEvil && send({ t: 'play', success: false })} disabled={!isEvil}
              className={`rounded-xl border py-4 font-display tracking-emblem font-bold ${isEvil ? 'border-crimson/50 bg-crimson/10 text-crimson-bright hover:bg-crimson/20' : 'border-white/10 bg-white/5 text-parch/30 cursor-not-allowed'}`}>
              {isEvil ? 'Sabotage' : 'Sabotage 🔒'}
            </button>
          </div>
          {!isEvil && <p className="text-center text-xs text-parch/40">The loyal cannot betray a quest.</p>}
        </>
      )}
    </div>
  );
}

/* ── Quest reveal — the suspenseful flip ── */
function QuestRevealStage({ state, send }) {
  const q = state.lastQuest;
  const cards = Array.from({ length: q.size }, (_, i) => i < q.failCount);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <Banner title={q.passed ? 'The quest succeeds' : 'The quest fails'}
        sub={q.failCount ? `${q.failCount} betrayal${q.failCount === 1 ? '' : 's'} revealed` : 'Not a single betrayal'}
        tone={q.passed ? 'good' : 'evil'} center />
      <div className="flex flex-wrap justify-center gap-3">
        {cards.map((isFail, i) => (
          <motion.div key={i} initial={{ rotateY: 180, y: 14 }} animate={{ rotateY: 0, y: 0 }}
            transition={{ delay: i * 0.22, type: 'spring', stiffness: 140, damping: 13 }}
            className={`grid h-20 w-14 place-items-center rounded-lg border-2 font-display text-xs font-bold tracking-wider
              ${isFail ? 'border-crimson-bright bg-crimson-deep text-parch' : 'border-gold bg-steel-mid text-gold-bright'}`}>
            {isFail ? 'FAIL' : 'PASS'}
          </motion.div>
        ))}
      </div>
      <ProceedButton state={state} send={send} label="Continue" />
    </div>
  );
}

/* ── Assassin endgame ── */
function AssassinStage({ state, send, name }) {
  const amAssassin = state.you === state.assassin;
  const [target, setTarget] = useState(null);
  const known = state.knowledge?.ids || [];
  return (
    <div className="flex h-full flex-col gap-2 pb-1">
      <Banner title="The Assassin rises" tone="evil" center
        sub={amAssassin ? 'Three quests have succeeded. Strike down the one you believe is Merlin.' : `${name(state.assassin)} hunts for Merlin…`} />
      {amAssassin ? (
        <>
          <div className="grid grid-cols-2 gap-2 flex-1 min-h-0 overflow-y-auto no-bar content-start">
            {state.players.filter((p) => p.id !== state.you && !known.includes(p.id)).map((p) => (
              <button key={p.id} onClick={() => setTarget(p.id)}
                className={`rounded-lg border px-2 py-3 font-display text-sm ${target === p.id ? 'border-crimson-bright bg-crimson/20 text-parch' : 'border-white/10 bg-white/[0.04] text-parch/80 hover:border-crimson/40'}`}>
                {p.name}
              </button>
            ))}
          </div>
          <button disabled={!target} onClick={() => send({ t: 'assassinate', target })}
            className="w-full rounded-lg bg-gradient-to-b from-crimson-bright to-crimson py-3 font-display tracking-emblem text-parch font-bold disabled:opacity-40">
            Strike
          </button>
        </>
      ) : (
        <p className="text-center text-sm text-parch/50 animate-pulse">The realm holds its breath…</p>
      )}
    </div>
  );
}

/* ── Game over — the unambiguous result screen ── */
function winExplanation(state) {
  const nameOf = (id) => state.players.find((p) => p.id === id)?.name ?? 'someone';
  const merlinName = state.merlin ? nameOf(state.merlin) : 'Merlin';
  const targetName = state.assassinTarget ? nameOf(state.assassinTarget) : null;
  switch (state.winPath) {
    case 'assassin_miss':
      return [`Good completed 3 quests, and the Assassin struck ${targetName} — not Merlin (${merlinName}).`, 'Good wins.'];
    case 'assassin_hit':
      return [`Good completed 3 quests, but the Assassin correctly named Merlin (${merlinName}).`, 'Evil wins.'];
    case 'three_fails':
      return ['Three quests failed to sabotage.', 'Evil wins.'];
    case 'five_rejects':
      return ['Five team proposals were rejected in a row.', 'Evil wins.'];
    default:
      return [state.reason, state.winner === 'good' ? 'Good wins.' : 'Evil wins.'];
  }
}

function OverStage({ state, send }) {
  const good = state.winner === 'good';
  const accent = good ? 'gold-leaf' : 'text-crimson-bright';
  const [why, verdict] = winExplanation(state);
  const usedAssassin = state.winPath === 'assassin_hit' || state.winPath === 'assassin_miss';
  const total = state.teamSizes?.length || 5;

  return (
    <div className="flex h-full flex-col items-center justify-start gap-2.5 pb-1 overflow-y-auto no-bar">
      {/* 1 — WINNER */}
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 14 }} className="text-center mt-1">
        <div className="grid place-items-center"><Wordmark size={46} /></div>
        <p className="eyebrow mt-1 text-parch/50">{good ? 'Victory for the Realm' : 'Victory for Mordred'}</p>
        <h2 className={`font-display text-3xl font-black ${accent}`}>
          {good ? 'Good Wins' : 'Evil Wins'}
        </h2>
      </motion.div>

      {/* 2 — WHY (plain sentence, exact win path) */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className={`w-full rounded-xl border p-3 text-center ${good ? 'border-gold/40 bg-gold/5' : 'border-crimson/40 bg-crimson/5'}`}>
        <p className="text-sm text-parch/85 leading-snug">{why}</p>
        <p className={`mt-1 font-display text-lg font-bold ${accent}`}>{verdict}</p>
      </motion.div>

      {/* 3a — the five quest results */}
      <div className="panel w-full rounded-xl p-3">
        <div className="flex items-center justify-between">
          <span className="eyebrow">The five quests</span>
          <span className="text-xs text-parch/60">
            <span className="text-gold-bright">{state.successes}✓</span> · <span className="text-crimson-bright">{state.fails}✗</span>
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-1">
          {Array.from({ length: total }, (_, i) => {
            const r = state.results[i];
            return (
              <motion.div key={i} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.07 }}
                className={`flex flex-1 flex-col items-center gap-1 rounded-lg border py-1.5
                  ${r === 'success' ? 'border-gold/50 bg-gold/10' : r === 'fail' ? 'border-crimson/50 bg-crimson/10' : 'border-white/8 bg-white/[0.02]'}`}>
                <span className="font-display text-[11px] text-parch/50">{ROMAN[i]}</span>
                <span className={`text-sm font-bold ${r === 'success' ? 'text-gold-bright' : r === 'fail' ? 'text-crimson-bright' : 'text-parch/25'}`}>
                  {r === 'success' ? '✓' : r === 'fail' ? '✗' : '—'}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 3b — Assassin's strike vs. Merlin (only if it happened) */}
      {usedAssassin && (
        <div className={`w-full rounded-xl border p-3 ${state.winPath === 'assassin_hit' ? 'border-crimson/40 bg-crimson/5' : 'border-gold/30 bg-gold/5'}`}>
          <div className="eyebrow mb-1.5">The Assassin’s strike</div>
          <div className="flex items-center justify-between text-sm">
            <span>Struck <b className="text-crimson-bright">{state.players.find((p) => p.id === state.assassinTarget)?.name}</b></span>
            <span className="text-parch/40">vs</span>
            <span>Merlin was <b className="text-gold-bright">{state.players.find((p) => p.id === state.merlin)?.name}</b></span>
          </div>
        </div>
      )}

      {/* 3c — full reveal of every loyalty */}
      <div className="panel w-full rounded-xl p-3">
        <div className="eyebrow mb-2">The court unmasked</div>
        <ul className="space-y-1.5">
          {[...state.players].sort((a, b) => (EVIL.has(a.role) === EVIL.has(b.role) ? 0 : EVIL.has(a.role) ? 1 : -1)).map((p) => {
            const evil = EVIL.has(p.role);
            return (
              <li key={p.id} className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 ${evil ? 'border-crimson/25 bg-crimson/[0.04]' : 'border-gold/20 bg-gold/[0.04]'}`}>
                <span className={roleColor(p.role)}><Sigil role={p.role} size={22} /></span>
                <span className="font-display text-sm">
                  {p.name}{p.id === state.you && <span className="text-parch/45"> · you</span>}
                </span>
                {p.id === state.merlin && <span title="Merlin" className="text-gold-bright text-xs">★</span>}
                {p.id === state.assassinTarget && <span className="text-crimson-bright text-[11px]">☠ struck</span>}
                <span className={`ml-auto font-display text-xs ${evil ? 'text-crimson-bright' : 'text-gold'}`}>{roleName(p.role)}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-center text-[11px] text-parch/40">
          <span className="text-gold">Gold</span> serves Arthur · <span className="text-crimson-bright">Crimson</span> serves Mordred
        </p>
      </div>

      {/* 4 — play again */}
      {state.isHost ? (
        <button onClick={() => send({ t: 'restart' })}
          className="mt-1 w-full shrink-0 rounded-lg bg-gradient-to-b from-gold-bright to-gold py-3 font-display tracking-emblem text-steel-deep font-bold">
          Hold court again
        </button>
      ) : (
        <p className="mt-1 text-sm text-parch/50">Awaiting the host to begin anew…</p>
      )}
    </div>
  );
}

/* ───────────────────────── shared bits ───────────────────────── */
function Banner({ title, sub, tone, center }) {
  const color = tone === 'evil' ? 'text-crimson-bright' : 'gold-leaf';
  return (
    <div className={`shrink-0 ${center ? 'text-center' : ''}`}>
      <h2 className={`font-display text-xl font-bold ${color} tracking-emblem`}>{title}</h2>
      {sub && <p className="text-sm text-parch/70">{sub}</p>}
    </div>
  );
}

function SeatList({ state, selectable, selected = [], onToggle, highlightTeam }) {
  return (
    <ul className="flex-1 min-h-0 overflow-y-auto no-bar space-y-1.5 pr-0.5">
      {state.players.map((p) => {
        const isSel = selected.includes(p.id);
        const onTeam = highlightTeam ? p.onTeam : isSel;
        const isYou = p.id === state.you;
        const known = state.knowledge?.ids?.includes(p.id);
        const tone = p.role ? (EVIL.has(p.role) ? 'evil' : 'good') : known ? 'mark' : null;
        return (
          <li key={p.id}>
            <button
              disabled={!selectable}
              onClick={() => selectable && onToggle?.(p.id)}
              className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition
                ${onTeam ? 'border-gold bg-gold/15' : 'border-white/10 bg-white/[0.03]'}
                ${p.isLeader ? 'pulse-leader' : ''}
                ${selectable ? 'hover:border-gold/50' : 'cursor-default'}`}>
              <span className={tone === 'evil' ? 'text-crimson-bright' : tone === 'good' ? 'text-gold' : 'text-parch/40'}>
                <Sigil role={p.role || (known ? 'assassin' : 'loyal')} size={20} />
              </span>
              <span className="font-display text-sm truncate">
                {p.name}{isYou && <span className="text-gold/50"> · you</span>}
              </span>
              {p.isLeader && <span className="text-gold-bright text-xs" title="Leader">♔</span>}
              {!p.connected && <span className="text-parch/30 text-xs">offline</span>}
              <span className="ml-auto flex items-center gap-1.5">
                {known && !p.role && <span className="text-[10px] text-crimson-bright/80 eyebrow">marked</span>}
                {state.phase === 'vote' && p.hasVoted && <span className="text-xs text-gold-bright">✓</span>}
                {state.phase === 'quest' && p.onTeam && p.playedQuest && <span className="text-xs text-gold-bright">✓</span>}
                {onTeam && <span className="h-2 w-2 rounded-full bg-gold" />}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ProceedButton({ state, send, label }) {
  // Any player may advance the reveal; the server ignores extra taps.
  return (
    <div className="mt-auto w-full">
      <button onClick={() => send({ t: 'proceed' })}
        className="w-full rounded-lg bg-gradient-to-b from-gold-bright to-gold py-3 font-display tracking-emblem text-steel-deep font-bold">
        {label}
      </button>
      <p className="mt-1 text-center text-[11px] text-parch/40">Anyone may continue when ready.</p>
    </div>
  );
}

function roleName(role) {
  return ({ merlin: 'Merlin', percival: 'Percival', loyal: 'Loyal Servant of Arthur', assassin: 'Assassin', morgana: 'Morgana', minion: 'Minion of Mordred' })[role] || '';
}
