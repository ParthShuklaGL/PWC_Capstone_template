import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The API sends no CORS headers, so the browser must see it on the same origin as the page.
// The dev server forwards /api to the backend, and the app only ever calls relative '/api/...' URLs.
// The backend is the .NET API on 5090 unless API_URL says otherwise (for example the Java CRM on 5091), so the
// same frontend can be run against either.
// Node provides process; the project has no @types/node, so say just the part used here.
declare const process: { env: Record<string, string | undefined> };

const apiUrl = process.env.API_URL ?? 'http://localhost:5090';

export default defineConfig({
  plugins: [react()],
  server: {
    // A fixed port, so the run, test and screenshot scripts always know where the app is.
    port: 5180,
    strictPort: true,
    proxy: { '/api': { target: apiUrl, changeOrigin: true } },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
