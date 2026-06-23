import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  // some transitive deps of @dbml/core reference these node globals
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['@dbml/core', 'lz-string'],
  },
  build: {
    chunkSizeWarningLimit: 12000,
  },
});
