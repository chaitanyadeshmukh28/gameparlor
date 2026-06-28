/** @type {import('tailwindcss').Config} */
// Quest — Arthurian heraldry. Steel blue, crimson, gold leaf, stone, parchment.
export default {
  content: ['./client/index.html', './client/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // steel-blue night
        steel: { DEFAULT: '#1d2b4a', deep: '#0d1424', mid: '#243a63', edge: '#37527f' },
        // gold leaf — the realm / illumination / leader
        gold: { DEFAULT: '#c9a23f', bright: '#e8c766', deep: '#8a6d22' },
        // crimson — the shadow / fail / evil
        crimson: { DEFAULT: '#9e1b32', bright: '#d23a4f', deep: '#5e0f1d' },
        // parchment surfaces
        parch: { DEFAULT: '#e8dfc8', dim: '#cbc1a6', shade: '#b3a988' },
        stone: { DEFAULT: '#6f7689', dim: '#3a4258' },
      },
      fontFamily: {
        display: ['Cinzel', 'Georgia', 'serif'],
        body: ['"EB Garamond"', 'Georgia', 'serif'],
        sans: ['"EB Garamond"', 'Georgia', 'serif'],
      },
      boxShadow: {
        seal: '0 6px 18px -4px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12)',
        leaf: '0 0 0 1px rgba(201,162,63,0.5), 0 8px 24px -8px rgba(201,162,63,0.45)',
      },
    },
  },
  plugins: [],
};
