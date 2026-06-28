/** @type {import('tailwindcss').Config} */
// Intercept — a WWII signals room rendered on a phosphor CRT.
export default {
  content: ['./client/index.html', './client/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: { DEFAULT: '#04080a', deep: '#020405', panel: '#081410' },
        phosphor: { DEFAULT: '#58f7a0', bright: '#9affc6', dim: '#1f6b46', deep: '#0c2a1c' },
        signalcyan: { DEFAULT: '#3fe0d8', dim: '#176b67' },
        amber: { DEFAULT: '#ffb02e', bright: '#ffd27a', dim: '#6b4a12' },
        alert: { DEFAULT: '#ff5247', dim: '#6b1d18' },
        sheet: { DEFAULT: '#d8cda4', ink: '#1b1d12', line: '#a89f78' },
      },
      fontFamily: {
        stencil: ['"Saira Stencil One"', 'Impact', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 12px rgba(88,247,160,0.55), 0 0 2px rgba(88,247,160,0.9)',
        glowamber: '0 0 14px rgba(255,176,46,0.6), 0 0 3px rgba(255,176,46,0.9)',
        glowcyan: '0 0 12px rgba(63,224,216,0.55), 0 0 2px rgba(63,224,216,0.9)',
        glowalert: '0 0 16px rgba(255,82,71,0.7), 0 0 4px rgba(255,82,71,0.9)',
      },
      keyframes: {
        flicker: {
          '0%,100%': { opacity: '1' }, '92%': { opacity: '1' },
          '93%': { opacity: '0.78' }, '94%': { opacity: '1' }, '97%': { opacity: '0.88' },
        },
        sweep: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100%)' } },
        blink: { '0%,49%': { opacity: '1' }, '50%,100%': { opacity: '0.15' } },
      },
      animation: {
        flicker: 'flicker 6s infinite',
        sweep: 'sweep 7s linear infinite',
        blink: 'blink 1.1s step-end infinite',
      },
    },
  },
  plugins: [],
};
