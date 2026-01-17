/**
 * Readiness Health Check Endpoint
 *
 * Returns 200 OK if the application is ready to serve requests.
 * This includes checking:
 * - Database connectivity
 * - Critical dependencies
 *
 * Use this for:
 * - Kubernetes readiness probes
 * - Load balancer traffic management
 * - Deployment verification
 *
 * Returns 503 Service Unavailable if any check fails.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Disable caching

/**
 * Check database connectivity
 * Returns true if DB is reachable, false otherwise
 */
async function checkDatabase(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
  try {
    // TODO: Implement actual database check with Prisma
    // const start = Date.now();
    // await prisma.$queryRaw`SELECT 1`;
    // const latency = Date.now() - start;
    // return { healthy: true, latency };

    // Placeholder: Always healthy for now
    return { healthy: true, latency: 0 };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

/**
 * Check Inngest connectivity (optional)
 * Returns true if Inngest is configured, false otherwise
 */
function checkInngest(): { healthy: boolean; configured: boolean } {
  const configured = !!(
    process.env.INNGEST_EVENT_KEY &&
    process.env.INNGEST_SIGNING_KEY
  );

  return {
    healthy: true, // Inngest failure shouldn't block readiness
    configured,
  };
}

export async function GET() {
  const start = Date.now();

  // Run all health checks in parallel
  const [dbCheck, inngestCheck] = await Promise.all([
    checkDatabase(),
    Promise.resolve(checkInngest()),
  ]);

  const totalLatency = Date.now() - start;
  const isHealthy = dbCheck.healthy; // Add more checks here as needed

  const response = {
    status: isHealthy ? 'ready' : 'not-ready',
    service: 'warm-intro-graph',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
    checks: {
      database: {
        status: dbCheck.healthy ? 'healthy' : 'unhealthy',
        latency: dbCheck.latency,
        error: dbCheck.error,
      },
      inngest: {
        status: inngestCheck.healthy ? 'healthy' : 'unhealthy',
        configured: inngestCheck.configured,
      },
    },
    latency: {
      total: totalLatency,
      unit: 'ms',
    },
  };

  return NextResponse.json(
    response,
    { status: isHealthy ? 200 : 503 }
  );
}
