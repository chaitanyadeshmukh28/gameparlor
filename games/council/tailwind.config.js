/** @type {import('tailwindcss').Config} */
// The Council — a candle-lit guild chamber. Forest green felt, brass fittings,
// ivory parchment ballots, crimson wax seals.
export default {
  content: ['./client/index.html', './client/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        chamber: { DEFAULT: '#0c1611', deep: '#070d0a', raised: '#13241a', panel: '#16291d' },
        brass:   { DEFAULT: '#c9a86a', bright: '#e8d49a', dim: '#8a7440', deep: '#5c4d28' },
        parch:   { DEFAULT: '#ece3cf', dim: '#c7bda3', faint: '#8f876f' },
        wax:     { DEFAULT: '#b0463c', bright: '#cd5d50', deep: '#5f201c' },
        order:   { DEFAULT: '#4f9d83', bright: '#74c2a6', deep: '#1f3f37' },
      },
      fontFamily: {
        display: ['Cinzel', 'Georgia', 'serif'],
        body: ['"EB Garamond"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        seal: '0 6px 18px -6px rgba(0,0,0,0.7)',
        brass: '0 1px 0 rgba(255,255,255,0.25) inset, 0 10px 24px -12px rgba(201,168,106,0.7)',
      },
    },
  },
  plugins: [],
};
