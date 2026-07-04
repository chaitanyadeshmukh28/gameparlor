/** @type {import('tailwindcss').Config} */
// Blackjack — a midnight art-deco casino. Deep emerald baize, warm gilt rails,
// ivory cards. Deliberately distinct from The Council's forest-green guild:
// here the green is a jewel-toned felt under gold, not candle-lit brass.
export default {
  content: ['./client/index.html', './client/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        felt: { deep: '#052a1f', DEFAULT: '#0a3d2c', raised: '#0e4a35', rail: '#04211a' },
        gild: { DEFAULT: '#e8c877', deep: '#c99a3f', bright: '#f6e2a6' },
        card: { face: '#f5f0e3', edge: '#d8cfb8', shadow: '#2a2416' },
        pip: { red: '#b3222a', ink: '#20232a' },
        jade: '#54c79a',
        crimson: '#c0392b',
        ivory: { DEFAULT: '#f1ead7', dim: '#c3cbb8' },
        moss: '#8ba793',
      },
      fontFamily: {
        display: ['"Poiret One"', 'ui-sans-serif', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        card: ['Georgia', '"Times New Roman"', 'serif'],
      },
      boxShadow: {
        card: '0 10px 22px -10px rgba(0,0,0,0.75), 0 1px 0 rgba(255,255,255,0.6) inset',
        chip: '0 4px 10px -2px rgba(0,0,0,0.6)',
        rail: '0 0 0 1px rgba(232,200,119,0.25), 0 18px 50px -20px rgba(0,0,0,0.9)',
      },
    },
  },
  plugins: [],
};
