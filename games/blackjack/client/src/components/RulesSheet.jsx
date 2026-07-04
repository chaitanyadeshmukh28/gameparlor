import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const RULES = [
  ['Goal', 'Beat the dealer’s hand without going over 21. First player to reach the chip Goal — or the last with chips — wins the night.'],
  ['Card values', 'Number cards are face value. J, Q, K are 10. An Ace is 11, or 1 if 11 would bust you.'],
  ['The deal', 'Ante a bet, then take two cards. The dealer takes two — one face-up, one face-down (the hole).'],
  ['Your turn', 'Hit for another card, or Stand to hold. Go over 21 and you bust — the bet is lost. Double matches your bet for exactly one more card, then stands.'],
  ['The dealer', 'Once everyone acts, the dealer reveals the hole and draws until reaching 17, then stands.'],
  ['Payouts', 'Beat the dealer to win even money. A two-card 21 (a natural blackjack) pays 3:2. A tie pushes — your bet is returned.'],
];

export function RulesButton({ label = 'How to play' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}
        className="text-xs text-gild/80 hover:text-gild underline underline-offset-4 transition">
        {label}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto no-scrollbar"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}>
            <motion.div onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.94, y: 12, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              className="panel my-auto w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-3xl gild-text">Blackjack</h2>
                <button onClick={() => setOpen(false)} className="text-moss hover:text-ivory text-xl leading-none">✕</button>
              </div>
              <dl className="space-y-3">
                {RULES.map(([term, def]) => (
                  <div key={term}>
                    <dt className="eyebrow mb-0.5">{term}</dt>
                    <dd className="text-sm text-ivory/90 leading-snug">{def}</dd>
                  </div>
                ))}
              </dl>
              <button onClick={() => setOpen(false)} className="btn-gild w-full">Deal me in</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
