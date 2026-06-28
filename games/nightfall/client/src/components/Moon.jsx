import { motion, useReducedMotion } from 'framer-motion';

// The signature element: a huge moon hanging over the village. It rides high and
// silver through the NIGHT, then warms to amber and descends toward the rooftops
// as DAWN breaks. Rendered inside a contained "sky" band so it never overlaps the
// interactive content below it.
const PHASES = {
  night:  { top: '4%',  scale: 1,    glow: 'rgba(190,198,255,0.5)',  face: ['#ffffff', '#cdd6f4', '#9fb0e8'], horizon: 'transparent' },
  day:    { top: '46%', scale: 0.82, glow: 'rgba(240,200,120,0.55)', face: ['#fff4dd', '#f0c070', '#d39a3e'], horizon: 'rgba(240,200,120,0.22)' },
  vote:   { top: '30%', scale: 0.9,  glow: 'rgba(196,73,94,0.45)',   face: ['#ffe6c4', '#e8a878', '#c4495e'], horizon: 'rgba(196,73,94,0.16)' },
  result: { top: '-12%', scale: 0.72, glow: 'rgba(190,198,255,0.4)',  face: ['#ffffff', '#cdd6f4', '#9fb0e8'], horizon: 'transparent' },
};

export default function Moon({ phase = 'night' }) {
  const reduce = useReducedMotion();
  const p = PHASES[phase] || PHASES.night;
  const spring = reduce ? { duration: 0 } : { type: 'spring', stiffness: 40, damping: 17 };

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {/* dawn glow rising from the horizon */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-1/2"
        animate={{ background: `radial-gradient(120% 90% at 50% 100%, ${p.horizon}, transparent 70%)` }}
        transition={{ duration: reduce ? 0 : 1.4 }}
      />

      {/* the moon itself */}
      <motion.div
        className="absolute left-1/2"
        style={{ x: '-50%' }}
        animate={{ top: p.top, scale: p.scale }}
        transition={spring}
      >
        <motion.div
          className="relative rounded-full"
          style={{ width: 'clamp(108px, 30vw, 150px)', height: 'clamp(108px, 30vw, 150px)' }}
          animate={{
            background: `radial-gradient(circle at 38% 34%, ${p.face[0]}, ${p.face[1]} 52%, ${p.face[2]} 100%)`,
            boxShadow: `0 0 60px 6px ${p.glow}, 0 0 130px 24px ${p.glow}`,
          }}
          transition={{ duration: reduce ? 0 : 1.4 }}
        >
          <span className="absolute rounded-full" style={{ width: '20%', height: '20%', top: '22%', left: '24%', background: 'rgba(10,14,40,0.12)' }} />
          <span className="absolute rounded-full" style={{ width: '26%', height: '26%', top: '52%', left: '54%', background: 'rgba(10,14,40,0.14)' }} />
          <span className="absolute rounded-full" style={{ width: '12%', height: '12%', top: '60%', left: '24%', background: 'rgba(10,14,40,0.10)' }} />
          <span className="absolute rounded-full" style={{ width: '10%', height: '10%', top: '28%', left: '60%', background: 'rgba(10,14,40,0.10)' }} />
        </motion.div>
      </motion.div>

      {/* a drifting wisp of cloud */}
      {!reduce && (
        <motion.div
          className="absolute left-0 right-0"
          style={{ top: '30%', height: 44, background: 'radial-gradient(60% 100% at 35% 50%, rgba(20,26,60,0.5), transparent 70%)' }}
          animate={{ x: ['-18%', '14%', '-18%'] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </div>
  );
}
