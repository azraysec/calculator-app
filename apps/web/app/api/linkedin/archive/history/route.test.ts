/**
 * Tests for LinkedIn Archive History API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    ingestJob: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

describe('LinkedIn Archive History API', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);
  });

  describe('GET /api/linkedin/archive/history', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request('http://localhost/api/linkedin/archive/history');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return empty history when no uploads', async () => {
      vi.mocked(prisma.ingestJob.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/linkedin/archive/history');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.history).toEqual([]);
      expect(data.aggregate.totalUploads).toBe(0);
    });

    it('should return upload history with stats', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          userId: mockUserId,
          status: 'completed',
          progress: 100,
          createdAt: new Date('2026-01-01T10:00:00Z'),
          startedAt: new Date('2026-01-01T10:00:01Z'),
          completedAt: new Date('2026-01-01T10:05:01Z'),
          error: null,
          fileMetadata: {
            fileName: 'linkedin-archive.zip',
            fileSize: 5242880, // 5MB
          },
          resultMetadata: {
            connectionsProcessed: 500,
            newConnectionsAdded: 450,
            messagesProcessed: 1000,
            newPersonsAdded: 200,
            evidenceEventsCreated: 750,
            edgesRescored: 500,
          },
        },
      ];

      vi.mocked(prisma.ingestJob.findMany).mockResolvedValue(mockJobs);

      const request = new Request('http://localhost/api/linkedin/archive/history');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.history).toHaveLength(1);
      expect(data.history[0].fileName).toBe('linkedin-archive.zip');
      expect(data.history[0].fileSize).toBe('5.00 MB');
      expect(data.history[0].duration).toBe('300.0s');
      expect(data.history[0].stats.connectionsProcessed).toBe(500);
    });

    it('should filter by userId for multi-tenant isolation', async () => {
      vi.mocked(prisma.ingestJob.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/linkedin/archive/history');
      await GET(request);

      expect(prisma.ingestJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: mockUserId,
            sourceName: 'linkedin_archive',
          },
        })
      );
    });

    it('should calculate aggregate statistics', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          userId: mockUserId,
          status: 'completed',
          progress: 100,
          createdAt: new Date(),
          startedAt: new Date(),
          completedAt: new Date(),
          error: null,
          fileMetadata: {},
          resultMetadata: {
            connectionsProcessed: 100,
            messagesProcessed: 50,
            newPersonsAdded: 20,
          },
        },
        {
          id: 'job-2',
          userId: mockUserId,
          status: 'failed',
          progress: 50,
          createdAt: new Date(),
          startedAt: new Date(),
          completedAt: null,
          error: 'Processing error',
          fileMetadata: {},
          resultMetadata: {},
        },
      ];

      vi.mocked(prisma.ingestJob.findMany).mockResolvedValue(mockJobs);

      const request = new Request('http://localhost/api/linkedin/archive/history');
      const response = await GET(request);
      const data = await response.json();

      expect(data.aggregate.totalUploads).toBe(2);
      expect(data.aggregate.successful).toBe(1);
      expect(data.aggregate.failed).toBe(1);
      expect(data.aggregate.totalConnections).toBe(100);
      expect(data.aggregate.totalMessages).toBe(50);
      expect(data.aggregate.totalNewPersons).toBe(20);
    });

    it('should handle missing metadata gracefully', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          userId: mockUserId,
          status: 'completed',
          progress: 100,
          createdAt: new Date(),
          startedAt: null,
          completedAt: null,
          error: null,
          fileMetadata: null,
          resultMetadata: null,
        },
      ];

      vi.mocked(prisma.ingestJob.findMany).mockResolvedValue(mockJobs);

      const request = new Request('http://localhost/api/linkedin/archive/history');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.history[0].fileName).toBe('Unknown');
      expect(data.history[0].fileSize).toBe('Unknown');
      expect(data.history[0].duration).toBeNull();
      expect(data.history[0].stats.connectionsProcessed).toBe(0);
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.ingestJob.findMany).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/linkedin/archive/history');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch upload history');
    });
  });
});
