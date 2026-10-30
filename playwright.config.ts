import { defineConfig, devices } from '@playwright/test';

// Browser checks run against an already running app (design D14); no webServer block.
export default defineConfig({
  testDir: 'e2e',
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    headless: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
