// The signature element: the round track of five quest seals + the rejection
// counter. Seals fill gold (success) or crimson (fail) as the realm's fate turns.
import { motion } from 'framer-motion';
import { QuestSeal } from './Crest.jsx';

export default function QuestTrack({ results = [], questIndex = 0, teamSizes = [], needed, n }) {
  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-1 px-1">
        {[0, 1, 2, 3, 4].map((i) => {
          const res = results[i]; // 'success' | 'fail' | undefined
          const isCurrent = i === questIndex && !res;
          const state = res ? res : isCurrent ? 'current' : 'pending';
          const twoFail = teamSizes && i === 3 && n >= 7;
          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <motion.div
                initial={false}
                animate={state === 'current' ? { y: [0, -3, 0] } : { y: 0 }}
                transition={{ duration: 2.2, repeat: state === 'current' ? Infinity : 0, ease: 'easeInOut' }}
              >
                <motion.div
                  key={state}
                  initial={res ? { rotateY: 90, scale: 0.7 } : false}
                  animate={{ rotateY: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 16 }}
                >
                  <QuestSeal index={i} state={state} double={twoFail} size={44} />
                </motion.div>
              </motion.div>
              <span className={`text-[9px] font-display tracking-widest ${isCurrent ? 'text-gold-bright' : 'text-parch/40'}`}>
                {teamSizes[i] ?? '–'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Five-lamp rejection track — when all five light crimson, the realm falls.
export function RejectTrack({ count = 0 }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`${count} of 5 rejections`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          initial={false}
          animate={{
            backgroundColor: i < count ? '#d23a4f' : 'rgba(255,255,255,0.08)',
            boxShadow: i < count ? '0 0 8px rgba(210,58,79,0.8)' : '0 0 0 rgba(0,0,0,0)',
            scale: i < count && i === count - 1 ? [1.4, 1] : 1,
          }}
          transition={{ duration: 0.35 }}
          className="h-2 w-2 rounded-full border border-crimson/40"
        />
      ))}
    </div>
  );
}
