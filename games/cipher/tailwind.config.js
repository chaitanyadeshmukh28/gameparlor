/** @type {import('tailwindcss').Config} */
// Cipher — mid-century intelligence ops room. Ink black, brass, red vs blue.
export default {
  content: ['./client/index.html', './client/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink:     { DEFAULT: '#0b0c0f', deep: '#070809', raised: '#13151b', panel: '#171a22' },
        brass:   { DEFAULT: '#b08d4f', bright: '#d8b878', deep: '#7c6334' },
        manila:  { DEFAULT: '#cdbd9a', dim: '#9a8f76', faint: '#6a6353' },
        parch:   { DEFAULT: '#e9e3d4', dim: '#b3ab97' },
        // Team + tile palette
        red:     { DEFAULT: '#c4453f', bright: '#e2615a', deep: '#7e2420' },
        blue:    { DEFAULT: '#3f7bc4', bright: '#5b9bdf', deep: '#234d80' },
        bystander: { DEFAULT: '#b9a888', deep: '#5c5341' },
        assassin: { DEFAULT: '#d4232e', ink: '#15100f' },
      },
      fontFamily: {
        display: ['"Saira Stencil One"', 'Impact', 'sans-serif'],
        sans: ['"Barlow Semi Condensed"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        tile: '0 10px 22px -12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
        brass: '0 0 0 1px rgba(176,141,79,0.5), 0 0 22px -6px rgba(216,184,120,0.5)',
      },
      keyframes: {
        scan: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100%)' } },
        flicker: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.82 } },
        ticker: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
      },
      animation: {
        scan: 'scan 5s linear infinite',
        flicker: 'flicker 3s ease-in-out infinite',
        ticker: 'ticker 14s linear infinite',
      },
    },
  },
  plugins: [],
};
