/**
 * Tests for Auth.ts - Google OAuth sign-in handling
 *
 * These tests cover the handleGoogleSignIn function that:
 * 1. Stores OAuth tokens in the User model
 * 2. Creates/updates DataSourceConnection for Gmail status
 *
 * CRITICAL: Tests the bug fix for Gmail "Not Connected" issue where
 * DataSourceConnection was only created when refresh_token was present.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGoogleSignIn } from './auth-handlers';

describe('handleGoogleSignIn', () => {
  // Mock Prisma client
  const mockDb = {
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    dataSourceConnection: {
      upsert: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Token storage', () => {
    it('should store access token and refresh token in User model', async () => {
      mockDb.user.update.mockResolvedValue({});
      mockDb.user.findUnique.mockResolvedValue({ googleRefreshToken: 'refresh-token' });
      mockDb.dataSourceConnection.upsert.mockResolvedValue({});

      await handleGoogleSignIn(
        'user-123',
        {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_at: 1234567890,
        },
        mockDb as any
      );

      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          googleAccessToken: 'access-token',
          googleRefreshToken: 'refresh-token',
          tokenExpiresAt: expect.any(Date),
        },
      });
    });

    it('should store null when refresh_token is not provided', async () => {
      mockDb.user.update.mockResolvedValue({});
      mockDb.user.findUnique.mockResolvedValue({ googleRefreshToken: null });
      mockDb.dataSourceConnection.upsert.mockResolvedValue({});

      await handleGoogleSignIn(
        'user-123',
        {
          access_token: 'access-token',
          refresh_token: null,
        },
        mockDb as any
      );

      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: expect.objectContaining({
          googleRefreshToken: null,
        }),
      });
    });
  });

  describe('DataSourceConnection creation - BUG FIX VERIFICATION', () => {
    it('should create CONNECTED DataSourceConnection when refresh_token is present', async () => {
      mockDb.user.update.mockResolvedValue({});
      mockDb.user.findUnique.mockResolvedValue({ googleRefreshToken: 'refresh-token' });
      mockDb.dataSourceConnection.upsert.mockResolvedValue({});

      const result = await handleGoogleSignIn(
        'user-123',
        {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
        },
        mockDb as any
      );

      expect(result.hasRefreshToken).toBe(true);
      expect(mockDb.dataSourceConnection.upsert).toHaveBeenCalledWith({
        where: {
          userId_sourceType: {
            userId: 'user-123',
            sourceType: 'EMAIL',
          },
        },
        update: {
          connectionStatus: 'CONNECTED',
          updatedAt: expect.any(Date),
        },
        create: {
          userId: 'user-123',
          sourceType: 'EMAIL',
          connectionStatus: 'CONNECTED',
          privacyLevel: 'PRIVATE',
        },
      });
    });

    it('BUG FIX: should create CONNECTED when refresh_token is null but stored token exists', async () => {
      // This test verifies the bug fix for the Gmail "Not Connected" issue
      // Previously, DataSourceConnection was only created when account.refresh_token was present
      // Now it checks for stored googleRefreshToken in User model

      mockDb.user.update.mockResolvedValue({});
      // User has previously stored refresh token
      mockDb.user.findUnique.mockResolvedValue({ googleRefreshToken: 'previously-stored-token' });
      mockDb.dataSourceConnection.upsert.mockResolvedValue({});

      // Simulate subsequent login - Google doesn't send refresh_token
      const result = await handleGoogleSignIn(
        'user-123',
        {
          access_token: 'access-token',
          refresh_token: null, // No refresh token on subsequent login!
        },
        mockDb as any
      );

      // Should be CONNECTED because stored token exists
      expect(result.hasRefreshToken).toBe(true);
      expect(mockDb.dataSourceConnection.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            connectionStatus: 'CONNECTED',
          }),
          update: expect.objectContaining({
            connectionStatus: 'CONNECTED',
          }),
        })
      );
    });

    it('should create DISCONNECTED when no refresh token exists anywhere', async () => {
      mockDb.user.update.mockResolvedValue({});
      // User has no stored refresh token
      mockDb.user.findUnique.mockResolvedValue({ googleRefreshToken: null });
      mockDb.dataSourceConnection.upsert.mockResolvedValue({});

      const result = await handleGoogleSignIn(
        'user-123',
        {
          access_token: 'access-token',
          refresh_token: null,
        },
        mockDb as any
      );

      expect(result.hasRefreshToken).toBe(false);
      expect(mockDb.dataSourceConnection.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            connectionStatus: 'DISCONNECTED',
          }),
        })
      );
    });

    it('should always create DataSourceConnection regardless of token presence', async () => {
      // This test ensures DataSourceConnection is ALWAYS created/updated
      // even when no tokens are available

      mockDb.user.update.mockResolvedValue({});
      mockDb.user.findUnique.mockResolvedValue({ googleRefreshToken: null });
      mockDb.dataSourceConnection.upsert.mockResolvedValue({});

      await handleGoogleSignIn(
        'user-123',
        {
          access_token: null,
          refresh_token: null,
        },
        mockDb as any
      );

      // DataSourceConnection should STILL be created (with DISCONNECTED status)
      expect(mockDb.dataSourceConnection.upsert).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should propagate database errors', async () => {
      mockDb.user.update.mockRejectedValue(new Error('DB error'));

      await expect(
        handleGoogleSignIn(
          'user-123',
          { access_token: 'token' },
          mockDb as any
        )
      ).rejects.toThrow('DB error');
    });
  });
});
