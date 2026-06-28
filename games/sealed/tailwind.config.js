/** @type {import('tailwindcss').Config} */
// Sealed — rococo romance. Blush, rose-gold, deep plum, cream parchment.
export default {
  content: ['./client/index.html', './client/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        plum: { deep: '#170c19', DEFAULT: '#241229', raised: '#2f1936', soft: '#3c2143' },
        wine: '#5d1f3c',
        rose: { DEFAULT: '#e29ab2', deep: '#c66e8e', faint: '#b87f93' },
        blush: '#f7d6df',
        gilt: { DEFAULT: '#e3bd86', deep: '#c79a5f' },
        cream: { DEFAULT: '#f6eede', dim: '#cdbfae' },
        ink: { DEFAULT: '#3b2433', soft: '#6d4f60' },
        wax: { DEFAULT: '#b6384e', deep: '#8d2740' },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['"EB Garamond"', 'Georgia', 'serif'],
        sans: ['"EB Garamond"', 'Georgia', 'serif'],
      },
      boxShadow: {
        letter: '0 18px 40px -16px rgba(10,4,12,0.7), 0 2px 0 rgba(255,255,255,0.05) inset',
        seal: '0 6px 16px -4px rgba(141,39,64,0.75)',
      },
    },
  },
  plugins: [],
};
