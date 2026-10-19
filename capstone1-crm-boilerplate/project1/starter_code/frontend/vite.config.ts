import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The dev server proxies /api to the ASP.NET Core backend so the browser sees one
// origin and we never have to think about CORS in development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5080',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
