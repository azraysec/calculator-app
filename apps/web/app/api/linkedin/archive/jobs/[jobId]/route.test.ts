/**
 * Tests for LinkedIn Archive Job Status API
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
      findFirst: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

describe('LinkedIn Archive Job Status API', () => {
  const mockUserId = 'user-123';
  const mockJobId = 'job-456';

  const createRequest = () => {
    return new Request(`http://localhost/api/linkedin/archive/jobs/${mockJobId}`);
  };

  const createContext = () => ({
    params: Promise.resolve({ jobId: mockJobId }),
  } as any);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);
  });

  describe('GET /api/linkedin/archive/jobs/[jobId]', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await GET(createRequest(), createContext());

      expect(response.status).toBe(401);
    });

    it('should return 404 when job not found', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue(null);

      const response = await GET(createRequest(), createContext());
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Job not found');
    });

    it('should return job status when found', async () => {
      const mockJob = {
        id: mockJobId,
        userId: mockUserId,
        status: 'completed',
        progress: 100,
        startedAt: new Date('2026-01-01T10:00:00Z'),
        completedAt: new Date('2026-01-01T10:05:00Z'),
        error: null,
        fileMetadata: { fileName: 'archive.zip' },
        resultMetadata: { connectionsProcessed: 500 },
        logs: 'Processing completed',
      };

      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue(mockJob);

      const response = await GET(createRequest(), createContext());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(mockJobId);
      expect(data.status).toBe('completed');
      expect(data.progress).toBe(100);
    });

    it('should filter by userId for multi-tenant isolation', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue(null);

      await GET(createRequest(), createContext());

      expect(prisma.ingestJob.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockJobId,
          userId: mockUserId,
        },
      });
    });

    it('should return 404 when job belongs to different user', async () => {
      // Job exists but belongs to different user - filtered out by userId
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue(null);

      const response = await GET(createRequest(), createContext());
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Job not found');
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockRejectedValue(new Error('DB error'));

      const response = await GET(createRequest(), createContext());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to get job status');
    });

    it('should return running job with progress', async () => {
      const mockJob = {
        id: mockJobId,
        userId: mockUserId,
        status: 'running',
        progress: 45,
        startedAt: new Date('2026-01-01T10:00:00Z'),
        completedAt: null,
        error: null,
        fileMetadata: { fileName: 'archive.zip' },
        resultMetadata: null,
        logs: 'Processing connections...',
      };

      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue(mockJob);

      const response = await GET(createRequest(), createContext());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('running');
      expect(data.progress).toBe(45);
      expect(data.logs).toBe('Processing connections...');
    });
  });
});
