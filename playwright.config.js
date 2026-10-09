// E2E tests run against a WordPress site with this plugin and theme active.
// Default target is the local test install; set BASE_URL to test another site
// (for example BASE_URL=https://stardewtools.net npx playwright test --grep @live).
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: process.env.BASE_URL || 'http://localhost:8089' },
});
