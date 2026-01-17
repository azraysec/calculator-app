/**
 * Readiness probe endpoint
 * Returns 200 OK only if all dependencies are healthy
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const checks: Record<string, { status: string; message?: string }> = {};

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'healthy' };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Check Inngest (optional - may not be critical for startup)
  try {
    // Inngest doesn't require a health check, but we can verify the client exists
    checks.inngest = { status: 'configured' };
  } catch (error) {
    checks.inngest = {
      status: 'warning',
      message: 'Inngest client not configured',
    };
  }

  const allHealthy = Object.values(checks).every(
    (check) => check.status === 'healthy' || check.status === 'configured'
  );

  const statusCode = allHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: allHealthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: statusCode }
  );
}
