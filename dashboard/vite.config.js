import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Parlor portal (dashboard) builds into the shared root dist/ and is
// served at / by the unified server. Game tiles link to /<slug>.
export default defineConfig({
  plugins: [react()],
  root: 'client',
  base: '/',
  build: { outDir: '../../dist', emptyOutDir: true },
  server: { port: 5173 },
});
