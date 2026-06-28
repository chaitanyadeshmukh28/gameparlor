import { motion, AnimatePresence } from 'framer-motion';

export default function Rules({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-chamber-deep/80 backdrop-blur-sm" />
          <motion.div
            className="panel relative w-full max-w-md max-h-[88dvh] overflow-y-auto p-5"
            initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 16, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="nameplate text-xl">How the Council Works</h2>
              <button className="btn-ghost px-3 py-1 text-sm" onClick={onClose} aria-label="Close rules">Close</button>
            </div>

            <Section title="The two factions">
              <p><B className="text-order-bright">Liberals</B> are the majority but don’t know one another.
                <B className="text-wax-bright"> Fascists</B> are the minority and recognise each other.
                One Fascist is <B className="text-wax-bright">Hitler</B> — at 5–6 players they know their
                allies; at 7+ they sit blind among them.</p>
            </Section>

            <Section title="A round">
              <ol className="list-decimal pl-5 space-y-1">
                <li>The rotating <B>President</B> nominates a <B>Chancellor</B>.</li>
                <li>Everyone votes <B className="text-order-bright">Ja</B> or <B className="text-wax-bright">Nein</B>. A strict majority passes the slate.</li>
                <li>The President draws 3 policies and discards 1 in secret; the Chancellor enacts 1 of the remaining 2.</li>
                <li>Three failed votes in a row force the top policy through in disorder.</li>
              </ol>
            </Section>

            <Section title="Executive powers">
              <p>Each Fascist policy can hand the President a power — <B>Inspect</B> a loyalty, call a <B>Special
                Election</B>, <B>Survey</B> the deck, or <B>Execute</B> a member. Which powers, and when, scale
                with the table size.</p>
            </Section>

            <Section title="Winning">
              <ul className="list-disc pl-5 space-y-1">
                <li><B className="text-order-bright">Liberals</B> win at <B>5 Liberal</B> policies — or by executing Hitler.</li>
                <li><B className="text-wax-bright">Fascists</B> win at <B>6 Fascist</B> policies — or by electing Hitler as Chancellor once 3 Fascist policies are down.</li>
              </ul>
            </Section>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const Section = ({ title, children }) => (
  <div className="mb-4 text-[0.95rem] leading-snug text-parch/90">
    <div className="eyebrow mb-1">{title}</div>
    {children}
  </div>
);
const B = ({ children, className = '' }) => <span className={`font-semibold text-brass-bright ${className}`}>{children}</span>;
