import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Built into the shared root dist/quest and served by the unified Parlor server
// under /quest/. WebSocket upgrades go to /quest/ws.
export default defineConfig({
  plugins: [react()],
  root: 'client',
  base: '/quest/',
  build: { outDir: '../../../dist/quest', emptyOutDir: true },
  server: {
    port: 5173,
    proxy: { '/quest/ws': { target: `ws://localhost:${process.env.PORT || 3000}`, ws: true } },
  },
});
