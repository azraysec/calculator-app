import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 30000, // Database tests may take longer
    hookTimeout: 30000,
    pool: 'forks', // Isolate tests to prevent connection issues
    poolOptions: {
      forks: {
        singleFork: true, // Run tests sequentially to avoid DB conflicts
      },
    },
  },
});
