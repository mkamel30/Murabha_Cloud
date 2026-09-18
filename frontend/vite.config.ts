import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

import packageJson from '../package.json';

export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.versionLabel || 'v' + packageJson.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 2436,
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://127.0.0.1:3008',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
}));
