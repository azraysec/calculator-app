/**
 * Tests for LinkedIn Process Cron Job API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    ingestJob: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock LinkedIn adapters - must use class-like implementation
const mockParseArchive = vi.fn();
const mockRescorePersonEdges = vi.fn();

vi.mock('@wig/adapters', () => ({
  LinkedInArchiveParser: class {
    constructor() {}
    parseArchive = mockParseArchive;
  },
}));

vi.mock('@wig/core', () => ({
  LinkedInRelationshipScorer: class {
    constructor() {}
    rescorePersonEdges = mockRescorePersonEdges;
  },
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  writeFile: vi.fn(),
  unlink: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

import { prisma } from '@/lib/prisma';
import { writeFile, unlink } from 'fs/promises';

describe('LinkedIn Process Cron Job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(writeFile).mockResolvedValue(undefined);
    vi.mocked(unlink).mockResolvedValue(undefined);
    mockParseArchive.mockReset();
    mockRescorePersonEdges.mockReset();
  });

  describe('GET /api/cron/linkedin-process', () => {
    it('should return no pending jobs message when none found', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('No pending jobs');
    });

    it('should query for queued or stuck running jobs', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue(null);

      await GET();

      expect(prisma.ingestJob.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sourceName: 'linkedin_archive',
            status: { in: ['queued', 'running'] },
            completedAt: null,
          }),
          orderBy: { createdAt: 'asc' },
        })
      );
    });

    it('should process job successfully', async () => {
      const mockJob = {
        id: 'job-123',
        userId: 'user-456',
        status: 'queued',
        fileMetadata: { blobUrl: 'https://blob.storage/file.zip' },
      };

      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue(mockJob as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      } as any);

      mockParseArchive.mockResolvedValue({
        connectionsProcessed: 500,
        messagesProcessed: 1000,
        evidenceEventsCreated: 750,
        newPersonsAdded: 200,
        errors: [],
      });

      mockRescorePersonEdges.mockResolvedValue(450);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jobId).toBe('job-123');
      expect(data.result.connectionsProcessed).toBe(500);
      expect(data.result.edgesRescored).toBe(450);
    });

    it('should handle missing blob URL', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue({
        id: 'job-123',
        userId: 'user-456',
        status: 'queued',
        fileMetadata: {}, // No blobUrl
      } as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Processing failed');
      expect(data.details).toContain('Blob URL not found');
    });

    it('should handle missing userId', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue({
        id: 'job-123',
        userId: null, // Missing userId
        status: 'queued',
        fileMetadata: { blobUrl: 'https://blob.storage/file.zip' },
      } as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      } as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Processing failed');
      expect(data.details).toContain('missing userId');
    });

    it('should handle blob download failure', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue({
        id: 'job-123',
        userId: 'user-456',
        status: 'queued',
        fileMetadata: { blobUrl: 'https://blob.storage/file.zip' },
      } as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      } as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Processing failed');
    });

    it('should handle parser errors', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue({
        id: 'job-123',
        userId: 'user-456',
        status: 'queued',
        fileMetadata: { blobUrl: 'https://blob.storage/file.zip' },
      } as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      } as any);

      mockParseArchive.mockRejectedValue(new Error('Invalid archive format'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Processing failed');
    });

    it('should update job to failed state on error', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue({
        id: 'job-123',
        userId: 'user-456',
        status: 'queued',
        fileMetadata: { blobUrl: 'https://blob.storage/file.zip' },
      } as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      await GET();

      // Last update should be to failed state
      const lastUpdateCall = vi.mocked(prisma.ingestJob.update).mock.calls.pop();
      expect(lastUpdateCall?.[0]).toEqual(
        expect.objectContaining({
          where: { id: 'job-123' },
          data: expect.objectContaining({
            status: 'failed',
          }),
        })
      );
    });

    it('should clean up temp file on success', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue({
        id: 'job-123',
        userId: 'user-456',
        status: 'queued',
        fileMetadata: { blobUrl: 'https://blob.storage/file.zip' },
      } as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      } as any);

      mockParseArchive.mockResolvedValue({
        connectionsProcessed: 10,
        messagesProcessed: 5,
        evidenceEventsCreated: 8,
        newPersonsAdded: 3,
        errors: [],
      });
      mockRescorePersonEdges.mockResolvedValue(10);

      await GET();

      expect(unlink).toHaveBeenCalled();
    });

    it('should clean up temp file on error', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue({
        id: 'job-123',
        userId: 'user-456',
        status: 'queued',
        fileMetadata: { blobUrl: 'https://blob.storage/file.zip' },
      } as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      } as any);

      mockParseArchive.mockRejectedValue(new Error('Parse error'));

      await GET();

      expect(unlink).toHaveBeenCalled();
    });

    it('should update job progress during processing', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue({
        id: 'job-123',
        userId: 'user-456',
        status: 'queued',
        fileMetadata: { blobUrl: 'https://blob.storage/file.zip' },
      } as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      } as any);

      mockParseArchive.mockResolvedValue({
        connectionsProcessed: 100,
        messagesProcessed: 50,
        evidenceEventsCreated: 30,
        newPersonsAdded: 20,
        errors: [],
      });
      mockRescorePersonEdges.mockResolvedValue(50);

      await GET();

      // Should have multiple progress updates
      expect(prisma.ingestJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'running',
          }),
        })
      );
    });

    it('should handle jobs with errors in result', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue({
        id: 'job-123',
        userId: 'user-456',
        status: 'queued',
        fileMetadata: { blobUrl: 'https://blob.storage/file.zip' },
      } as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      } as any);

      mockParseArchive.mockResolvedValue({
        connectionsProcessed: 100,
        messagesProcessed: 50,
        evidenceEventsCreated: 30,
        newPersonsAdded: 20,
        errors: ['Error parsing file X', 'Error parsing file Y'],
      });
      mockRescorePersonEdges.mockResolvedValue(50);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Should still mark as completed but with errors logged
      const lastUpdateCall = vi.mocked(prisma.ingestJob.update).mock.calls.pop();
      expect(lastUpdateCall?.[0].data).toMatchObject({
        status: 'completed',
        resultMetadata: expect.objectContaining({
          errors: ['Error parsing file X', 'Error parsing file Y'],
        }),
      });
    });

    it('should handle temp file cleanup failure on success', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue({
        id: 'job-123',
        userId: 'user-456',
        status: 'queued',
        fileMetadata: { blobUrl: 'https://blob.storage/file.zip' },
      } as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      } as any);

      mockParseArchive.mockResolvedValue({
        connectionsProcessed: 10,
        messagesProcessed: 5,
        evidenceEventsCreated: 8,
        newPersonsAdded: 3,
        errors: [],
      });
      mockRescorePersonEdges.mockResolvedValue(10);

      // Make unlink fail
      vi.mocked(unlink).mockRejectedValue(new Error('Permission denied'));

      const response = await GET();
      const data = await response.json();

      // Should still succeed even if cleanup fails
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle temp file cleanup failure on error', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue({
        id: 'job-123',
        userId: 'user-456',
        status: 'queued',
        fileMetadata: { blobUrl: 'https://blob.storage/file.zip' },
      } as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      } as any);

      // Make parsing fail
      mockParseArchive.mockRejectedValue(new Error('Parse error'));

      // Make unlink also fail
      vi.mocked(unlink).mockRejectedValue(new Error('Permission denied'));

      const response = await GET();
      const data = await response.json();

      // Should still return the original error
      expect(response.status).toBe(500);
      expect(data.error).toBe('Processing failed');
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue({
        id: 'job-123',
        userId: 'user-456',
        status: 'queued',
        fileMetadata: { blobUrl: 'https://blob.storage/file.zip' },
      } as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      // Throw a non-Error exception
      vi.mocked(global.fetch).mockRejectedValue('String error');

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.details).toBe('Unknown error');
    });

    it('should handle null fileMetadata', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue({
        id: 'job-123',
        userId: 'user-456',
        status: 'queued',
        fileMetadata: null, // null instead of empty object
      } as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.details).toContain('Blob URL not found');
    });
  });
});
