import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Built into the shared root dist/coup and served by the unified Parlor server
// under /coup/. WebSocket upgrades go to /coup/ws.
export default defineConfig({
  plugins: [react()],
  root: 'client',
  base: '/coup/',
  build: { outDir: '../../../dist/coup', emptyOutDir: true },
  server: {
    port: 5173,
    proxy: { '/coup/ws': { target: `ws://localhost:${process.env.PORT || 3000}`, ws: true } },
  },
});
