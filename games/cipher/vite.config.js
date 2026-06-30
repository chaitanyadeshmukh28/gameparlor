import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Built into the shared root dist/cipher and served by the unified Parlor server
// under /cipher/. WebSocket upgrades go to /cipher/ws.
export default defineConfig({
  plugins: [react()],
  root: 'client',
  base: '/cipher/',
  build: { outDir: '../../../dist/cipher', emptyOutDir: true },
  server: {
    port: 5173,
    proxy: { '/cipher/ws': { target: `ws://localhost:${process.env.PORT || 3000}`, ws: true } },
  },
});
