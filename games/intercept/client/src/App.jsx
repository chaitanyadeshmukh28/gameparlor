// Intercept — a WWII signals/codebreaking duel. Server is authoritative; this
// renders the per-player view it broadcasts and sends intents via send({t,...}).
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useGameSocket } from './net.js';

/* ------------------------------------------------------------------ helpers */
const TRACE = {
  green: { text: 'text-phosphor', border: 'border-phosphor/50', ring: 'ring-phosphor',
    glow: 'shadow-glow', bg: 'bg-phosphor/10', dot: 'bg-phosphor', soft: 'text-phosphor/70', raw: '#58f7a0' },
  cyan: { text: 'text-signalcyan', border: 'border-signalcyan/50', ring: 'ring-signalcyan',
    glow: 'shadow-glowcyan', bg: 'bg-signalcyan/10', dot: 'bg-signalcyan', soft: 'text-signalcyan/70', raw: '#3fe0d8' },
};
const tc = (trace) => TRACE[trace] || TRACE.green;

function Crt() {
  return (<><div className="crt-overlay animate-flicker" /><div className="crt-vignette" /></>);
}

function Label({ children, className = '' }) {
  return <div className={`font-mono text-[10px] uppercase tracking-[0.35em] text-phosphor/45 ${className}`}>{children}</div>;
}

/* ------------------------------------------------------------------- screens */
export default function App() {
  const { status, state, you, code, error, create, join, send } = useGameSocket();
  return (
    <div className="relative min-h-[100dvh] text-[#c8f7dd] selection:bg-phosphor/30">
      <Crt />
      {!state || !you
        ? <Landing onCreate={create} onJoin={join} status={status} error={error} />
        : state.phase === 'lobby'
          ? <Lobby state={state} code={code} you={you} send={send} error={error} />
          : <Game state={state} you={you} send={send} error={error} />}
    </div>
  );
}

/* ----------------------------------------------------------------- Landing */
function Landing({ onCreate, onJoin, status, error }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('create');
  const ready = name.trim() && (mode === 'create' || code.length === 4);
  return (
    <div className="relative z-10 min-h-[100dvh] grid place-items-center p-5">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-md border border-phosphor/25 bg-void/70 backdrop-blur-sm p-6 shadow-glow">
        <div className="text-center mb-5">
          <Label className="mb-2">— Field Signals Section —</Label>
          <h1 className="font-stencil text-5xl text-phosphor glow-text text-stroke tracking-wider">INTERCEPT</h1>
          <Oscilloscope />
          <p className="font-mono text-xs text-phosphor/55 mt-2">A duel of codes &amp; interception.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {['create', 'join'].map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`rounded-sm py-2 font-mono text-xs uppercase tracking-widest border transition
              ${mode === m ? 'border-phosphor text-phosphor bg-phosphor/10 shadow-glow' : 'border-phosphor/20 text-phosphor/50'}`}>
              {m === 'create' ? 'New Station' : 'Join Station'}
            </button>
          ))}
        </div>
        <input value={name} maxLength={16} onChange={(e) => setName(e.target.value)} placeholder="OPERATOR NAME"
          className="w-full rounded-sm bg-black/50 border border-phosphor/25 px-3 py-2.5 font-mono text-phosphor placeholder:text-phosphor/30 mb-2 uppercase tracking-wider" />
        {mode === 'join' && (
          <input value={code} maxLength={4} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="CODE" className="w-full rounded-sm bg-black/50 border border-phosphor/25 px-3 py-2.5 font-mono text-2xl text-center tracking-[0.5em] text-amber mb-2" />
        )}
        <button disabled={!ready}
          onClick={() => (mode === 'create' ? onCreate(name.trim()) : onJoin(name.trim(), code))}
          className="w-full rounded-sm bg-phosphor text-void font-mono font-bold uppercase tracking-widest py-2.5 mt-1 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-phosphor-bright transition shadow-glow">
          {mode === 'create' ? 'Open Channel' : 'Tune In'}
        </button>
        <p className="font-mono text-[11px] text-phosphor/40 mt-3 text-center h-4">
          {status === 'open' ? '● LINK ESTABLISHED' : '○ acquiring link…'}{error ? `  ·  ${error.message}` : ''}
        </p>
      </motion.div>
    </div>
  );
}

function Oscilloscope() {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 220 34" className="w-full h-9 mt-3" aria-hidden="true">
      <motion.path d="M0 17 Q 14 17 18 17 T 30 6 T 42 28 T 54 17 70 17 T 86 4 T 100 30 T 116 17 150 17 T 166 9 T 182 25 T 198 17 220 17"
        fill="none" stroke="#58f7a0" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 0 4px #58f7a0)' }}
        initial={{ pathLength: 0 }} animate={reduce ? { pathLength: 1 } : { pathLength: [0, 1] }}
        transition={reduce ? {} : { duration: 2.4, repeat: Infinity, ease: 'linear' }} />
    </svg>
  );
}

/* ------------------------------------------------------------------- Lobby */
function Lobby({ state, code, you, send, error }) {
  const watches = ['A', 'B'];
  const meTeam = state.yourTeam;
  return (
    <div className="relative z-10 min-h-[100dvh] flex flex-col items-center p-5 max-w-md mx-auto">
      <Label className="mt-2">Station Frequency</Label>
      <div className="font-stencil text-5xl text-amber glow-text tracking-[0.3em] mb-1">{code}</div>
      <p className="font-mono text-xs text-phosphor/50 mb-4">Share this code · choose a watch · need 2+ per watch</p>

      <div className="grid grid-cols-2 gap-3 w-full mb-4">
        {watches.map((t) => {
          const team = state.teams[t]; const c = tc(team.trace);
          const mine = meTeam === t;
          return (
            <button key={t} onClick={() => send({ t: 'team', team: t })}
              className={`rounded-md border p-3 text-left transition ${mine ? `${c.border} ${c.bg} ${c.glow}` : 'border-white/10 bg-black/30'}`}>
              <div className={`font-stencil text-lg ${c.text} glow-text`}>{team.name}</div>
              <Label className="mt-0.5">{team.players.length} operator{team.players.length === 1 ? '' : 's'}</Label>
              <ul className="mt-2 space-y-1 min-h-[44px]">
                {team.players.map((p) => (
                  <li key={p.id} className={`flex items-center gap-1.5 font-mono text-sm ${p.id === you ? c.text : 'text-white/70'}`}>
                    <span className="truncate">{p.id === you ? '▸ ' : '· '}{p.name}{p.id === you ? ' (you)' : ''}</span>
                    {p.isBot && <span className={`shrink-0 font-mono text-[9px] uppercase tracking-widest border rounded-sm px-1 py-0.5 ${c.border} ${c.text}`}>AI</span>}
                    {p.isBot && state.isHost && (
                      <span role="button" tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); send({ t: 'removeBot', id: p.id }); }}
                        title="Remove AI player"
                        className="shrink-0 ml-auto cursor-pointer text-white/40 hover:text-alert transition">✕</span>
                    )}
                  </li>
                ))}
              </ul>
              <div className={`mt-2 font-mono text-[10px] uppercase tracking-widest ${mine ? c.text : 'text-phosphor/40'}`}>
                {mine ? '✓ assigned here' : 'tap to switch'}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-auto w-full">
        {error && <p className="font-mono text-xs text-alert text-center mb-2">{error.message}</p>}
        {state.isHost
          ? <div className="space-y-2">
              {state.players.length < state.maxPlayers && (
                <button onClick={() => send({ t: 'addBot' })}
                  className="w-full rounded-sm border border-phosphor/30 text-phosphor/80 font-mono text-xs uppercase tracking-widest py-2.5 hover:bg-phosphor/10 hover:text-phosphor transition">
                  + Add AI player
                </button>
              )}
              <button onClick={() => send({ t: 'start' })}
                className="w-full rounded-sm bg-phosphor text-void font-mono font-bold uppercase tracking-widest py-3 shadow-glow hover:bg-phosphor-bright transition">
                Begin Transmission
              </button>
            </div>
          : <p className="font-mono text-sm text-phosphor/50 text-center py-3">Awaiting host to begin…</p>}
        <p className="font-mono text-[10px] text-phosphor/35 text-center mt-2">4–8 players · two watches</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- Game */
function Game({ state, you, send, error }) {
  const [showRules, setShowRules] = useState(false);
  const [showIntel, setShowIntel] = useState(false);
  const myTeam = state.yourTeam;
  const enemyTeam = myTeam === 'A' ? 'B' : 'A';

  return (
    <div className="relative z-10 h-[100dvh] flex flex-col max-w-md mx-auto">
      <TopBar state={state} onRules={() => setShowRules(true)} onIntel={() => setShowIntel(true)} />

      <div className="flex-1 overflow-y-auto thin-scroll px-4 pb-3">
        {error && <ErrorFlash error={error} />}
        {state.phase === 'encrypt' && <EncryptPhase state={state} you={you} send={send} />}
        {state.phase === 'guess' && <GuessPhase state={state} you={you} send={send} />}
      </div>

      <AnimatePresence>
        {(state.phase === 'reveal' || state.phase === 'over') &&
          <RevealOverlay key="reveal" state={state} myTeam={myTeam} enemyTeam={enemyTeam} send={send} />}
      </AnimatePresence>

      <AnimatePresence>
        {showRules && <RulesModal onClose={() => setShowRules(false)} />}
        {showIntel && <IntelModal state={state} myTeam={myTeam} enemyTeam={enemyTeam} onClose={() => setShowIntel(false)} />}
      </AnimatePresence>
    </div>
  );
}

function TopBar({ state, onRules, onIntel }) {
  return (
    <div className="shrink-0 px-4 pt-3 pb-2 border-b border-phosphor/15">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-stencil text-xl text-phosphor glow-text tracking-wider">INTERCEPT</span>
          <span className="font-mono text-[10px] text-amber uppercase tracking-widest">TX {state.roundNo}/{state.maxRounds}</span>
        </div>
        <div className="flex gap-1.5">
          <IconBtn label="Intel" onClick={onIntel}>▤</IconBtn>
          <IconBtn label="Rules" onClick={onRules}>?</IconBtn>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {['A', 'B'].map((t) => <Scoreboard key={t} team={state.teams[t]} mine={state.yourTeam === t} />)}
      </div>
    </div>
  );
}

function IconBtn({ children, label, onClick }) {
  return (
    <button onClick={onClick} aria-label={label}
      className="w-8 h-8 grid place-items-center rounded-sm border border-phosphor/30 text-phosphor/80 font-mono text-sm hover:bg-phosphor/10 hover:text-phosphor transition">
      {children}
    </button>
  );
}

function Scoreboard({ team, mine }) {
  const c = tc(team.trace);
  return (
    <div className={`rounded-sm border px-2 py-1.5 ${mine ? `${c.border} ${c.bg}` : 'border-white/10 bg-black/20'}`}>
      <div className="flex items-center justify-between">
        <span className={`font-stencil text-xs ${c.text} glow-text truncate`}>{team.name}{mine ? ' ◂' : ''}</span>
      </div>
      <div className="flex items-center gap-3 mt-1">
        <Lamps label="INT" n={team.interceptions} color="amber" />
        <Lamps label="MIS" n={team.miscommunications} color="alert" />
      </div>
    </div>
  );
}

function Lamps({ label, n, color }) {
  const on = color === 'amber' ? 'bg-amber shadow-glowamber' : 'bg-alert shadow-glowalert';
  return (
    <div className="flex items-center gap-1">
      <span className="font-mono text-[9px] text-white/40 tracking-widest">{label}</span>
      {[0, 1].map((i) => (
        <span key={i} className={`w-2.5 h-2.5 rounded-full border ${i < n ? `${on} border-transparent` : 'bg-black/40 border-white/15'}`} />
      ))}
    </div>
  );
}

function ErrorFlash({ error }) {
  return (
    <motion.div key={error.at} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      className="my-2 rounded-sm border border-alert/60 bg-alert/10 px-3 py-2 font-mono text-xs text-alert">
      ⚠ {error.message}
    </motion.div>
  );
}

/* --------------------------------------------------------- Encrypt phase */
function EncryptPhase({ state, you, send }) {
  const myTeam = state.yourTeam;
  const team = state.teams[myTeam];
  const isEncryptor = state.yourRole === 'encryptor';
  const encryptorName = team.players.find((p) => p.isEncryptor)?.name;

  return (
    <div className="py-3 space-y-3">
      <PhaseHeader title="TRANSMISSION" sub={isEncryptor ? 'You are the Encryptor — turn the code into clues' : `${encryptorName} (Encryptor) is sending your clues`} />
      {isEncryptor
        ? <EncryptorConsole state={state} send={send} />
        : <WaitPanel state={state} note="Watch the wire. When both Encryptors transmit, decoding begins." />}
      <TransmitStatus state={state} />
    </div>
  );
}

function EncryptorConsole({ state, send }) {
  const myTeam = state.yourTeam;
  const keywords = state.teams[myTeam].keywords || [];
  const code = state.yourCode || [];
  const sent = state.teams[myTeam].cluesIn;
  const [clues, setClues] = useState(['', '', '']);
  const set = (i, v) => setClues((cs) => cs.map((c, j) => (j === i ? v.slice(0, 28) : c)));
  const ready = clues.every((c) => c.trim());

  if (sent) return <WaitPanel state={state} note="Clues transmitted. Awaiting the other watch…" />;

  return (
    <div className="rounded-md border border-amber/40 bg-amber/[0.04] p-3 shadow-glowamber">
      <div className="flex items-center justify-between mb-2">
        <Label className="!text-amber/70">▦ Encryptor · Secret Code — Eyes Only</Label>
        <span className="font-mono text-[10px] text-amber/60 animate-blink">● LIVE</span>
      </div>
      <div className="space-y-2">
        {code.map((slot, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <NixieDigit value={slot} delay={i * 0.12} />
            <div className="w-24 shrink-0">
              <Label className="!text-amber/50">slot {slot}</Label>
              <div className="font-mono text-sm text-amber glow-text truncate">{keywords[slot - 1]}</div>
            </div>
            <input value={clues[i]} onChange={(e) => set(i, e.target.value)} placeholder={`clue ${i + 1}`}
              className="flex-1 min-w-0 rounded-sm bg-black/50 border border-amber/30 px-2 py-2 font-mono text-sm text-phosphor focus:border-amber" />
          </div>
        ))}
      </div>
      <button disabled={!ready} onClick={() => send({ t: 'clues', clues })}
        className="w-full mt-3 rounded-sm bg-amber text-void font-mono font-bold uppercase tracking-widest py-2.5 disabled:opacity-30 hover:bg-amber-bright transition shadow-glowamber">
        ⟱ Transmit Clues
      </button>
      <p className="font-mono text-[10px] text-amber/50 mt-2 leading-relaxed">
        Hint your own keyword for each slot — but not so plainly the enemy reads your code.
      </p>
    </div>
  );
}

function NixieDigit({ value, delay = 0 }) {
  const reduce = useReducedMotion();
  return (
    <motion.div initial={reduce ? false : { rotateX: -90, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 16 }}
      className="w-10 h-12 shrink-0 grid place-items-center rounded-sm border border-amber/50 bg-black/60 font-stencil text-3xl text-amber glow-text shadow-glowamber">
      {value}
    </motion.div>
  );
}

function TransmitStatus({ state }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {['A', 'B'].map((t) => {
        const team = state.teams[t]; const c = tc(team.trace);
        return (
          <div key={t} className={`rounded-sm border px-2.5 py-2 ${team.cluesIn ? `${c.border} ${c.bg}` : 'border-white/10 bg-black/20'}`}>
            <div className={`font-mono text-[11px] ${c.text}`}>{team.name}</div>
            <div className="font-mono text-[10px] text-white/50 mt-0.5">
              {team.cluesIn ? '✓ transmitted' : '… encrypting'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------- Guess phase */
function GuessPhase({ state, you, send }) {
  const myTeam = state.yourTeam;
  const enemyTeam = myTeam === 'A' ? 'B' : 'A';
  const mine = state.teams[myTeam];
  const enemy = state.teams[enemyTeam];
  const g = state.yourGuesses || {};

  return (
    <div className="py-3 space-y-3">
      <PhaseHeader title="DECODE &amp; INTERCEPT" sub="Read your own code · steal the enemy's" />

      {/* Your own decode */}
      <GuessCard
        title={`Decode ${mine.name}`} subtitle="Match each clue to your keyword slot"
        clues={mine.clues} accent={tc(mine.trace)} slotLabels={mine.keywords}
        submitted={g.decode} canAct={state.canDecode}
        disabledNote={state.yourRole === 'encryptor' ? 'You sent these clues — your watch decodes.' : 'Submitted.'}
        onSubmit={(guess) => send({ t: 'guess', kind: 'decode', guess })}
      />

      {/* Intercept the enemy */}
      {state.interceptNeeded
        ? <GuessCard
            title={`Intercept ${enemy.name}`} subtitle="Crack their code from clues + history"
            clues={enemy.clues} accent={tc(enemy.trace)} slotLabels={null} intercept
            submitted={g.intercept} canAct={state.canIntercept}
            disabledNote="Submitted."
            onSubmit={(guess) => send({ t: 'guess', kind: 'intercept', guess })}
          />
        : <div className="rounded-md border border-white/10 bg-black/20 p-3">
            <Label>Interception</Label>
            <p className="font-mono text-xs text-phosphor/50 mt-1">No interception in round 1 — there's no history to read yet. Recording clues only.</p>
          </div>}
    </div>
  );
}

function GuessCard({ title, subtitle, clues, accent, slotLabels, submitted, canAct, disabledNote, onSubmit, intercept }) {
  const [seq, setSeq] = useState([]);
  const locked = !!submitted || !canAct;
  const display = submitted || seq;

  return (
    <div className={`rounded-md border p-3 ${intercept ? 'border-amber/40 bg-amber/[0.04]' : `${accent.border} ${accent.bg}`}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`font-stencil text-base ${intercept ? 'text-amber' : accent.text} glow-text`}>{title}</div>
        {submitted && <span className="font-mono text-[10px] text-phosphor/70">✓ locked</span>}
      </div>
      <Label className="mb-2">{subtitle}</Label>

      <div className="space-y-1.5 mb-2">
        {(clues || ['—', '—', '—']).map((clue, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-white/40 w-9">CL{i + 1}</span>
            <span className="flex-1 font-mono text-sm text-phosphor truncate">“{clue}”</span>
            <span className={`w-8 h-8 grid place-items-center rounded-sm border font-stencil text-lg
              ${display[i] ? `${intercept ? 'border-amber text-amber' : `${accent.border} ${accent.text}`} glow-text` : 'border-white/15 text-white/25'}`}>
              {display[i] || '–'}
            </span>
          </div>
        ))}
      </div>

      {!locked && (
        <>
          <div className="grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map((slot) => {
              const used = seq.includes(slot);
              return (
                <button key={slot}
                  onClick={() => setSeq(used ? seq.filter((s) => s !== slot) : seq.length < 3 ? [...seq, slot] : seq)}
                  className={`rounded-sm border py-2 font-mono text-xs transition leading-tight
                  ${used ? `${intercept ? 'border-amber bg-amber/15 text-amber' : `${accent.border} ${accent.bg} ${accent.text}`}` : 'border-white/15 text-white/60 hover:border-white/40'}`}>
                  <div className="font-stencil text-base">{slot}</div>
                  {slotLabels && <div className="text-[9px] truncate px-0.5 opacity-80">{slotLabels[slot - 1]}</div>}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setSeq([])} disabled={!seq.length}
              className="rounded-sm border border-white/15 px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-white/60 disabled:opacity-30">Clear</button>
            <button onClick={() => onSubmit(seq)} disabled={seq.length !== 3}
              className={`flex-1 rounded-sm py-2 font-mono font-bold uppercase tracking-widest text-void disabled:opacity-30 transition
              ${intercept ? 'bg-amber hover:bg-amber-bright shadow-glowamber' : 'bg-phosphor hover:bg-phosphor-bright shadow-glow'}`}>
              {intercept ? '⊕ Lock Interception' : '⊕ Lock Decode'}
            </button>
          </div>
        </>
      )}
      {locked && <p className="font-mono text-[11px] text-phosphor/50">{submitted ? 'Waiting for the table…' : disabledNote}</p>}
    </div>
  );
}

/* --------------------------------------------------------- shared panels */
function PhaseHeader({ title, sub }) {
  return (
    <div className="text-center">
      <h2 className="font-stencil text-2xl text-phosphor glow-text tracking-wide" dangerouslySetInnerHTML={{ __html: title }} />
      <p className="font-mono text-[11px] text-phosphor/50 mt-0.5">{sub}</p>
    </div>
  );
}

function WaitPanel({ state, note }) {
  const myTeam = state.yourTeam;
  const keywords = state.teams[myTeam].keywords || [];
  return (
    <div className="rounded-md border border-phosphor/25 bg-void/50 p-3">
      <Label className="mb-2">Your watch keywords — keep them secret</Label>
      <div className="grid grid-cols-2 gap-1.5">
        {keywords.map((w, i) => (
          <div key={i} className="sheet-paper rounded-sm px-2 py-1.5 flex items-center gap-2">
            <span className="font-stencil text-base text-sheet-ink">{i + 1}</span>
            <span className="font-mono text-sm text-sheet-ink truncate">{w}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className="w-2 h-2 rounded-full bg-phosphor animate-blink" />
        <p className="font-mono text-xs text-phosphor/60">{note}</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------- Reveal overlay */
function RevealOverlay({ state, myTeam, enemyTeam, send }) {
  const r = state.lastResult;
  const reduce = useReducedMotion();
  if (!r) return null;
  const over = state.phase === 'over';
  if (over) return <FinalScreen state={state} myTeam={myTeam} send={send} reduce={reduce} />;

  const anyIntercept = r.A.intercepted || r.B.intercepted;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 bg-void/92 backdrop-blur-sm flex flex-col">
      <div className="flex-1 overflow-y-auto thin-scroll px-4 py-5 max-w-md mx-auto w-full">
        {anyIntercept && <InterceptAlert />}
        <h2 className="font-stencil text-3xl text-phosphor glow-text text-center tracking-wide mb-1">
          ROUND {r.round} DECRYPTED
        </h2>
        <div className="space-y-3 mt-4">
          {['A', 'B'].map((t) => (
            <RevealCard key={t} team={state.teams[t]} res={r[t]} gained={r.gained[t]} mine={myTeam === t} delay={t === 'A' ? 0.1 : 0.3} reduce={reduce} />
          ))}
        </div>
      </div>
      <div className="shrink-0 p-4 max-w-md mx-auto w-full">
        <button onClick={() => send({ t: 'continue' })}
          className="w-full rounded-sm bg-phosphor text-void font-mono font-bold uppercase tracking-widest py-3 shadow-glow hover:bg-phosphor-bright transition">
          ▸ Next Transmission
        </button>
      </div>
    </motion.div>
  );
}

/* ---------------------------------------------------- Final result screen */
function FinalScreen({ state, myTeam, send, reduce }) {
  const winner = state.winner;
  const reason = state.outcome?.reason || '';
  const draw = winner === 'draw';
  const won = !draw && winner === myTeam;
  const wc = draw ? null : tc(state.teams[winner].trace);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 bg-void/95 backdrop-blur-sm flex flex-col">
      <div className="flex-1 overflow-y-auto thin-scroll px-4 py-5 max-w-md mx-auto w-full">
        <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-phosphor/45 text-center">— transmission ends —</div>

        {/* 1. WINNER, unmistakable */}
        <motion.div initial={reduce ? false : { scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 14 }} className="text-center mt-2">
          {draw
            ? <div className="font-stencil text-3xl text-amber glow-text tracking-wide">SIGNAL LOST · DRAW</div>
            : <>
                <div className={`font-stencil text-4xl ${wc.text} glow-text tracking-wide leading-none`}>{state.teams[winner].name}</div>
                <div className={`font-stencil text-2xl ${wc.text} glow-text tracking-[0.3em] mt-1`}>WINS</div>
              </>}
          {!draw && (
            <div className={`inline-block mt-2 px-3 py-0.5 rounded-sm border font-mono text-xs uppercase tracking-widest ${won ? 'border-phosphor text-phosphor' : 'border-alert text-alert'}`}>
              {won ? '✓ your watch' : '✗ your watch fell'}
            </div>
          )}
        </motion.div>

        {/* 2. WHY, one plain sentence */}
        <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="mt-4 rounded-md border border-amber/40 bg-amber/[0.06] px-3 py-2.5">
          <Label className="!text-amber/70 mb-1">Why</Label>
          <p className="font-mono text-sm text-phosphor leading-snug">{reason}</p>
        </motion.div>

        {/* 3. FULL REVEAL: both watches' keywords + token counts */}
        <Label className="mt-5 mb-2 text-center">Decrypted — both watches' keywords</Label>
        <div className="space-y-3">
          {['A', 'B'].map((t, i) => (
            <TeamFinalCard key={t} team={state.teams[t]} mine={myTeam === t} winner={winner} delay={0.35 + i * 0.15} reduce={reduce} />
          ))}
        </div>
      </div>

      <div className="shrink-0 p-4 max-w-md mx-auto w-full">
        {state.isHost
          ? <button onClick={() => send({ t: 'restart' })}
              className="w-full rounded-sm bg-phosphor text-void font-mono font-bold uppercase tracking-widest py-3 shadow-glow hover:bg-phosphor-bright transition">
              ↺ New Duel
            </button>
          : <p className="text-center font-mono text-sm text-phosphor/50 py-3">Waiting for the host to start a new duel…</p>}
      </div>
    </motion.div>
  );
}

function TeamFinalCard({ team, mine, winner, delay, reduce }) {
  const c = tc(team.trace);
  const isWinner = winner === team.id;
  const keywords = team.keywords || [];
  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className={`rounded-md border p-3 ${isWinner ? `${c.border} ${c.bg} ${c.glow}` : 'border-white/12 bg-black/25'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`font-stencil text-base ${c.text} glow-text`}>
          {isWinner && '★ '}{team.name}{mine ? ' ◂ you' : ''}
        </span>
        <div className="flex items-center gap-3">
          <TokenCount label="INT" n={team.interceptions} color="amber" />
          <TokenCount label="MIS" n={team.miscommunications} color="alert" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {keywords.map((w, i) => (
          <motion.div key={i} initial={reduce ? false : { opacity: 0, rotateX: -60 }} animate={{ opacity: 1, rotateX: 0 }}
            transition={{ delay: delay + 0.15 + i * 0.08 }}
            className="sheet-paper rounded-sm px-2 py-1.5 flex items-center gap-2">
            <span className="font-stencil text-base text-sheet-ink">{i + 1}</span>
            <span className="font-mono text-sm text-sheet-ink truncate">{w}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function TokenCount({ label, n, color }) {
  const on = color === 'amber' ? 'bg-amber shadow-glowamber' : 'bg-alert shadow-glowalert';
  const txt = color === 'amber' ? 'text-amber' : 'text-alert';
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[9px] text-white/40 tracking-widest">{label}</span>
      <div className="flex gap-0.5">
        {[0, 1].map((i) => (
          <span key={i} className={`w-2.5 h-2.5 rounded-full border ${i < n ? `${on} border-transparent` : 'bg-black/40 border-white/15'}`} />
        ))}
      </div>
      <span className={`font-stencil text-sm ${n > 0 ? txt : 'text-white/30'}`}>{n}</span>
    </div>
  );
}

function InterceptAlert() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: 0 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-sm border-2 border-amber bg-amber/15 py-2.5 mb-3 shadow-glowamber">
      <div className="relative z-10 text-center font-stencil text-xl text-amber glow-text tracking-[0.3em]">⚡ INTERCEPTED ⚡</div>
      {!reduce && <motion.div className="absolute inset-y-0 w-24 bg-amber/25 blur-xl"
        initial={{ left: '-30%' }} animate={{ left: '120%' }} transition={{ duration: 1, repeat: 1 }} />}
    </motion.div>
  );
}

function RevealCard({ team, res, gained, mine, delay, reduce }) {
  const c = tc(team.trace);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className={`rounded-md border p-3 ${c.border} ${c.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`font-stencil text-base ${c.text} glow-text`}>{team.name}{mine ? ' ◂ you' : ''}</span>
        <div className="flex gap-1.5">
          {gained.int > 0 && <Badge color="amber">+{gained.int} INTERCEPT</Badge>}
          {gained.mis > 0 && <Badge color="alert">+{gained.mis} GARBLED</Badge>}
          {gained.int === 0 && gained.mis === 0 && <span className="font-mono text-[10px] text-white/35">clean</span>}
        </div>
      </div>
      <div className="space-y-1">
        {res.clues.map((clue, i) => (
          <div key={i} className="flex items-center gap-2">
            <motion.span initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ delay: delay + 0.2 + i * 0.1, type: 'spring' }}
              className={`w-7 h-7 grid place-items-center rounded-sm border ${c.border} ${c.text} font-stencil text-base glow-text`}>{res.code[i]}</motion.span>
            <span className="flex-1 font-mono text-sm text-phosphor/90 truncate">“{clue}”</span>
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-2 font-mono text-[11px]">
        <span className={res.decodeOk ? 'text-phosphor' : 'text-alert'}>
          {res.decodeOk ? '✓ self-decode ok' : '✗ miscommunication'}
        </span>
        <span className={res.intercepted ? 'text-amber' : 'text-white/40'}>
          {res.intercepted ? '⚡ enemy intercepted' : '· not intercepted'}
        </span>
      </div>
    </motion.div>
  );
}

function Badge({ children, color }) {
  const cls = color === 'amber' ? 'border-amber text-amber shadow-glowamber' : 'border-alert text-alert shadow-glowalert';
  return <span className={`font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm border ${cls}`}>{children}</span>;
}

/* ---------------------------------------------------------------- Intel modal */
function IntelModal({ state, myTeam, enemyTeam, onClose }) {
  return (
    <Modal onClose={onClose} title="Intercept Log">
      <p className="font-mono text-[11px] text-phosphor/50 mb-3">Every clue ever transmitted, filed under the slot it really meant. Your deduction board.</p>
      {[myTeam, enemyTeam].map((t) => {
        const team = state.teams[t]; const c = tc(team.trace); const mine = t === myTeam;
        return (
          <div key={t} className="mb-4">
            <div className={`font-stencil text-base ${c.text} glow-text mb-2`}>{team.name}{mine ? ' ◂ you' : ' · enemy'}</div>
            <div className="grid grid-cols-1 gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-2 rounded-sm border border-white/10 bg-black/30 px-2 py-1.5">
                  <span className={`w-7 h-7 shrink-0 grid place-items-center rounded-sm border ${c.border} ${c.text} font-stencil text-base`}>{i + 1}</span>
                  <div className="min-w-0">
                    {mine && <div className="font-mono text-sm text-amber glow-text">{team.keywords?.[i]}</div>}
                    <div className="font-mono text-[11px] text-phosphor/70 break-words">
                      {team.board[i].length ? team.board[i].map((e) => `“${e.clue}”`).join('  ·  ') : <span className="text-white/30">no clues yet</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </Modal>
  );
}

/* ---------------------------------------------------------------- Rules modal */
function RulesModal({ onClose }) {
  return (
    <Modal onClose={onClose} title="Field Manual">
      <ol className="space-y-2.5 font-mono text-xs text-phosphor/80 leading-relaxed list-none">
        {[
          ['Two watches', 'Each team holds 4 secret keywords in numbered slots (1–4). Only your watch sees them.'],
          ['Encrypt', "Each round your watch's Encryptor gets a secret 3-digit code (e.g. 4-2-1) and gives one clue per digit about that slot's keyword — subtle, not obvious."],
          ['Decode', 'Your own watch (the decoders) must read your Encryptor’s clues back into the code. Miss it → a Miscommunication token.'],
          ['Intercept', 'From round 2, you also guess the enemy’s code from their clues + the Intercept Log. Nail it → an Interception token.'],
          ['Win', '2 Interception tokens win the duel. 2 Miscommunication tokens lose it. After 8 rounds, most interceptions wins.'],
          ['Tip', 'Vary how you hint a keyword each round, or the enemy will map your slots and read every code.'],
        ].map(([h, b], i) => (
          <li key={i} className="border-l-2 border-phosphor/30 pl-2.5">
            <div className="text-phosphor font-bold uppercase tracking-widest text-[11px]">{i + 1}. {h}</div>
            <div className="text-phosphor/60">{b}</div>
          </li>
        ))}
      </ol>
    </Modal>
  );
}

function Modal({ children, title, onClose }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} className="absolute inset-0 z-50 bg-void/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
      <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[82dvh] overflow-y-auto thin-scroll rounded-md border border-phosphor/30 bg-void/95 p-4 shadow-glow">
        <div className="flex items-center justify-between mb-3 sticky top-0">
          <h3 className="font-stencil text-xl text-phosphor glow-text tracking-wide">{title}</h3>
          <button onClick={onClose} aria-label="Close"
            className="w-8 h-8 grid place-items-center rounded-sm border border-phosphor/30 text-phosphor hover:bg-phosphor/10">✕</button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
