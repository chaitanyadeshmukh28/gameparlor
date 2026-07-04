/** @type {import('tailwindcss').Config} */
// Blackjack — "Lacquer & Bone": a deco card room at midnight. No felt, no green.
// The table is black lacquer and champagne brass; the cards are bone card-stock
// (the brightest thing on screen); vermillion is the one hot accent — the red of
// the suits. Numbers are tabular mono, because blackjack is a game of the count.
export default {
  content: ['./client/index.html', './client/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: { DEFAULT: '#15100d', deep: '#0d0a08', soft: '#1b1410' },
        walnut: { DEFAULT: '#221a13', raised: '#2b2118' },
        brass: { DEFAULT: '#d9b26a', deep: '#a9843f', bright: '#f0d79a', dim: '#8a6d38' },
        bone: { DEFAULT: '#f1e9d6', dim: '#d6cbb2', edge: '#c8bd9f' },
        vermillion: { DEFAULT: '#ce2b37', deep: '#9c1f2a', glow: '#e8555f' },
        pip: { red: '#c1272d', ink: '#211d18' },
        sand: { DEFAULT: '#b7a98c', dim: '#7c7057' },
      },
      fontFamily: {
        display: ['"Poiret One"', 'ui-sans-serif', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        data: ['"Space Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 12px 26px -12px rgba(0,0,0,0.85), 0 1px 0 rgba(255,255,255,0.55) inset',
        chip: '0 4px 10px -2px rgba(0,0,0,0.7)',
        rail: '0 0 0 1px rgba(217,178,106,0.22), 0 22px 60px -26px rgba(0,0,0,0.95)',
        medallion: '0 0 60px -8px rgba(217,178,106,0.35)',
      },
    },
  },
  plugins: [],
};
