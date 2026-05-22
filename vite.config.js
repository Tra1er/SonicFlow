import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

const realCwd = fs.realpathSync(process.cwd());

export default defineConfig({
  root: realCwd,
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: path.resolve(realCwd, 'dist'),
    emptyOutDir: true,
    sourcemap: true,
  },
});
