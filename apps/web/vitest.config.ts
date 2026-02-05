import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test-setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/e2e/**',
      '**/*.spec.ts', // Playwright tests
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['app/api/**/*.ts', 'lib/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/node_modules/**',
        '**/.next/**',
        '**/dist/**',
        'e2e/**',
        // Initialization/config files that are tested via integration tests
        'lib/auth.ts',
        'lib/prisma.ts',
        // Export-only route files
        'app/api/auth/[...nextauth]/route.ts',
        'app/api/inngest/route.ts',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/components': path.resolve(__dirname, './components'),
      '@/contexts': path.resolve(__dirname, './contexts'),
      '@/lib': path.resolve(__dirname, './lib'),
    },
  },
});
