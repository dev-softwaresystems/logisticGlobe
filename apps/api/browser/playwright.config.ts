import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  expect: { timeout: 15000 },
  globalSetup: './setup.ts',
  outputDir: resolve(
    '../../artifacts/browser-results',
    process.env.BROWSER_PROJECT ?? 'all',
  ),
  reporter: [
    ['list'],
    [
      'html',
      {
        outputFolder: resolve(
          '../../artifacts/browser-report',
          process.env.BROWSER_PROJECT ?? 'all',
        ),
        open: 'never',
      },
    ],
  ],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
  ],
  webServer: [
    {
      command: 'pnpm start:prod',
      url: 'http://localhost:3001/api/v1/health',
      reuseExistingServer: false,
      timeout: 180000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command:
        'pnpm --filter @logistics-globe/web dev --host 127.0.0.1 --port 5174 --strictPort',
      cwd: resolve('../..'),
      url: 'http://localhost:5174',
      reuseExistingServer: false,
      timeout: 180000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
