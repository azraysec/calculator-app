/**
 * Tests for auth-helpers utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import {
  getAuthenticatedUserId,
  unauthorizedResponse,
  forbiddenResponse,
  withAuth,
} from './auth-helpers';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

import { auth } from '@/lib/auth';

describe('auth-helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAuthenticatedUserId', () => {
    it('should return userId when authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123' },
      } as any);

      const userId = await getAuthenticatedUserId();

      expect(userId).toBe('user-123');
    });

    it('should throw Unauthorized when no session', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      await expect(getAuthenticatedUserId()).rejects.toThrow('Unauthorized');
    });

    it('should throw Unauthorized when no user in session', async () => {
      vi.mocked(auth).mockResolvedValue({ user: null } as any);

      await expect(getAuthenticatedUserId()).rejects.toThrow('Unauthorized');
    });

    it('should throw Unauthorized when no user id', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { name: 'Test' } } as any);

      await expect(getAuthenticatedUserId()).rejects.toThrow('Unauthorized');
    });
  });

  describe('unauthorizedResponse', () => {
    it('should return 401 response', async () => {
      const response = unauthorizedResponse();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toBe('Authentication required');
    });
  });

  describe('forbiddenResponse', () => {
    it('should return 403 response with default message', async () => {
      const response = forbiddenResponse();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
      expect(data.message).toBe('Forbidden');
    });

    it('should return 403 response with custom message', async () => {
      const response = forbiddenResponse('Access denied to resource');
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.message).toBe('Access denied to resource');
    });
  });

  describe('withAuth', () => {
    it('should pass userId to handler when authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123' },
      } as any);

      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const wrappedHandler = withAuth(mockHandler);
      const request = new Request('http://localhost/api/test');
      await wrappedHandler(request);

      expect(mockHandler).toHaveBeenCalledWith(
        request,
        expect.objectContaining({ userId: 'user-123' })
      );
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const mockHandler = vi.fn();
      const wrappedHandler = withAuth(mockHandler);

      const request = new Request('http://localhost/api/test');
      const response = await wrappedHandler(request);

      expect(response.status).toBe(401);
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should pass params from context to handler', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123' },
      } as any);

      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const wrappedHandler = withAuth(mockHandler);
      const request = new Request('http://localhost/api/test/123');
      const context = { params: Promise.resolve({ id: '123' }) };

      await wrappedHandler(request, context);

      expect(mockHandler).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          userId: 'user-123',
          params: context.params,
        })
      );
    });

    it('should rethrow non-Unauthorized errors', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123' },
      } as any);

      const mockHandler = vi.fn().mockRejectedValue(new Error('Database error'));
      const wrappedHandler = withAuth(mockHandler);

      const request = new Request('http://localhost/api/test');

      await expect(wrappedHandler(request)).rejects.toThrow('Database error');
    });

    it('should handle undefined context gracefully', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123' },
      } as any);

      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const wrappedHandler = withAuth(mockHandler);
      const request = new Request('http://localhost/api/test');

      await wrappedHandler(request);

      expect(mockHandler).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          userId: 'user-123',
          params: undefined,
        })
      );
    });
  });
});
