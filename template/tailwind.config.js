/** @type {import('tailwindcss').Config} */
// OVERRIDE these tokens with your game's identity (palette, fonts, signature).
export default {
  content: ['./client/index.html', './client/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#11131a', deep: '#0a0b10', raised: '#1b1e29' },
        accent: { DEFAULT: '#6c8cff', bright: '#9fb4ff' },
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
