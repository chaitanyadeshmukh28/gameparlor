import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Timer from './Timer.jsx';
import Dossier from './Dossier.jsx';
import Suspects from './Suspects.jsx';
import VotePanel from './VotePanel.jsx';
import SpyGuess from './SpyGuess.jsx';
import RoundOver from './RoundOver.jsx';
import { RulesButton } from './Rules.jsx';
import { Toast } from './noir.jsx';

export default function Room({ state, code, send, error }) {
  const [accuseMode, setAccuseMode] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);

  // Drop out of accuse-mode whenever the phase changes under us.
  useEffect(() => { setAccuseMode(false); }, [state.phase]);

  const accuse = (target) => { send({ t: 'callVote', target }); setAccuseMode(false); };

  return (
    <div className="relative z-10 h-[100dvh] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-bone/10">
        <div className="flex items-baseline gap-2.5">
          <span className="stamp text-xl text-bone">UNDER<span className="amber-text">COVER</span></span>
          <span className="font-mono text-[0.65rem] tracking-[0.25em] text-bone-faint">{code}</span>
        </div>
        <div className="flex items-center gap-2">
          <RulesButton />
          <button className="btn-line !py-1.5 !px-3 text-xs" onClick={() => send({ t: 'leave' })}>Leave</button>
        </div>
      </header>

      <main className="flex-1 min-h-0 w-full max-w-md mx-auto flex flex-col px-3 py-2.5 gap-2.5 overflow-y-auto">
        <Timer state={state} />
        <Suspects state={state} accuseMode={accuseMode} onPick={accuse} />

        {/* Center: your dossier (hidden for the spy while they're picking). */}
        {!(state.phase === 'spyGuess' && state.youAreSpy) && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="min-h-full grid place-items-center py-2">
              <Dossier state={state} />
            </div>
          </div>
        )}

        {/* Contextual dock */}
        <div className="shrink-0">
          <AnimatePresence mode="wait">
            {state.phase === 'play' && (
              <motion.div key="play" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Transcript state={state} send={send} />
                {accuseMode ? (
                  <div className="panel p-3 text-center">
                    <p className="font-cond text-sm text-amber mb-2">Tap the suspect you accuse of being the spy.</p>
                    <button className="btn-line w-full !py-2 text-xs" onClick={() => setAccuseMode(false)}>Cancel</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="btn-ghost"
                      disabled={!state.canAccuse}
                      onClick={() => setAccuseMode(true)}
                      title={state.canAccuse ? '' : 'You already called a vote this round.'}
                    >
                      Call a vote
                    </button>
                    {state.youAreSpy ? (
                      <button className="btn-amber" onClick={() => send({ t: 'declare' })}>Break cover</button>
                    ) : (
                      <button className="btn-line" onClick={() => setBoardOpen(true)}>Case board</button>
                    )}
                  </div>
                )}
                {state.youAreSpy && !accuseMode && (
                  <button className="btn-line w-full mt-2 !py-2 text-xs" onClick={() => setBoardOpen(true)}>Study the case board</button>
                )}
              </motion.div>
            )}

            {state.phase === 'vote' && (
              <motion.div key="vote" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <VotePanel state={state} send={send} />
              </motion.div>
            )}

            {state.phase === 'spyGuess' && (
              <motion.div key="guess" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <SpyGuess state={state} send={send} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>{boardOpen && <CaseBoard state={state} onClose={() => setBoardOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{state.phase === 'roundOver' && <RoundOver state={state} send={send} />}</AnimatePresence>
      <Toast error={error} />
    </div>
  );
}

// The interrogation transcript: recent case-log chatter (bots trade templated
// questions and answers here; humans can chime in too).
function Transcript({ state, send }) {
  const [text, setText] = useState('');
  const scroller = useRef(null);
  const lines = (state.log || []).slice(-6);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [state.log?.length]);

  const submit = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    send({ t: 'say', text: t });
    setText('');
  };

  return (
    <div className="panel p-2.5 mb-2">
      <p className="eyebrow mb-1.5">Interrogation log</p>
      <div ref={scroller} className="max-h-20 overflow-y-auto pr-1 space-y-0.5 mb-2">
        {lines.length === 0 ? (
          <p className="text-xs text-bone-faint italic">The room is quiet. Start asking around…</p>
        ) : (
          lines.map((l, i) => (
            <p key={i} className="font-cond text-[0.78rem] leading-snug text-bone-dim">{l.text}</p>
          ))
        )}
      </div>
      <form onSubmit={submit} className="flex gap-1.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={140}
          placeholder="Ask a question…"
          className="field !py-1.5 !px-2.5 text-sm flex-1"
        />
        <button type="submit" className="btn-line !py-1.5 !px-3 text-xs shrink-0" disabled={!text.trim()}>Say</button>
      </form>
    </div>
  );
}

// Public reference of every possible location. Agents cross suspects of places
// off as they reason; the undercover studies it for a guess. Strikes are local.
function CaseBoard({ state, onClose }) {
  const [struck, setStruck] = useState(() => new Set());
  const toggle = (i) => setStruck((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      className="fixed inset-0 z-[85] grid place-items-center bg-noir-black/85 backdrop-blur-sm p-4"
      role="dialog" aria-modal="true" aria-label="Case board"
    >
      <motion.div
        initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
        className="panel w-full max-w-md max-h-[86dvh] flex flex-col p-5"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="eyebrow mb-1">All known locations</p>
            <h2 className="stamp text-xl text-bone">Case board</h2>
          </div>
          <button onClick={onClose} aria-label="Close case board"
            className="grid place-items-center w-8 h-8 rounded-full border border-bone/20 text-bone-dim hover:text-bone hover:border-amber/50">✕</button>
        </div>
        <p className="text-xs text-bone-faint mb-3">
          {state.youAreSpy ? 'Study the board — you’ll name one to break cover.' : 'Tap to cross a place off as you rule it out.'}
        </p>
        <div className="grid grid-cols-2 gap-1.5 overflow-y-auto pr-1">
          {state.board.map((name, i) => (
            <button
              key={name}
              onClick={() => toggle(i)}
              className={`text-left rounded-[3px] border px-2.5 py-2 font-cond text-[0.78rem] leading-tight transition ${
                struck.has(i) ? 'border-bone/5 bg-transparent text-bone-faint line-through' : 'border-bone/12 bg-noir-black/40 text-bone-dim hover:text-bone'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
