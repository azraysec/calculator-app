/**
 * Next.js Middleware
 *
 * Runs on all requests before reaching route handlers.
 * Applies:
 * - Rate limiting to API routes
 * - CORS headers (if needed)
 * - Security headers
 *
 * IMPORTANT: Middleware runs on Edge Runtime, so Prisma Client is NOT available.
 *
 * Authentication Strategy:
 * - We do NOT validate sessions in middleware (Edge runtime cannot access database)
 * - Authentication is handled by API routes using withAuth wrapper (Node.js runtime)
 * - Public routes (login, health) are allowed through
 * - Protected routes rely on API route authentication
 * - Page routes check session on render (server components use full auth.ts)
 *
 * This approach avoids the JWT/database session mismatch that occurs when
 * middleware tries to validate database sessions using JWT strategy.
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

/**
 * Check if a route is public (no authentication required)
 */
function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    '/login',
    '/api/auth',
    '/api/health',
    '/auth/error',
  ];
  return publicRoutes.some((route) => pathname.startsWith(route));
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check for session cookie to determine if user might be logged in
  // We check for the database session cookie (authjs.session-token)
  const sessionToken = request.cookies.get('authjs.session-token')?.value ||
                       request.cookies.get('__Secure-authjs.session-token')?.value;

  // If no session cookie and accessing protected page route, redirect to login
  // Note: We can't validate the token here (Edge runtime), but we can check if it exists
  // Actual validation happens in API routes (withAuth) and server components (auth())
  if (!sessionToken && !pathname.startsWith('/api')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If has session cookie and trying to access login page, redirect to home
  if (sessionToken && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Apply rate limiting to API routes only
  if (pathname.startsWith('/api')) {
    // Skip health checks from rate limiting
    if (pathname === '/api/health' || pathname === '/api/health/ready') {
      return NextResponse.next();
    }

    // Skip auth routes from rate limiting (handled by NextAuth)
    if (pathname.startsWith('/api/auth')) {
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
