/**
 * Next.js Middleware
 *
 * Runs on all requests before reaching route handlers.
 * Applies:
 * - Rate limiting to API routes
 * - CORS headers (if needed)
 * - Security headers
 *
 * Note: Middleware runs on Edge Runtime, so some Node.js APIs are unavailable.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Rate limiting configuration
 */
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // requests per window

// In-memory store for edge runtime (resets on deployment)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getRateLimitKey(request: NextRequest): string {
  // Get IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  // Fallback
  return 'anonymous';
}

export function middleware(request: NextRequest) {
  // Only apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    // Skip health checks from rate limiting
    if (
      request.nextUrl.pathname === '/api/health' ||
      request.nextUrl.pathname === '/api/health/ready'
    ) {
      return NextResponse.next();
    }

    const key = getRateLimitKey(request);
    const now = Date.now();

    let entry = rateLimitMap.get(key);

    // Reset if window expired
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
      rateLimitMap.set(key, entry);
    }

    entry.count++;

    const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count);

    // Exceeded rate limit
    if (entry.count > RATE_LIMIT_MAX) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${Math.ceil((entry.resetAt - now) / 1000)} seconds.`,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': entry.resetAt.toString(),
            'Retry-After': Math.ceil((entry.resetAt - now) / 1000).toString(),
          },
        }
      );
    }

    // Add rate limit headers to response
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT_MAX.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', entry.resetAt.toString());

    return response;
  }

  return NextResponse.next();
}

/**
 * Configure which routes middleware runs on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
