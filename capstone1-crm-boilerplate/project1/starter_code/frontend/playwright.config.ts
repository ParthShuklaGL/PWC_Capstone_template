import { defineConfig } from '@playwright/test';

// End-to-end specs and the screenshot tour. They run against the real
// stack, so start the API first (see README.md) and let Playwright start the UI.
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
