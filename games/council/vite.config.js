import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Built into the shared root dist/council and served by the unified Parlor server
// under /council/. WebSocket upgrades go to /council/ws.
export default defineConfig({
  plugins: [react()],
  root: 'client',
  base: '/council/',
  build: { outDir: '../../../dist/council', emptyOutDir: true },
  server: {
    port: 5173,
    proxy: { '/council/ws': { target: `ws://localhost:${process.env.PORT || 3000}`, ws: true } },
  },
});
