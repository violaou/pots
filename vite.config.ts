import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: '.',
  publicDir: './src/assets',
  optimizeDeps: {
  },
  resolve: {
    alias: {
      '/@src': path.resolve(__dirname, '/./src'),
      '/@assets': path.resolve(__dirname, '/./src/assets')
    }
  },
    build: {
    outDir: './dist'
  }
});