import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Built into the shared root dist/nightfall and served by the unified Parlor server
// under /nightfall/. WebSocket upgrades go to /nightfall/ws.
export default defineConfig({
  plugins: [react()],
  root: 'client',
  base: '/nightfall/',
  build: { outDir: '../../../dist/nightfall', emptyOutDir: true },
  server: {
    port: 5173,
    proxy: { '/nightfall/ws': { target: `ws://localhost:${process.env.PORT || 3000}`, ws: true } },
  },
});
