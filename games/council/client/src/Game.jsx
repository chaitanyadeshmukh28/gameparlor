import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ROLES, POLICY, POWERS, PHASE_LABEL, Gavel, Sash, WaxSeal, Crest } from './lib.jsx';
import Rules from './Rules.jsx';

const reduce = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

export default function Game({ net }) {
  const { state, you, send, error } = net;
  const [rulesOpen, setRulesOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const ackedRef = useRef(false);

  // Surface server errors as a brief toast.
  useEffect(() => { if (error) { setToast(error.message); const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); } }, [error]);

  // Expose the redacted view for end-to-end test drivers (already client-visible state).
  useEffect(() => { if (typeof window !== 'undefined') { window.__state = state; window.__you = you; } }, [state, you]);

  // Advance past the ballot reveal automatically (any client may ack; idempotent).
  useEffect(() => {
    if (state.phase === 'voteReveal') {
      ackedRef.current = false;
      const t = setTimeout(() => { if (!ackedRef.current) { ackedRef.current = true; send({ t: 'ackReveal' }); } }, reduce ? 600 : 3200);
      return () => clearTimeout(t);
    }
  }, [state.phase, send]);

  const me = state.players.find((p) => p.id === you);

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-md flex-col px-3 pb-3 pt-2 overflow-hidden">
      <Header state={state} onRules={() => setRulesOpen(true)} />
      <RoleStrip state={state} me={me} />
      <PolicyTracks state={state} />
      <CouncilRing state={state} you={you} />
      <div className="mt-2 min-h-0 flex-1">
        <ActionTray state={state} you={you} send={send} me={me} />
      </div>

      <Rules open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <VoteReveal state={state} />
      <GameOver state={state} send={send} />

      <AnimatePresence>
        {toast && (
          <motion.div className="fixed left-1/2 top-3 z-[60] -translate-x-1/2 rounded-lg border border-wax/40 bg-wax-deep/90 px-4 py-2 text-sm text-parch shadow-seal"
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- header ----------------------------------------------------------------
function Header({ state, onRules }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Crest size={30} />
        <div className="leading-none">
          <div className="nameplate text-base">THE COUNCIL</div>
          <div className="font-mono text-[0.6rem] tracking-[0.3em] text-brass-dim">{state.code} · {PHASE_LABEL[state.phase] || ''}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ElectionTracker n={state.failedVotes} />
        <button className="btn-ghost px-2.5 py-1 text-xs" onClick={onRules} aria-label="How to play">Rules</button>
      </div>
    </div>
  );
}

function ElectionTracker({ n }) {
  return (
    <div className="flex items-center gap-1" title={`Failed votes: ${n}/3`} aria-label={`Failed votes ${n} of 3`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={`h-2.5 w-2.5 rounded-full border transition-colors ${
          i < n ? 'border-wax bg-wax' : 'border-brass/30 bg-transparent'}`} />
      ))}
    </div>
  );
}

// ---- your role -------------------------------------------------------------
function RoleStrip({ state, me }) {
  const [open, setOpen] = useState(false);
  if (!me?.role) return <div className="h-1" />;
  const role = ROLES[me.role];
  const allies = state.players.filter((p) => p.role && p.id !== me.id);
  const bad = role.team === 'bad';
  return (
    <div className="mt-2">
      <button onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-2 rounded-lg border px-3 py-1.5 text-left ${
          bad ? 'border-wax/40 bg-wax-deep/30' : 'border-order/40 bg-order-deep/30'}`}>
        <WaxSeal size={26} tone={bad ? '#b0463c' : '#4f9d83'}>
          <circle cx="0" cy="0" r="6" />
        </WaxSeal>
        <div className="leading-tight">
          <div className="font-mono text-[0.55rem] uppercase tracking-[0.3em] text-parch-faint">Your role</div>
          <div className={`font-display text-sm font-semibold ${bad ? 'text-wax-bright' : 'text-order-bright'}`}>{role.name}</div>
        </div>
        <span className="ml-auto text-xs text-parch-faint">{role.tag}</span>
      </button>
      <AnimatePresence>
        {open && allies.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="mt-1 flex flex-wrap gap-1.5 rounded-lg bg-black/20 p-2 text-xs">
              <span className="text-parch-faint">You know:</span>
              {allies.map((a) => (
                <span key={a.id} className="rounded bg-wax-deep/40 px-1.5 py-0.5 text-parch">
                  {a.name} <span className="text-wax-bright">· {ROLES[a.role].name}</span>
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- signature: the policy tracks -----------------------------------------
function PolicyCard({ type, idx }) {
  const isLib = type === 'liberal';
  return (
    <motion.div
      initial={reduce ? false : { y: -52, opacity: 0, rotate: isLib ? -10 : 10 }}
      animate={{ y: 0, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 18, delay: idx * 0.02 }}
      className="relative flex h-full w-full flex-col items-center justify-center rounded-[3px] bg-parch shadow-seal">
      <div className={`absolute inset-x-0 top-0 h-1 ${isLib ? 'bg-order' : 'bg-wax'}`} />
      <span className={`font-display text-[0.5rem] font-bold uppercase tracking-wider ${isLib ? 'text-order-deep' : 'text-wax-deep'}`}>
        {isLib ? 'Lib' : 'Fas'}
      </span>
      <motion.span initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.18, type: 'spring', stiffness: 300 }}
        className={`mt-0.5 h-2.5 w-2.5 rounded-full ${isLib ? 'bg-order' : 'bg-wax'}`} />
    </motion.div>
  );
}

function Track({ type, count, total, powerTrack }) {
  const isLib = type === 'liberal';
  return (
    <div className={`rounded-xl border p-2 ${isLib ? 'border-order/30 bg-order-deep/20' : 'border-wax/30 bg-wax-deep/20'}`}>
      <div className="mb-1 flex items-center justify-between">
        <span className={`font-mono text-[0.55rem] uppercase tracking-[0.25em] ${isLib ? 'text-order-bright' : 'text-wax-bright'}`}>
          {isLib ? 'Liberal' : 'Fascist'}
        </span>
        <span className="font-mono text-[0.6rem] text-parch-faint">{count}/{total}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => {
          const power = !isLib && powerTrack[i + 1];
          return (
            <div key={i} className="relative flex-1">
              <div className={`relative aspect-[3/4] rounded-[3px] border ${
                i < count ? 'border-transparent' : isLib ? 'border-order/25 bg-black/25' : 'border-wax/25 bg-black/25'}`}>
                {i < count && <PolicyCard type={type} idx={i} />}
              </div>
              {power && (
                <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[0.5rem]" title={POWERS[power].name}>
                  <PowerGlyph type={power} lit={i < count} />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PolicyTracks({ state }) {
  const t = state.tracks;
  return (
    <div className="mt-2 space-y-2">
      <Track type="liberal" count={t.liberal} total={t.liberalWin} powerTrack={{}} />
      <div className="pb-3"><Track type="fascist" count={t.fascist} total={t.fascistWin} powerTrack={state.powerTrack} /></div>
    </div>
  );
}

function PowerGlyph({ type, lit }) {
  const c = lit ? '#e8d49a' : '#8a7440';
  const I = { inspect: '◎', appoint: '⇄', survey: '👁', execute: '✕' }[type] || '•';
  return <span style={{ color: c }} className="font-mono">{I}</span>;
}

// ---- council ring ----------------------------------------------------------
function CouncilRing({ state, you }) {
  return (
    <div className="mt-1 flex flex-wrap justify-center gap-1.5">
      {state.players.map((p) => {
        const dead = p.alive === false;
        const tone = p.team === 'bad' ? '#b0463c' : p.team === 'good' ? '#4f9d83' : '#7a6a3f';
        return (
          <div key={p.id} className={`relative flex w-[3.4rem] flex-col items-center ${dead ? 'opacity-40' : ''}`}>
            <div className={`relative rounded-full ${p.isChair ? 'ring-2 ring-brass-bright' : ''} ${!p.connected ? 'grayscale' : ''}`}>
              <WaxSeal size={36} tone={tone}>
                <text x="0" y="4" textAnchor="middle" fontSize="13" fill="rgba(0,0,0,0.55)" stroke="none" fontFamily="Cinzel, serif">
                  {p.name[0]?.toUpperCase()}
                </text>
              </WaxSeal>
              {p.isChair && <span className="absolute -right-1 -top-1 rounded-full bg-chamber-deep p-0.5 text-brass-bright"><Gavel size={13} /></span>}
              {p.isDeputy && <span className="absolute -left-1 -top-1 rounded-full bg-chamber-deep p-0.5 text-brass-bright"><Sash size={12} /></span>}
              {dead && <span className="absolute inset-0 grid place-items-center text-lg text-wax-bright">✕</span>}
            </div>
            <span className="mt-0.5 max-w-full truncate text-[0.62rem] leading-tight">
              {p.name}{p.id === you && <span className="text-brass-dim">·you</span>}
            </span>
            {p.role && <span className={`text-[0.5rem] ${p.team === 'bad' ? 'text-wax-bright' : 'text-order-bright'}`}>{ROLES[p.role].name}</span>}
          </div>
        );
      })}
    </div>
  );
}

// ---- ballot reveal (signature moment) --------------------------------------
function VoteReveal({ state }) {
  const show = state.phase === 'voteReveal' && state.election;
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="fixed inset-0 z-40 grid place-items-center bg-chamber-deep/85 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="w-full max-w-sm text-center">
            <div className="eyebrow mb-3">The ballots are read</div>
            <div className="flex flex-wrap justify-center gap-2">
              {state.election.tally.map((t, i) => {
                const p = state.players.find((x) => x.id === t.id);
                const ja = t.vote === 'ja';
                return (
                  <motion.div key={t.id} className="flex w-16 flex-col items-center"
                    initial={{ rotateY: 0 }} animate={{ rotateY: 180 }}
                    transition={{ delay: reduce ? 0 : 0.25 + i * 0.18, duration: 0.5 }} style={{ transformStyle: 'preserve-3d' }}>
                    <div style={{ transform: 'rotateY(180deg)' }} className="flex flex-col items-center">
                      <WaxSeal size={42} tone={ja ? '#4f9d83' : '#b0463c'}>
                        <text x="0" y="5" textAnchor="middle" fontSize="15" fill="rgba(0,0,0,0.6)" stroke="none" fontFamily="Cinzel, serif">
                          {ja ? 'J' : 'N'}
                        </text>
                      </WaxSeal>
                      <span className="mt-1 max-w-full truncate text-xs">{p?.name}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: reduce ? 0.1 : 0.3 + state.election.tally.length * 0.18 + 0.3 }}
              className={`mt-5 font-display text-3xl font-bold ${state.election.passed ? 'text-order-bright' : 'text-wax-bright'}`}>
              {state.election.passed ? 'The slate passes' : 'The slate fails'}
              <div className="font-mono text-base text-parch-faint">{state.election.ja} Ja · {state.election.tally.length - state.election.ja} Nein</div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---- contextual action tray ------------------------------------------------
function ActionTray({ state, you, send, me }) {
  const chair = state.players.find((p) => p.id === state.chairId);
  const deputy = state.players.find((p) => p.isDeputy);
  const isChair = state.chairId === you;
  const alive = me?.alive !== false;
  const living = state.players.filter((p) => p.alive !== false);

  // NOMINATE
  if (state.phase === 'nominate') {
    if (isChair) {
      return (
        <Panel title="Nominate a Chancellor" hint="Form a slate the Council will trust.">
          <Choices>
            {state.eligibleDeputies?.map((id) => {
              const p = state.players.find((x) => x.id === id);
              return <Choice key={id} pid={id} onClick={() => send({ t: 'nominate', deputyId: id })}>{p?.name}</Choice>;
            })}
          </Choices>
        </Panel>
      );
    }
    return <Waiting>{chair?.name} takes the chair and weighs a Chancellor…</Waiting>;
  }

  // VOTE
  if (state.phase === 'vote') {
    const voted = state.votedIds || [];
    if (!alive) return <Waiting>The Council votes on {chair?.name} &amp; {deputy?.name}. You watch from the gallery.</Waiting>;
    if (state.yourVote) return <Waiting>Ballot cast. {voted.length}/{living.length} members have voted…</Waiting>;
    return (
      <Panel title="Cast your ballot" hint={`Will ${chair?.name} & ${deputy?.name} govern?`}>
        <div className="grid grid-cols-2 gap-3">
          <BallotButton tone="order" label="Ja" sub="In favour" onClick={() => send({ t: 'vote', vote: 'ja' })} />
          <BallotButton tone="wax" label="Nein" sub="Against" onClick={() => send({ t: 'vote', vote: 'nein' })} />
        </div>
        <div className="mt-2 text-center text-xs text-parch-faint">{voted.length}/{living.length} ballots in</div>
      </Panel>
    );
  }

  if (state.phase === 'voteReveal') return <Waiting>Reading the ballots…</Waiting>;

  // LEGISLATIVE — chair drafts
  if (state.phase === 'legislativeChair') {
    if (isChair && state.draw3) {
      return (
        <Panel title="Draft the agenda" hint="Discard one policy in secret. Two go to the Chancellor.">
          <div className="flex justify-center gap-3">
            {state.draw3.map((type, i) => (
              <LegCard key={i} idx={i} type={type} label="Discard" onClick={() => send({ t: 'discard', index: i })} />
            ))}
          </div>
        </Panel>
      );
    }
    return <Waiting>{chair?.name} drafts the agenda behind closed doors…</Waiting>;
  }

  // LEGISLATIVE — deputy enacts
  if (state.phase === 'legislativeDeputy') {
    if (you === deputy?.id && state.deputy2) {
      return (
        <Panel title="Enact a policy" hint="Seal one onto the track. The other is discarded.">
          <div className="flex justify-center gap-3">
            {state.deputy2.map((type, i) => (
              <LegCard key={i} idx={i} type={type} label="Enact" onClick={() => send({ t: 'enact', index: i })} />
            ))}
          </div>
          {state.canVeto && !state.vetoProposed && (
            <button className="btn-ghost mt-3 w-full text-sm" onClick={() => send({ t: 'proposeVeto' })}>Move to veto the agenda</button>
          )}
          {state.vetoProposed && <p className="mt-3 text-center text-xs text-brass-bright">Veto moved — awaiting the President’s answer.</p>}
        </Panel>
      );
    }
    if (isChair && state.vetoProposed) {
      return (
        <Panel title="The Chancellor moves to veto" hint="Consent and the agenda is struck (a failed election).">
          <div className="grid grid-cols-2 gap-3">
            <Choice onClick={() => send({ t: 'answerVeto', agree: true })}>Consent</Choice>
            <Choice onClick={() => send({ t: 'answerVeto', agree: false })}>Refuse</Choice>
          </div>
        </Panel>
      );
    }
    return <Waiting>{deputy?.name} decides which policy to enact…</Waiting>;
  }

  // EXECUTIVE POWER
  if (state.phase === 'power' && state.power) {
    const pw = POWERS[state.power.type];
    const amChair = state.power.chairId === you;
    if (!amChair) return <Waiting>{chair?.name} invokes the {pw.name}…</Waiting>;

    if (state.power.type === 'survey') {
      return (
        <Panel title={pw.name} hint="The next three policies, top first.">
          <div className="flex justify-center gap-3">{state.power.top3?.map((type, i) => <LegCard key={i} type={type} />)}</div>
          <button data-testid="ack" className="btn-brass mt-3 w-full" onClick={() => send({ t: 'ackPower' })}>Return to the chamber</button>
        </Panel>
      );
    }
    if (state.power.type === 'inspect' && state.power.result) {
      const target = state.players.find((p) => p.id === state.power.targetId);
      const bad = state.power.result === 'bad';
      return (
        <Panel title="Allegiance inspected" hint="For your eyes only.">
          <div className={`rounded-lg p-3 text-center font-display text-lg ${bad ? 'bg-wax-deep/40 text-wax-bright' : 'bg-order-deep/40 text-order-bright'}`}>
            {target?.name} stands with the {bad ? 'Fascists' : 'Liberals'}
          </div>
          <button data-testid="ack" className="btn-brass mt-3 w-full" onClick={() => send({ t: 'ackPower' })}>Note it &amp; continue</button>
        </Panel>
      );
    }
    // target picker for inspect / appoint / execute
    return (
      <Panel title={pw.name} hint={pw.hint}>
        <Choices>
          {living.filter((p) => p.id !== you).map((p) => (
            <Choice key={p.id} pid={p.id} tone={state.power.type === 'execute' ? 'wax' : 'brass'}
              onClick={() => send({ t: 'power', targetId: p.id })}>{p.name}</Choice>
          ))}
        </Choices>
      </Panel>
    );
  }

  return <Waiting>The Council is in session…</Waiting>;
}

// ---- tray primitives -------------------------------------------------------
function Panel({ title, hint, children }) {
  return (
    <motion.div className="panel flex h-full flex-col p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-2">
        <h3 className="font-display text-lg font-semibold text-brass-bright">{title}</h3>
        {hint && <p className="text-sm text-parch/60">{hint}</p>}
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto">{children}</div>
    </motion.div>
  );
}
const Choices = ({ children }) => <div className="grid grid-cols-2 gap-2">{children}</div>;
function Choice({ children, onClick, tone = 'brass', pid }) {
  return (
    <button onClick={onClick} data-testid="choice" data-pid={pid}
      className={`rounded-lg border px-3 py-2.5 font-body text-base transition active:translate-y-px ${
        tone === 'wax' ? 'border-wax/40 bg-wax-deep/30 text-parch hover:bg-wax-deep/50'
                       : 'border-brass/35 bg-brass/5 text-parch hover:bg-brass/15'}`}>
      {children}
    </button>
  );
}
function Waiting({ children }) {
  return (
    <motion.div className="panel flex h-full items-center justify-center p-5 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.p className="text-parch/70" animate={reduce ? {} : { opacity: [0.55, 1, 0.55] }} transition={{ duration: 2.4, repeat: Infinity }}>
        {children}
      </motion.p>
    </motion.div>
  );
}
function BallotButton({ tone, label, sub, onClick }) {
  return (
    <button onClick={onClick} data-testid={`vote-${tone === 'order' ? 'ja' : 'nein'}`}
      className={`group rounded-xl border-2 p-4 transition active:translate-y-px ${
      tone === 'order' ? 'border-order/50 bg-order-deep/30 hover:bg-order-deep/50' : 'border-wax/50 bg-wax-deep/30 hover:bg-wax-deep/50'}`}>
      <div className="flex justify-center">
        <WaxSeal size={50} tone={tone === 'order' ? '#4f9d83' : '#b0463c'}>
          <text x="0" y="5" textAnchor="middle" fontSize="16" fill="rgba(0,0,0,0.6)" stroke="none" fontFamily="Cinzel, serif">{label[0]}</text>
        </WaxSeal>
      </div>
      <div className={`mt-1 font-display text-xl font-bold ${tone === 'order' ? 'text-order-bright' : 'text-wax-bright'}`}>{label}</div>
      <div className="text-xs text-parch-faint">{sub}</div>
    </button>
  );
}
function LegCard({ type, label, onClick, idx }) {
  const isLib = type === 'liberal';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} data-testid={onClick ? 'legcard' : undefined} data-idx={idx} data-policy={type}
      className={`relative flex w-20 flex-col items-center justify-center rounded-md bg-parch p-2 shadow-seal ${onClick ? 'transition hover:-translate-y-1' : ''}`}
      style={{ aspectRatio: '3/4' }}>
      <div className={`absolute inset-x-0 top-0 h-1.5 rounded-t-md ${isLib ? 'bg-order' : 'bg-wax'}`} />
      <span className={`font-display text-sm font-bold uppercase tracking-wide ${isLib ? 'text-order-deep' : 'text-wax-deep'}`}>
        {POLICY[type].name}
      </span>
      <span className={`mt-1 h-4 w-4 rounded-full ${isLib ? 'bg-order' : 'bg-wax'}`} />
      {label && <span className="absolute -bottom-6 font-mono text-[0.6rem] uppercase tracking-wider text-brass-bright">{label} ↑</span>}
    </Tag>
  );
}

// ---- game over -------------------------------------------------------------
function FinalTrack({ type, count, total }) {
  const isLib = type === 'liberal';
  return (
    <div className="flex items-center gap-2">
      <span className={`w-16 text-right font-mono text-[0.6rem] uppercase tracking-[0.2em] ${isLib ? 'text-order-bright' : 'text-wax-bright'}`}>
        {isLib ? 'Liberal' : 'Fascist'}
      </span>
      <div className="flex flex-1 gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={`h-3 flex-1 rounded-sm ${
            i < count ? (isLib ? 'bg-order' : 'bg-wax') : 'bg-black/40 ring-1 ring-inset ring-white/5'}`} />
        ))}
      </div>
      <span className="w-8 font-mono text-[0.7rem] text-parch/70">{count}/{total}</span>
    </div>
  );
}

function RevealRow({ p, isLeader, delay }) {
  const bad = p.team === 'bad';
  return (
    <motion.div
      initial={{ opacity: 0, x: bad ? 10 : -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}
      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${isLeader ? 'bg-wax-deep/50 ring-1 ring-wax/50' : 'bg-black/20'}`}>
      <WaxSeal size={24} tone={bad ? '#b0463c' : '#4f9d83'}><circle cx="0" cy="0" r="6" /></WaxSeal>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-[0.95rem]">
          {p.name}{p.alive === false && <span className="text-wax-bright/80 text-xs"> · executed</span>}
        </div>
        <div className={`text-[0.7rem] font-semibold ${bad ? 'text-wax-bright' : 'text-order-bright'}`}>
          {isLeader ? '♛ Hitler' : ROLES[p.role]?.name}
        </div>
      </div>
    </motion.div>
  );
}

function GameOver({ state, send }) {
  if (state.phase !== 'over') return null;
  const good = state.winner === 'good';
  const tone = good ? '#4f9d83' : '#b0463c';
  const loyalists = state.players.filter((p) => p.team === 'good');
  const saboteurs = state.players.filter((p) => p.team === 'bad');
  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-chamber-deep/92 backdrop-blur-md p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="panel my-auto w-full max-w-sm p-5 text-center"
        initial={{ scale: 0.9, y: 16 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 240, damping: 22 }}>
        <motion.div className="mx-auto mb-2 w-fit" initial={{ rotate: -12, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
          <WaxSeal size={64} tone={tone}><circle cx="0" cy="0" r="8" /></WaxSeal>
        </motion.div>
        <div className="eyebrow">The Council adjourns</div>
        <h2 className={`font-display text-3xl font-bold tracking-wide ${good ? 'text-order-bright' : 'text-wax-bright'}`}>
          {good ? 'Liberals Win' : 'Fascists Win'}
        </h2>

        {/* The unambiguous one-sentence explanation of HOW. */}
        <motion.p
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className={`mx-auto mt-3 max-w-[19rem] rounded-lg border px-3 py-2 text-[0.95rem] leading-snug ${
            good ? 'border-order/40 bg-order-deep/30 text-parch' : 'border-wax/40 bg-wax-deep/30 text-parch'}`}>
          {state.winReason}
        </motion.p>

        {/* Final policy track. */}
        <div className="mt-4 space-y-1.5">
          <div className="eyebrow text-left">Final track</div>
          <FinalTrack type="liberal" count={state.tracks.liberal} total={state.tracks.liberalWin} />
          <FinalTrack type="fascist" count={state.tracks.fascist} total={state.tracks.fascistWin} />
        </div>

        {/* Full reveal, grouped by faction so sides are obvious. */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-left">
          <div>
            <div className="eyebrow mb-1 text-order-bright">Liberals</div>
            <div className="space-y-1">
              {loyalists.map((p, i) => <RevealRow key={p.id} p={p} delay={0.35 + i * 0.05} />)}
            </div>
          </div>
          <div>
            <div className="eyebrow mb-1 text-wax-bright">Fascists</div>
            <div className="space-y-1">
              {saboteurs.map((p, i) => (
                <RevealRow key={p.id} p={p} isLeader={p.id === state.hitlerId} delay={0.35 + i * 0.05} />
              ))}
            </div>
          </div>
        </div>

        {state.isHost
          ? <button className="btn-brass mt-5 w-full" onClick={() => send({ t: 'restart' })}>Convene again</button>
          : <p className="mt-5 text-sm text-parch/60">Waiting for the host to convene again…</p>}
      </motion.div>
    </motion.div>
  );
}
