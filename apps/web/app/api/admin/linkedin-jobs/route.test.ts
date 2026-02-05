/**
 * Tests for Admin LinkedIn Jobs API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    ingestJob: {
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

describe('Admin LinkedIn Jobs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/linkedin-jobs', () => {
    it('should return list of jobs', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          status: 'completed',
          progress: 100,
          createdAt: new Date(Date.now() - 60000), // 1 minute ago
          startedAt: new Date(),
          completedAt: new Date(),
          error: null,
          logs: 'Completed successfully',
          fileMetadata: { fileName: 'archive.zip' },
        },
      ];

      vi.mocked(prisma.ingestJob.findMany).mockResolvedValue(mockJobs as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.total).toBe(1);
      expect(data.jobs[0].id).toBe('job-1');
      expect(data.jobs[0].fileName).toBe('archive.zip');
    });

    it('should identify stuck jobs', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          status: 'running',
          progress: 50,
          createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
          startedAt: new Date(),
          completedAt: null,
          error: null,
          logs: 'Processing...',
          fileMetadata: { fileName: 'archive.zip' },
        },
      ];

      vi.mocked(prisma.ingestJob.findMany).mockResolvedValue(mockJobs as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stuckCount).toBe(1);
      expect(data.jobs[0].isStuck).toBe(true);
    });

    it('should filter by linkedin_archive source', async () => {
      vi.mocked(prisma.ingestJob.findMany).mockResolvedValue([]);

      await GET();

      expect(prisma.ingestJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sourceName: 'linkedin_archive' },
        })
      );
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.ingestJob.findMany).mockRejectedValue(new Error('Connection failed'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch jobs');
    });

    it('should handle missing fileMetadata', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          status: 'queued',
          progress: 0,
          createdAt: new Date(),
          startedAt: null,
          completedAt: null,
          error: null,
          logs: null,
          fileMetadata: null,
        },
      ];

      vi.mocked(prisma.ingestJob.findMany).mockResolvedValue(mockJobs as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs[0].fileName).toBe('unknown');
    });
  });

  describe('POST /api/admin/linkedin-jobs', () => {
    it('should reset a specific job', async () => {
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      const request = new Request('http://localhost/api/admin/linkedin-jobs', {
        method: 'POST',
        body: JSON.stringify({ action: 'reset', jobId: 'job-123' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('job-123');
      expect(prisma.ingestJob.update).toHaveBeenCalledWith({
        where: { id: 'job-123' },
        data: expect.objectContaining({
          status: 'queued',
          startedAt: null,
        }),
      });
    });

    it('should reset all stuck jobs when no jobId provided', async () => {
      vi.mocked(prisma.ingestJob.updateMany).mockResolvedValue({ count: 3 } as any);

      const request = new Request('http://localhost/api/admin/linkedin-jobs', {
        method: 'POST',
        body: JSON.stringify({ action: 'reset' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Reset 3 stuck jobs');
    });

    it('should cancel a specific job', async () => {
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      const request = new Request('http://localhost/api/admin/linkedin-jobs', {
        method: 'POST',
        body: JSON.stringify({ action: 'cancel', jobId: 'job-123' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('cancelled');
      expect(prisma.ingestJob.update).toHaveBeenCalledWith({
        where: { id: 'job-123' },
        data: expect.objectContaining({
          status: 'cancelled',
        }),
      });
    });

    it('should return 400 when cancel without jobId', async () => {
      const request = new Request('http://localhost/api/admin/linkedin-jobs', {
        method: 'POST',
        body: JSON.stringify({ action: 'cancel' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('jobId required');
    });

    it('should return 400 for invalid action', async () => {
      const request = new Request('http://localhost/api/admin/linkedin-jobs', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalid' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid action');
    });

    it('should handle database errors on POST', async () => {
      vi.mocked(prisma.ingestJob.update).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/admin/linkedin-jobs', {
        method: 'POST',
        body: JSON.stringify({ action: 'reset', jobId: 'job-123' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to manage jobs');
    });
  });
});
