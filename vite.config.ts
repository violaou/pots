import react from '@vitejs/plugin-react';
import path from 'path'
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  root: '.',
  publicDir: './public',
  optimizeDeps: {},
  resolve: {
    alias: {
      '/@src': path.resolve(__dirname, '/./src'),
      '/@assets': path.resolve(__dirname, '/./src/assets')
    }
  },
  build: {
    outDir: './dist'
  },
})