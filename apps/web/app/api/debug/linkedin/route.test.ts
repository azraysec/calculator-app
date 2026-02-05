/**
 * Tests for LinkedIn Debug API endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    ingestJob: {
      findMany: vi.fn(),
    },
    evidenceEvent: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    conversation: {
      count: vi.fn(),
    },
    message: {
      count: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

describe('LinkedIn Debug API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/debug/linkedin', () => {
    it('should return LinkedIn job and evidence stats', async () => {
      vi.mocked(prisma.ingestJob.findMany).mockResolvedValue([
        {
          id: 'job-1',
          status: 'completed',
          progress: 100,
          resultMetadata: { connectionsProcessed: 500 },
          error: null,
          logs: 'Completed',
          createdAt: new Date(),
          completedAt: new Date(),
        },
      ] as any);

      vi.mocked(prisma.evidenceEvent.count).mockResolvedValue(1000);
      vi.mocked(prisma.evidenceEvent.groupBy).mockResolvedValue([
        { type: 'linkedin_connection', _count: { id: 500 } },
        { type: 'linkedin_message', _count: { id: 500 } },
      ] as any);
      vi.mocked(prisma.conversation.count).mockResolvedValue(100);
      vi.mocked(prisma.message.count).mockResolvedValue(500);
      vi.mocked(prisma.evidenceEvent.findMany).mockResolvedValue([
        {
          id: 'ev-1',
          type: 'linkedin_connection',
          source: 'linkedin',
          timestamp: new Date(),
          subjectPersonId: 'p1',
          objectPersonId: 'p2',
        },
      ] as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recentJobs).toHaveLength(1);
      expect(data.evidenceCounts.total).toBe(1000);
      expect(data.conversationCount).toBe(100);
      expect(data.messageCount).toBe(500);
    });

    it('should filter by linkedin_archive source', async () => {
      vi.mocked(prisma.ingestJob.findMany).mockResolvedValue([]);
      vi.mocked(prisma.evidenceEvent.count).mockResolvedValue(0);
      vi.mocked(prisma.evidenceEvent.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.conversation.count).mockResolvedValue(0);
      vi.mocked(prisma.message.count).mockResolvedValue(0);
      vi.mocked(prisma.evidenceEvent.findMany).mockResolvedValue([]);

      await GET();

      expect(prisma.ingestJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sourceName: 'linkedin_archive' },
        })
      );
    });

    it('should handle database errors with Error instance', async () => {
      vi.mocked(prisma.ingestJob.findMany).mockRejectedValue(new Error('Connection failed'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(data.details).toBe('Connection failed');
    });

    it('should handle database errors with non-Error instance', async () => {
      vi.mocked(prisma.ingestJob.findMany).mockRejectedValue('String error');

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(data.details).toBe('Unknown error');
    });

    it('should return empty data when no jobs exist', async () => {
      vi.mocked(prisma.ingestJob.findMany).mockResolvedValue([]);
      vi.mocked(prisma.evidenceEvent.count).mockResolvedValue(0);
      vi.mocked(prisma.evidenceEvent.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.conversation.count).mockResolvedValue(0);
      vi.mocked(prisma.message.count).mockResolvedValue(0);
      vi.mocked(prisma.evidenceEvent.findMany).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recentJobs).toHaveLength(0);
      expect(data.evidenceCounts.total).toBe(0);
    });

    it('should map evidence by type correctly', async () => {
      vi.mocked(prisma.ingestJob.findMany).mockResolvedValue([]);
      vi.mocked(prisma.evidenceEvent.count).mockResolvedValue(750);
      vi.mocked(prisma.evidenceEvent.groupBy).mockResolvedValue([
        { type: 'linkedin_connection', _count: { id: 300 } },
        { type: 'linkedin_message', _count: { id: 400 } },
        { type: 'email', _count: { id: 50 } },
      ] as any);
      vi.mocked(prisma.conversation.count).mockResolvedValue(0);
      vi.mocked(prisma.message.count).mockResolvedValue(0);
      vi.mocked(prisma.evidenceEvent.findMany).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.evidenceCounts.byType).toHaveLength(3);
      expect(data.evidenceCounts.byType[0]).toEqual({
        type: 'linkedin_connection',
        count: 300,
      });
    });
  });
});
