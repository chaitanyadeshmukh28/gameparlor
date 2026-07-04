import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Built into the shared root dist/blackjack and served by the unified Parlor
// server under /blackjack/. WebSocket upgrades go to /blackjack/ws.
export default defineConfig({
  plugins: [react()],
  root: 'client',
  base: '/blackjack/',
  build: { outDir: '../../../dist/blackjack', emptyOutDir: true },
  server: {
    port: 5173,
    proxy: { '/blackjack/ws': { target: `ws://localhost:${process.env.PORT || 3000}`, ws: true } },
  },
});
