/**
 * Tests for Admin LinkedIn Jobs Cleanup API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    ingestJob: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

describe('Admin LinkedIn Jobs Cleanup API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/admin/linkedin-jobs/cleanup', () => {
    it('should cancel jobs without blob URL', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          status: 'queued',
          fileMetadata: {}, // No blobUrl
          createdAt: new Date(),
        },
        {
          id: 'job-2',
          status: 'running',
          fileMetadata: null, // No metadata at all
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.ingestJob.findMany).mockResolvedValue(mockJobs as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cancelledCount).toBe(2);
      expect(data.validCount).toBe(0);
      expect(prisma.ingestJob.update).toHaveBeenCalledTimes(2);
    });

    it('should keep jobs with blob URL', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          status: 'queued',
          fileMetadata: { blobUrl: 'https://blob.storage/file.zip' },
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.ingestJob.findMany).mockResolvedValue(mockJobs as any);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cancelledCount).toBe(0);
      expect(data.validCount).toBe(1);
      expect(prisma.ingestJob.update).not.toHaveBeenCalled();
    });

    it('should handle mixed jobs', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          status: 'queued',
          fileMetadata: { blobUrl: 'https://blob.storage/file.zip' },
          createdAt: new Date(),
        },
        {
          id: 'job-2',
          status: 'running',
          fileMetadata: {},
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.ingestJob.findMany).mockResolvedValue(mockJobs as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cancelledCount).toBe(1);
      expect(data.validCount).toBe(1);
    });

    it('should filter by linkedin_archive source', async () => {
      vi.mocked(prisma.ingestJob.findMany).mockResolvedValue([]);

      await POST();

      expect(prisma.ingestJob.findMany).toHaveBeenCalledWith({
        where: {
          sourceName: 'linkedin_archive',
          status: { in: ['queued', 'running'] },
        },
      });
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.ingestJob.findMany).mockRejectedValue(new Error('Connection failed'));

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to cleanup jobs');
    });

    it('should return detailed results', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          status: 'queued',
          fileMetadata: {},
          createdAt: new Date('2024-01-01'),
        },
      ];

      vi.mocked(prisma.ingestJob.findMany).mockResolvedValue(mockJobs as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      const response = await POST();
      const data = await response.json();

      expect(data.results[0].id).toBe('job-1');
      expect(data.results[0].action).toBe('cancelled');
      expect(data.results[0].reason).toBe('no blob URL');
    });

    it('should update job to cancelled status', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          status: 'queued',
          fileMetadata: null,
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.ingestJob.findMany).mockResolvedValue(mockJobs as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      await POST();

      expect(prisma.ingestJob.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: expect.objectContaining({
          status: 'cancelled',
          error: expect.stringContaining('no blob URL'),
        }),
      });
    });
  });
});
