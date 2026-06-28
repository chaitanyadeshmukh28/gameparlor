/** @type {import('tailwindcss').Config} */
// Nightfall — a nocturnal village under a huge moon. Indigo & silver, gothic.
export default {
  content: ['./client/index.html', './client/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        night: {
          abyss: '#070b18',   // deepest sky
          DEFAULT: '#0e1430', // base night
          raised: '#161d44',  // raised panels
          edge: '#222a5c',    // hairlines
        },
        moon: {
          DEFAULT: '#eef1fb', // moonlight (primary text)
          dim: '#aab4d8',     // muted silver
          faint: '#6f79a6',   // faintest silver
        },
        frost: { DEFAULT: '#8ea2ff', bright: '#b9c6ff' }, // periwinkle accent
        blood: { DEFAULT: '#c4495e', bright: '#e06b7e' }, // wolves / death
        lantern: { DEFAULT: '#f0c070', bright: '#ffd98a' }, // dawn / day
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        moon: '0 0 60px -5px rgba(190,198,255,0.45), 0 0 140px 10px rgba(142,162,255,0.18)',
      },
    },
  },
  plugins: [],
};
