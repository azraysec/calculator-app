import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Use single worker for consistency - parallel execution causes session race conditions
  // because setup creates a new user each run and parallel workers may read stale auth state
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Setup project - runs first to create authenticated state
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Authenticated tests - use stored auth state
    {
      name: 'chromium-authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: ['**/authentication.spec.ts', '**/auth.setup.ts'],
    },
    // Unauthenticated tests - for testing login/auth flows
    {
      name: 'chromium-unauthenticated',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/authentication.spec.ts'],
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      ...process.env,
      AUTH_SECRET: process.env.AUTH_SECRET || 'test-secret-for-local-development-only-do-not-use-in-production-a1b2c3d4e5f6',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'test-client-id.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || 'test-client-secret',
    },
  },
});
