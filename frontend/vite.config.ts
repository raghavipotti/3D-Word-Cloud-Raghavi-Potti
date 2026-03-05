import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the React/TypeScript project.  The dev server
// exposes the app on port 5173 by default; change the `server.port`
// property if you need to run on a different port.

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
});