import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Built into the shared root dist/intercept and served by the unified Parlor server
// under /intercept/. WebSocket upgrades go to /intercept/ws.
export default defineConfig({
  plugins: [react()],
  root: 'client',
  base: '/intercept/',
  build: { outDir: '../../../dist/intercept', emptyOutDir: true },
  server: {
    port: 5173,
    proxy: { '/intercept/ws': { target: `ws://localhost:${process.env.PORT || 3000}`, ws: true } },
  },
});
