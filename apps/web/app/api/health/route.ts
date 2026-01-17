/**
 * Basic Health Check Endpoint
 *
 * Returns 200 OK if the application is running.
 * This is a liveness probe - it checks if the process is alive.
 *
 * Use this for:
 * - Load balancer health checks
 * - Kubernetes liveness probes
 * - Uptime monitoring
 *
 * Does NOT check:
 * - Database connectivity
 * - External service availability
 * - Application readiness
 *
 * For readiness checks, use /api/health/ready instead.
 */

export const dynamic = 'force-dynamic'; // Disable caching

export async function GET() {
  return Response.json(
    {
      status: 'ok',
      service: 'warm-intro-graph',
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
    },
    { status: 200 }
  );
}
