/** @type {import('tailwindcss').Config} */
// Undercover — film-noir interrogation. High-contrast black & white with ONE
// neon accent: sodium-lamp AMBER (the bulb swinging over the table).
export default {
  content: ['./client/index.html', './client/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        noir: {
          black: '#08080A',
          pit:   '#0E0E12',
          coal:  '#16161B',
          ash:   '#212128',
          smoke: '#33333C',
        },
        bone:  { DEFAULT: '#ECECEF', dim: '#9A9AA4', faint: '#5C5C66' },
        amber: { DEFAULT: '#FFB020', bright: '#FFCB5C', deep: '#B9760A' },
        ink:   '#7A1414', // dark stamp-ink (used only as a printed rubber stamp)
      },
      fontFamily: {
        poster: ['Anton', 'Impact', 'sans-serif'],
        cond:   ['Oswald', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:   ['"Spline Sans Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        lamp: '0 0 60px -8px rgba(255,176,32,0.45)',
        file: '0 26px 60px -28px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      keyframes: {
        flicker: {
          '0%,100%': { opacity: 1 },
          '92%': { opacity: 1 },
          '93%': { opacity: 0.72 },
          '94%': { opacity: 1 },
          '96%': { opacity: 0.85 },
          '97%': { opacity: 1 },
        },
        sway: {
          '0%,100%': { transform: 'translateX(-50%) rotate(-1.4deg)' },
          '50%': { transform: 'translateX(-50%) rotate(1.4deg)' },
        },
        scan: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 -28px' },
        },
      },
      animation: {
        flicker: 'flicker 6s linear infinite',
        sway: 'sway 7s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
