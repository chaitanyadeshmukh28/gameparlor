import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: client on 5173, server on PORT (default 3001) — proxy /ws to it.
export default defineConfig({
  plugins: [react()],
  root: 'client',
  build: { outDir: '../dist', emptyOutDir: true },
  server: {
    port: 5173,
    proxy: { '/ws': { target: `ws://localhost:${process.env.PORT || 3001}`, ws: true } },
  },
});
