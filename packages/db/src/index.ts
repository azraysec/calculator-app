/**
 * Prisma Client Export for WIG Database
 *
 * Implements singleton pattern to prevent multiple client instances in development.
 * Configures appropriate logging based on environment.
 */

import { PrismaClient } from '@prisma/client';

// Extend global type to store Prisma instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma Client instance with environment-aware configuration.
 *
 * Development: Logs queries, errors, and warnings for debugging
 * Production: Only logs errors to minimize overhead
 * Test: Minimal logging to keep test output clean
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : process.env.NODE_ENV === 'test'
        ? ['error']
        : ['error'],
    errorFormat: 'pretty',
  });

// Store singleton in global scope to prevent hot-reload issues in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Export Prisma types for use in application code
export * from '@prisma/client';

/**
 * Graceful shutdown helper
 * Call this when your application is shutting down to properly close DB connections
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Health check helper
 * Returns true if database connection is healthy
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
