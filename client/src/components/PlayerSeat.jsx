import { motion } from 'framer-motion';
import Card from './Card.jsx';

export function Coins({ n }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm tabular-nums">
      <span
        className="grid place-items-center w-4 h-4 rounded-full text-[0.55rem] font-bold text-felt-deep"
        style={{ background: 'radial-gradient(circle at 35% 30%, #f4e3a8, #c9a227 70%, #8a6e1c)' }}
      >¢</span>
      <span className="text-gilt-bright">{n}</span>
    </span>
  );
}

// One opponent (or any non-self player) seated at the table.
export default function PlayerSeat({ player, isTurn, isActor, isTarget, isBlocker, targetable, onTarget, claim }) {
  const dead = player.eliminated;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: dead ? 0.5 : 1, scale: 1 }}
      onClick={() => targetable && onTarget(player.id)}
      className={`relative flex flex-col items-center gap-1.5 sm:gap-2 rounded-2xl px-2 py-2 sm:px-3 sm:py-3 transition
        ${targetable ? 'cursor-pointer ring-2 ring-assassin/50 hover:ring-assassin animate-pulse' : ''}
        ${isTurn ? 'bg-gilt/[0.07]' : 'bg-white/[0.015]'} border ${isTurn ? 'border-gilt/40' : 'border-parch/10'}`}
      style={isTurn ? { boxShadow: '0 0 30px -8px rgba(201,162,39,0.45)' } : undefined}
    >
      {/* status ribbon */}
      {(isActor || isTarget || isBlocker) && (
        <span className={`absolute -top-2 left-1/2 -translate-x-1/2 z-10 rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider
          ${isTarget ? 'bg-assassin text-white' : isBlocker ? 'bg-captain text-white' : 'bg-gilt text-felt-deep'}`}>
          {isTarget ? 'Target' : isBlocker ? 'Blocking' : 'Acting'}
        </span>
      )}

      <div className="flex items-center gap-1.5 sm:gap-2">
        <span className="grid place-items-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-felt-deep border border-parch/15 text-[0.65rem] sm:text-xs font-display font-bold">
          {player.name[0]?.toUpperCase()}
        </span>
        <div className="leading-tight">
          <div className="font-medium text-xs sm:text-sm flex items-center gap-1.5">
            {player.name}
            {!player.connected && <span className="text-[0.6rem] text-parch-faint">(away)</span>}
          </div>
          <Coins n={player.coins} />
        </div>
      </div>

      <div className="flex gap-1 sm:gap-1.5">
        {player.cards.map((card, i) => (
          <Card key={i} size="sm" char={card.char} faceUp={card.revealed} dead={card.revealed} delay={i * 0.06} />
        ))}
      </div>

      {claim && (
        <span className="text-[0.6rem] text-parch-faint">claims <span className="text-parch">{claim}</span></span>
      )}

      {dead && <span className="absolute inset-0 grid place-items-center font-display text-xs uppercase tracking-widest text-assassin/70">Eliminated</span>}
    </motion.div>
  );
}
