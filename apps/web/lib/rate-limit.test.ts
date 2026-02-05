/**
 * Tests for rate limiting functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimit, getRateLimitIdentifier, addRateLimitHeaders } from './rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    // Reset the in-memory store between tests by waiting for window to reset
    vi.useFakeTimers();
  });

  it('should allow requests within the limit', async () => {
    const identifier = `test-${Date.now()}-allow`;
    const config = { limit: 5, window: 60 };

    const result = await rateLimit(identifier, config);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.limit).toBe(5);
  });

  it('should track remaining requests correctly', async () => {
    const identifier = `test-${Date.now()}-track`;
    const config = { limit: 3, window: 60 };

    const result1 = await rateLimit(identifier, config);
    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(2);

    const result2 = await rateLimit(identifier, config);
    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(1);

    const result3 = await rateLimit(identifier, config);
    expect(result3.success).toBe(true);
    expect(result3.remaining).toBe(0);
  });

  it('should block requests when limit is exceeded', async () => {
    const identifier = `test-${Date.now()}-block`;
    const config = { limit: 2, window: 60 };

    await rateLimit(identifier, config);
    await rateLimit(identifier, config);

    const result = await rateLimit(identifier, config);

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should reset after window expires', async () => {
    const identifier = `test-${Date.now()}-reset`;
    const config = { limit: 1, window: 1 }; // 1 second window

    const result1 = await rateLimit(identifier, config);
    expect(result1.success).toBe(true);

    const result2 = await rateLimit(identifier, config);
    expect(result2.success).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(1500);

    const result3 = await rateLimit(identifier, config);
    expect(result3.success).toBe(true);
  });

  it('should use default config if not provided', async () => {
    const identifier = `test-${Date.now()}-default`;

    const result = await rateLimit(identifier);

    expect(result.success).toBe(true);
    expect(result.limit).toBe(100); // Default limit
  });

  it('should return reset timestamp', async () => {
    const identifier = `test-${Date.now()}-timestamp`;
    const config = { limit: 5, window: 60 };

    const result = await rateLimit(identifier, config);

    expect(result.reset).toBeGreaterThan(Date.now());
    expect(typeof result.reset).toBe('number');
  });
});

describe('getRateLimitIdentifier', () => {
  it('should extract IP from x-forwarded-for header', () => {
    const request = new Request('http://localhost/', {
      headers: {
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      },
    });

    const identifier = getRateLimitIdentifier(request);

    expect(identifier).toBe('ip:192.168.1.1');
  });

  it('should return unknown when no IP header', () => {
    const request = new Request('http://localhost/');

    const identifier = getRateLimitIdentifier(request);

    expect(identifier).toBe('ip:unknown');
  });

  it('should handle single IP in x-forwarded-for', () => {
    const request = new Request('http://localhost/', {
      headers: {
        'x-forwarded-for': '203.0.113.195',
      },
    });

    const identifier = getRateLimitIdentifier(request);

    expect(identifier).toBe('ip:203.0.113.195');
  });

  it('should trim whitespace from IP', () => {
    const request = new Request('http://localhost/', {
      headers: {
        'x-forwarded-for': '  192.168.1.1  , 10.0.0.1',
      },
    });

    const identifier = getRateLimitIdentifier(request);

    expect(identifier).toBe('ip:192.168.1.1');
  });
});

describe('addRateLimitHeaders', () => {
  it('should add all rate limit headers', () => {
    const headers = new Headers();
    const result = {
      success: true,
      remaining: 95,
      reset: 1704067200000,
      limit: 100,
    };

    const newHeaders = addRateLimitHeaders(headers, result);

    expect(newHeaders.get('X-RateLimit-Limit')).toBe('100');
    expect(newHeaders.get('X-RateLimit-Remaining')).toBe('95');
    expect(newHeaders.get('X-RateLimit-Reset')).toBe('1704067200000');
  });

  it('should preserve existing headers', () => {
    const headers = new Headers({
      'Content-Type': 'application/json',
    });
    const result = {
      success: true,
      remaining: 50,
      reset: 1704067200000,
      limit: 100,
    };

    const newHeaders = addRateLimitHeaders(headers, result);

    expect(newHeaders.get('Content-Type')).toBe('application/json');
    expect(newHeaders.get('X-RateLimit-Limit')).toBe('100');
  });

  it('should handle zero remaining', () => {
    const headers = new Headers();
    const result = {
      success: false,
      remaining: 0,
      reset: 1704067200000,
      limit: 10,
    };

    const newHeaders = addRateLimitHeaders(headers, result);

    expect(newHeaders.get('X-RateLimit-Remaining')).toBe('0');
  });
});
