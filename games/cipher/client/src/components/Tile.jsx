import { motion } from 'framer-motion';
import { Emblem } from './Emblem.jsx';
import { TILE } from '../meta.js';

// A single dossier card in the 5x5 grid.
// - Operatives see a manila card with the codeword until it's revealed.
// - Spymasters additionally see the secret key as a colored edge + corner pip.
// - On reveal the card flips to its colored agent face (assassin = TERMINATED).
export default function Tile({ tile, isSpymaster, selectable, onSelect, delay = 0 }) {
  const { word, revealed, type } = tile;
  const known = TILE[type]; // type is null for operatives on hidden tiles
  const flipped = revealed;

  // The face shown when the card is flipped open (revealed identity).
  const faceColor = known?.hex ?? '#b9a888';
  const isAssassin = type === 'assassin';

  return (
    <motion.button
      type="button"
      disabled={!selectable}
      onClick={onSelect}
      aria-label={revealed ? `${word}, ${known?.label ?? 'revealed'}` : `Codeword ${word}`}
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 24 }}
      whileHover={selectable ? { y: -3 } : undefined}
      whileTap={selectable ? { scale: 0.97 } : undefined}
      className={`group relative preserve-3d aspect-[7/5] w-full select-none rounded-[5px] ${
        selectable ? 'cursor-pointer' : 'cursor-default'
      }`}
      style={{ boxShadow: selectable ? '0 0 0 1px rgba(216,184,120,0.45)' : undefined }}
    >
      <motion.div
        className="absolute inset-0 preserve-3d"
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      >
        {/* FRONT — manila codeword card (key tint added for spymasters) */}
        <div
          className="absolute inset-0 backface-hidden rounded-[5px] tile-paper border flex items-center justify-center px-1 overflow-hidden"
          style={{
            borderColor: isSpymaster && known ? (isAssassin ? '#000' : known.hex) : 'rgba(90,72,40,0.5)',
            boxShadow: isSpymaster && isAssassin
              ? 'inset 0 0 0 3px #000'
              : isSpymaster && known ? `inset 0 0 0 2px ${known.hex}aa` : 'inset 0 0 0 1px rgba(255,255,255,0.25)',
            background: isSpymaster && isAssassin
              ? 'repeating-linear-gradient(45deg,#0b0b0d 0 8px,#17171b 8px 16px)'
              : undefined,
          }}
        >
          {/* Spymaster key: a corner pip in the tile's true color. */}
          {isSpymaster && known && (
            <span
              className="absolute top-0 left-0 h-0 w-0"
              style={{ borderTop: `14px solid ${known.hex}`, borderRight: '14px solid transparent' }}
              aria-hidden
            />
          )}
          {isSpymaster && isAssassin && (
            <>
              <span className="absolute top-1 left-1 text-white/95 drop-shadow" aria-hidden>
                <Emblem type="assassin" className="w-4 h-4" />
              </span>
              <span className="absolute bottom-0.5 left-0 right-0 text-center stencil text-[0.4rem] tracking-[0.2em] text-white/70" aria-hidden>
                ASSASSIN
              </span>
            </>
          )}
          <span
            className="font-sans font-semibold uppercase tracking-tight text-center leading-none text-[clamp(0.5rem,2.4vw,0.8rem)]"
            style={{ color: isSpymaster && isAssassin ? '#f4e3e3' : '#3a2f18' }}
          >
            {word}
          </span>
        </div>

        {/* BACK — revealed identity face */}
        <div
          className="absolute inset-0 backface-hidden rounded-[5px] border flex flex-col items-center justify-center gap-0.5 overflow-hidden"
          style={{
            transform: 'rotateY(180deg)',
            background: isAssassin
              ? 'repeating-linear-gradient(45deg,#0b0b0d 0 8px,#17171b 8px 16px)'
              : `linear-gradient(160deg, ${faceColor}f0, ${faceColor}b0)`,
            borderColor: isAssassin ? '#000' : `${faceColor}`,
            color: isAssassin ? '#f0dada' : known?.ink ?? '#1a1408',
          }}
        >
          <Emblem type={type} className="w-[34%] h-[34%] opacity-90" />
          <span className="font-sans font-bold uppercase leading-none text-[clamp(0.44rem,2.1vw,0.72rem)] opacity-95">
            {word}
          </span>
          {isAssassin && (
            <span className="stencil text-[0.42rem] tracking-[0.18em] text-assassin">TERMINATED</span>
          )}
        </div>
      </motion.div>
    </motion.button>
  );
}
