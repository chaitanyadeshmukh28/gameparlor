/** @type {import('tailwindcss').Config} */
// Parlor — an after-hours art-deco games salon. Cool aubergine-midnight chrome,
// warm ivory type, champagne-brass deco lines. The frame stays calm so the
// rainbow of game tiles reads as a vibrant collection laid out on the table.
export default {
  content: ['./client/index.html', './client/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: { DEFAULT: '#0d0b16', deep: '#08070f' },
        salon: { DEFAULT: '#15121f', raised: '#1d1830', edge: '#2a2440' },
        ivory: { DEFAULT: '#f2e9d8', dim: '#cfc6bb' },
        mist: { DEFAULT: '#9b93b5', faint: '#6c6688' },
        brass: { DEFAULT: '#d8b878', bright: '#efd9a3', deep: '#a8854a' },
      },
      fontFamily: {
        display: ['Marcellus', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        salon: '0 30px 60px -30px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.04)',
      },
    },
  },
  plugins: [],
};
