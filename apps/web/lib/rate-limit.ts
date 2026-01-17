/**
 * Rate Limiting Middleware
 *
 * Implements token bucket algorithm for rate limiting API requests.
 * MVP: In-memory rate limiting (resets on deployment)
 * Production: Should use Upstash Redis or Vercel KV for persistence
 *
 * Configuration:
 * - 100 requests per minute per IP (configurable via env)
 * - Returns 429 Too Many Requests when limit exceeded
 * - Includes rate limit headers in response
 *
 * Usage:
 * ```typescript
 * import { rateLimit } from '@/lib/rate-limit';
 *
 * export async function GET(request: Request) {
 *   const rateLimitResult = await rateLimit(request);
 *   if (!rateLimitResult.success) {
 *     return rateLimitResult.response;
 *   }
 *
 *   // Process request...
 * }
 * ```
 */

import { NextResponse } from 'next/server';

// Configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const RATE_LIMIT_MAX_REQUESTS = parseInt(
  process.env.RATE_LIMIT_MAX_REQUESTS || '100',
  10
);

// In-memory store (resets on deployment)
// TODO: Replace with Upstash Redis for production
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries (runs periodically to prevent memory leaks)
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}

/**
 * Extract client identifier from request
 * Priority: API key > IP address > fallback
 */
function getClientIdentifier(request: Request): string {
  // Check for API key in Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return `api:${authHeader.substring(7, 20)}`; // Use first 13 chars of token
  }

  // Get IP address from various headers (for proxied requests)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return `ip:${forwardedFor.split(',')[0].trim()}`;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return `ip:${realIp}`;
  }

  // Fallback to "anonymous" for local development
  return 'ip:anonymous';
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  response?: Response;
}

/**
 * Apply rate limiting to a request
 *
 * @param request - The incoming request
 * @param options - Optional configuration overrides
 * @returns Rate limit result with success flag and response
 */
export async function rateLimit(
  request: Request,
  options?: {
    maxRequests?: number;
    windowMs?: number;
  }
): Promise<RateLimitResult> {
  const maxRequests = options?.maxRequests || RATE_LIMIT_MAX_REQUESTS;
  const windowMs = options?.windowMs || RATE_LIMIT_WINDOW;

  const clientId = getClientIdentifier(request);
  const now = Date.now();

  // Get or create rate limit entry
  let entry = rateLimitStore.get(clientId);

  // Reset if window expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(clientId, entry);
  }

  // Increment request count
  entry.count++;

  const remaining = Math.max(0, maxRequests - entry.count);
  const resetInSeconds = Math.ceil((entry.resetAt - now) / 1000);

  // Check if limit exceeded
  if (entry.count > maxRequests) {
    const response = NextResponse.json(
      {
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${resetInSeconds} seconds.`,
        limit: maxRequests,
        remaining: 0,
        reset: entry.resetAt,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': entry.resetAt.toString(),
          'Retry-After': resetInSeconds.toString(),
        },
      }
    );

    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: entry.resetAt,
      response,
    };
  }

  // Success - return rate limit info
  return {
    success: true,
    limit: maxRequests,
    remaining,
    reset: entry.resetAt,
  };
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.reset.toString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Higher-order function to wrap route handlers with rate limiting
 *
 * @example
 * ```typescript
 * export const GET = withRateLimit(async (request: Request) => {
 *   return Response.json({ data: 'success' });
 * });
 * ```
 */
export function withRateLimit(
  handler: (request: Request) => Promise<Response>,
  options?: {
    maxRequests?: number;
    windowMs?: number;
  }
) {
  return async (request: Request): Promise<Response> => {
    const result = await rateLimit(request, options);

    if (!result.success) {
      return result.response!;
    }

    const response = await handler(request);
    return addRateLimitHeaders(response, result);
  };
}
