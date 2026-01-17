/**
 * Rate limiting utility using Upstash Redis or in-memory fallback
 */

export interface RateLimitConfig {
  limit: number; // Maximum requests
  window: number; // Time window in seconds
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // Unix timestamp when the limit resets
  limit: number;
}

/**
 * In-memory rate limiter (for development/fallback)
 * Note: This is not suitable for production with multiple instances
 */
class InMemoryRateLimiter {
  private store: Map<
    string,
    {
      count: number;
      resetAt: number;
    }
  > = new Map();

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = config.window * 1000;

    let entry = this.store.get(key);

    // Reset if window expired
    if (!entry || now >= entry.resetAt) {
      entry = {
        count: 0,
        resetAt: now + windowMs,
      };
      this.store.set(key, entry);
    }

    // Check if limit exceeded
    if (entry.count >= config.limit) {
      return {
        success: false,
        remaining: 0,
        reset: entry.resetAt,
        limit: config.limit,
      };
    }

    // Increment count
    entry.count++;

    return {
      success: true,
      remaining: config.limit - entry.count,
      reset: entry.resetAt,
      limit: config.limit,
    };
  }

  // Cleanup expired entries (call periodically)
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

// Singleton instance
const inMemoryLimiter = new InMemoryRateLimiter();

// Cleanup every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => inMemoryLimiter.cleanup(), 5 * 60 * 1000);
}

/**
 * Rate limit a request
 * Currently uses in-memory limiter, can be upgraded to Upstash Redis
 */
export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 100, window: 60 }
): Promise<RateLimitResult> {
  // TODO: If UPSTASH_REDIS_REST_URL is set, use Upstash
  // For now, use in-memory limiter
  return inMemoryLimiter.check(identifier, config);
}

/**
 * Get rate limit identifier from request
 */
export function getRateLimitIdentifier(request: Request): string {
  // Try to get IP from headers
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

  // Could also include user ID if authenticated
  // const userId = await getUserId(request);
  // return userId ? `user:${userId}` : `ip:${ip}`;

  return `ip:${ip}`;
}

/**
 * Apply rate limit headers to response
 */
export function addRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult
): Headers {
  const newHeaders = new Headers(headers);
  newHeaders.set('X-RateLimit-Limit', result.limit.toString());
  newHeaders.set('X-RateLimit-Remaining', result.remaining.toString());
  newHeaders.set('X-RateLimit-Reset', result.reset.toString());
  return newHeaders;
}
