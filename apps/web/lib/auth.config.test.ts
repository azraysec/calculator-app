/**
 * Tests for Auth Config (Edge-compatible configuration)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock GoogleProvider
vi.mock('next-auth/providers/google', () => ({
  default: vi.fn((config) => ({ ...config, id: 'google', name: 'Google' })),
}));

describe('Auth Config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module cache
    vi.resetModules();
  });

  describe('authConfig structure', () => {
    it('should export authConfig with required properties', async () => {
      const { authConfig } = await import('./auth.config');

      expect(authConfig).toBeDefined();
      expect(authConfig.providers).toBeDefined();
      expect(authConfig.pages).toBeDefined();
      expect(authConfig.session).toBeDefined();
      expect(authConfig.callbacks).toBeDefined();
    });

    it('should have Google provider configured', async () => {
      const { authConfig } = await import('./auth.config');

      expect(authConfig.providers).toHaveLength(1);
    });

    it('should have JWT session strategy', async () => {
      const { authConfig } = await import('./auth.config');

      expect(authConfig.session?.strategy).toBe('jwt');
    });

    it('should have custom sign-in page', async () => {
      const { authConfig } = await import('./auth.config');

      expect(authConfig.pages?.signIn).toBe('/login');
      expect(authConfig.pages?.error).toBe('/auth/error');
    });
  });

  describe('authorized callback', () => {
    it('should allow public routes without authentication', async () => {
      const { authConfig } = await import('./auth.config');
      const authorized = authConfig.callbacks?.authorized as any;

      const result = authorized({
        auth: null,
        request: { nextUrl: { pathname: '/login' } },
      });

      expect(result).toBe(true);
    });

    it('should allow api/auth routes', async () => {
      const { authConfig } = await import('./auth.config');
      const authorized = authConfig.callbacks?.authorized as any;

      const result = authorized({
        auth: null,
        request: { nextUrl: { pathname: '/api/auth/signin' } },
      });

      expect(result).toBe(true);
    });

    it('should allow api/health routes', async () => {
      const { authConfig } = await import('./auth.config');
      const authorized = authConfig.callbacks?.authorized as any;

      const result = authorized({
        auth: null,
        request: { nextUrl: { pathname: '/api/health' } },
      });

      expect(result).toBe(true);
    });

    it('should require authentication for protected routes', async () => {
      const { authConfig } = await import('./auth.config');
      const authorized = authConfig.callbacks?.authorized as any;

      const result = authorized({
        auth: null,
        request: { nextUrl: { pathname: '/dashboard' } },
      });

      expect(result).toBe(false);
    });

    it('should allow authenticated users to access protected routes', async () => {
      const { authConfig } = await import('./auth.config');
      const authorized = authConfig.callbacks?.authorized as any;

      const result = authorized({
        auth: { user: { id: 'user-123' } },
        request: { nextUrl: { pathname: '/dashboard' } },
      });

      expect(result).toBe(true);
    });

    it('should allow authenticated users to access api routes', async () => {
      const { authConfig } = await import('./auth.config');
      const authorized = authConfig.callbacks?.authorized as any;

      const result = authorized({
        auth: { user: { id: 'user-123' } },
        request: { nextUrl: { pathname: '/api/network' } },
      });

      expect(result).toBe(true);
    });
  });
});
