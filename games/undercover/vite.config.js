import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Built into the shared root dist/undercover and served by the unified Parlor server
// under /undercover/. WebSocket upgrades go to /undercover/ws.
export default defineConfig({
  plugins: [react()],
  root: 'client',
  base: '/undercover/',
  build: { outDir: '../../../dist/undercover', emptyOutDir: true },
  server: {
    port: 5173,
    proxy: { '/undercover/ws': { target: `ws://localhost:${process.env.PORT || 3000}`, ws: true } },
  },
});
