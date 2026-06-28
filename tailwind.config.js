/** @type {import('tailwindcss').Config} */
export default {
  content: ['./client/index.html', './client/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        felt:    { DEFAULT: '#1c0f17', deep: '#150a11', raised: '#2a1622' },
        parch:   { DEFAULT: '#ece0c8', dim: '#b9a888', faint: '#7c6f5b' },
        gilt:    { DEFAULT: '#c9a227', bright: '#e8cd72', deep: '#8a6e1c' },
        duke:       '#8a5cc4',
        assassin:   '#cf3b4b',
        captain:    '#2f95a8',
        ambassador: '#4f9a5a',
        contessa:   '#e08236',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Spline Sans Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 18px 40px -12px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)',
        gilt: '0 0 0 1px rgba(201,162,39,0.5), 0 0 24px -4px rgba(201,162,39,0.5)',
      },
      keyframes: {
        floatIn: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        floatIn: 'floatIn .4s ease both',
        shimmer: 'shimmer 6s linear infinite',
      },
    },
  },
  plugins: [],
};
