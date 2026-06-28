import { useState } from 'react';
import { motion } from 'framer-motion';
import { Fingerprint } from './noir.jsx';

// THE SIGNATURE ELEMENT. A sealed case file that flips open to reveal your
// secret. Agents read a stamped dossier (location + cover role). The undercover
// gets the same file with everything blacked out and one damning stamp.
export default function Dossier({ state }) {
  const spy = state.youAreSpy;
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full max-w-[22rem] mx-auto [perspective:1400px]">
      <motion.div
        className="relative w-full aspect-[1.45/1] preserve-3d cursor-pointer"
        initial={{ rotateY: 180 }}
        animate={{ rotateY: open ? 0 : 180 }}
        transition={{ type: 'spring', stiffness: 140, damping: 20 }}
        onClick={() => setOpen((o) => !o)}
        role="button" tabIndex={0}
        aria-label={open ? 'Hide your dossier' : 'Reveal your dossier'}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpen((o) => !o))}
      >
        {/* ── FRONT: the open dossier ─────────────────────────────────── */}
        <div
          className="absolute inset-0 backface-hidden rounded-[5px] border p-4 flex flex-col overflow-hidden"
          style={{
            background: 'linear-gradient(160deg,#1a1a1f,#101014 70%)',
            borderColor: spy ? 'rgba(255,176,32,0.5)' : 'rgba(236,236,239,0.16)',
            boxShadow: spy ? '0 0 50px -10px rgba(255,176,32,0.45), inset 0 1px 0 rgba(255,255,255,0.04)'
                           : '0 26px 60px -28px #000, inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* venetian-blind light raked across the file */}
          <div className="absolute inset-0 pointer-events-none opacity-30"
            style={{ background: 'repeating-linear-gradient(10deg, transparent 0 14px, rgba(0,0,0,0.6) 14px 22px)',
                     maskImage: 'radial-gradient(120% 90% at 70% 0%, #000 20%, transparent 75%)' }} />

          <div className="relative flex items-center justify-between">
            <span className="eyebrow">Case file № {String(state.round).padStart(2, '0')}</span>
            <span className="font-mono text-[0.55rem] tracking-[0.2em] text-amber/70 border border-amber/40 rounded-[2px] px-1.5 py-0.5">
              CONFIDENTIAL
            </span>
          </div>

          <div className="relative flex-1 flex flex-col justify-center gap-3 mt-2">
            <Field label="Location">
              {spy ? <Redacted w="80%" /> : <span className="font-poster text-2xl sm:text-[1.7rem] text-bone leading-none">{state.location}</span>}
            </Field>
            <Field label="Your role">
              {spy ? <Redacted w="55%" /> : <span className="font-cond font-semibold uppercase tracking-[0.1em] text-amber text-lg">{state.yourRole}</span>}
            </Field>
          </div>

          {spy ? (
            <div className="relative flex items-center justify-between">
              <span className="font-mono text-[0.6rem] text-amber/90">You are the Spy.</span>
              <span className="stamp rubber text-amber text-base">Spy</span>
            </div>
          ) : (
            <div className="relative flex items-center gap-2 text-[0.7rem] text-bone-faint">
              <Fingerprint className="w-4 h-4 text-amber/50" />
              <span>{state.firstAskerName} asks first. Don't name the place.</span>
            </div>
          )}
        </div>

        {/* ── BACK: the sealed folder ─────────────────────────────────── */}
        <div
          className="absolute inset-0 backface-hidden rounded-[5px] border border-bone/15 grid place-items-center"
          style={{ transform: 'rotateY(180deg)', background: 'linear-gradient(160deg,#141418,#0b0b0e)' }}
        >
          <div className="absolute inset-0 opacity-25 pointer-events-none"
            style={{ background: 'repeating-linear-gradient(45deg, rgba(255,176,32,0.06) 0 8px, transparent 8px 16px)' }} />
          <div className="text-center px-4">
            <Fingerprint className="w-10 h-10 mx-auto text-amber/70 mb-2" />
            <div className="stamp text-xl text-bone">Sealed file</div>
            <div className="eyebrow mt-1.5 animate-pulse">Tap to read — keep it hidden</div>
          </div>
        </div>
      </motion.div>

      <p className="text-center eyebrow mt-3 text-bone-faint">
        {open ? 'Tap the file to hide it again' : 'Only you can open this'}
      </p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="relative border-l-2 border-amber/40 pl-3">
      <div className="eyebrow !tracking-[0.28em] mb-1">{label}</div>
      <div className="min-h-[1.8rem] flex items-center">{children}</div>
    </div>
  );
}

function Redacted({ w = '70%' }) {
  return <span className="redact inline-block h-6 rounded-[1px]" style={{ width: w }}>REDACTED</span>;
}
