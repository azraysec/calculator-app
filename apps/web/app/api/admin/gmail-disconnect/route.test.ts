/**
 * Tests for Gmail Disconnect Admin API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Mock the adapters module
vi.mock('@wig/adapters', () => ({
  createGmailAdapter: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { createGmailAdapter } from '@wig/adapters';

describe('Gmail Disconnect Admin API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/admin/gmail-disconnect', () => {
    it('should clear tokens for a specific user when userId is provided', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      (prisma.user.update as any).mockResolvedValue(mockUser);

      const request = new NextRequest(
        'http://localhost:3000/api/admin/gmail-disconnect?userId=user-123',
        { method: 'POST' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('test@example.com');
      expect(data.userId).toBe('user-123');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          googleAccessToken: null,
          googleRefreshToken: null,
          lastGmailSyncAt: null,
        },
        select: { id: true, email: true },
      });
    });

    it('should process all users with tokens when no userId provided', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'user1@example.com', googleRefreshToken: 'token1' },
        { id: 'user-2', email: 'user2@example.com', googleRefreshToken: 'token2' },
      ];

      (prisma.user.findMany as any).mockResolvedValue(mockUsers);
      (prisma.user.update as any).mockResolvedValue({});

      // Mock adapter - first user has invalid token, second has valid
      const mockAdapter = {
        validateConnection: vi.fn()
          .mockResolvedValueOnce({ valid: false, error: 'invalid_grant' })
          .mockResolvedValueOnce({ valid: true }),
      };
      (createGmailAdapter as any).mockReturnValue(mockAdapter);

      const request = new NextRequest(
        'http://localhost:3000/api/admin/gmail-disconnect',
        { method: 'POST' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.results).toHaveLength(2);
      expect(data.results[0].action).toBe('cleared');
      expect(data.results[1].action).toBe('kept');

      // Only the invalid token should be cleared
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          googleAccessToken: null,
          googleRefreshToken: null,
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      (prisma.user.update as any).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest(
        'http://localhost:3000/api/admin/gmail-disconnect?userId=user-123',
        { method: 'POST' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to disconnect Gmail');
      expect(data.details).toContain('Database connection failed');
    });

    it('should handle user not found error', async () => {
      (prisma.user.update as any).mockRejectedValue(
        new Error('Record to update not found')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/admin/gmail-disconnect?userId=nonexistent',
        { method: 'POST' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to disconnect Gmail');
    });

    it('should return empty results when no users have tokens', async () => {
      (prisma.user.findMany as any).mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost:3000/api/admin/gmail-disconnect',
        { method: 'POST' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Processed 0 users');
      expect(data.results).toHaveLength(0);
    });

    it('should handle adapter validation errors', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'user1@example.com', googleRefreshToken: 'token1' },
      ];

      (prisma.user.findMany as any).mockResolvedValue(mockUsers);
      (createGmailAdapter as any).mockImplementation(() => {
        throw new Error('Failed to create adapter');
      });

      const request = new NextRequest(
        'http://localhost:3000/api/admin/gmail-disconnect',
        { method: 'POST' }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results[0].action).toBe('error');
      expect(data.results[0].reason).toContain('Failed to create adapter');
    });
  });
});
