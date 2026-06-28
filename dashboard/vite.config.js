import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Parlor portal is a static site: no WebSockets, no proxy.
// Client builds into ../dist, which the tiny Express server serves.
export default defineConfig({
  plugins: [react()],
  root: 'client',
  build: { outDir: '../dist', emptyOutDir: true },
  server: { port: 5173 },
});
