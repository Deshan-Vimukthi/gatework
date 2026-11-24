import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` -> normal multi-file build (deploy to GitHub Pages etc.)
// `npm run build:single` -> one self-contained index.html
export default defineConfig({
  base: './',
  plugins: [react(), ...(process.env.SINGLE ? [viteSingleFile()] : [])],
  test: { environment: 'jsdom', globals: true },
});
