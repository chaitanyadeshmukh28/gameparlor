import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Built into the shared root dist/sealed and served by the unified Parlor server
// under /sealed/. WebSocket upgrades go to /sealed/ws.
export default defineConfig({
  plugins: [react()],
  root: 'client',
  base: '/sealed/',
  build: { outDir: '../../../dist/sealed', emptyOutDir: true },
  server: {
    port: 5173,
    proxy: { '/sealed/ws': { target: `ws://localhost:${process.env.PORT || 3000}`, ws: true } },
  },
});
