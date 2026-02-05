/**
 * Tests for LinkedIn Archive Job Processing API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

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

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, unlink } from 'fs/promises';

describe('LinkedIn Archive Job Process API', () => {
  const mockUserId = 'user-123';
  const mockJobId = 'job-456';

  const createRequest = () => {
    return new Request(`http://localhost/api/linkedin/archive/jobs/${mockJobId}/process`, {
      method: 'POST',
    });
  };

  const createContext = () => ({
    params: Promise.resolve({ jobId: mockJobId }),
  } as any);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);
    vi.mocked(writeFile).mockResolvedValue(undefined);
    vi.mocked(unlink).mockResolvedValue(undefined);
    mockParseArchive.mockReset();
    mockRescorePersonEdges.mockReset();
  });

  describe('POST /api/linkedin/archive/jobs/[jobId]/process', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await POST(createRequest(), createContext());

      expect(response.status).toBe(401);
    });

    it('should return 404 when job not found', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue(null);

      const response = await POST(createRequest(), createContext());
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Job not found');
    });

    it('should filter by userId for multi-tenant isolation', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue(null);

      await POST(createRequest(), createContext());

      expect(prisma.ingestJob.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockJobId,
          userId: mockUserId,
        },
      });
    });

    it('should return 400 when job is not queued', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue({
        id: mockJobId,
        userId: mockUserId,
        status: 'running',
        fileMetadata: { blobUrl: 'https://blob.storage/file.zip' },
      } as any);

      const response = await POST(createRequest(), createContext());
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Job is already running');
    });

    it('should process job successfully', async () => {
      const mockJob = {
        id: mockJobId,
        userId: mockUserId,
        status: 'queued',
        fileMetadata: { blobUrl: 'https://blob.storage/file.zip' },
      };

      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue(mockJob as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      // Mock fetch for blob download
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      } as any);

      // Mock parser result
      mockParseArchive.mockResolvedValue({
        connectionsProcessed: 500,
        messagesProcessed: 1000,
        evidenceEventsCreated: 750,
        newPersonsAdded: 200,
        errors: [],
      });

      // Mock scorer
      mockRescorePersonEdges.mockResolvedValue(450);

      const response = await POST(createRequest(), createContext());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('completed');
      expect(data.result.connectionsProcessed).toBe(500);
      expect(data.result.messagesProcessed).toBe(1000);
      expect(data.result.edgesRescored).toBe(450);
    });

    it('should handle missing blob URL', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue({
        id: mockJobId,
        userId: mockUserId,
        status: 'queued',
        fileMetadata: {}, // No blobUrl
      } as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      const response = await POST(createRequest(), createContext());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Processing failed');
      expect(data.details).toContain('Blob URL not found');
    });

    it('should handle blob download failure', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue({
        id: mockJobId,
        userId: mockUserId,
        status: 'queued',
        fileMetadata: { blobUrl: 'https://blob.storage/file.zip' },
      } as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      } as any);

      const response = await POST(createRequest(), createContext());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Processing failed');
    });

    it('should handle parser errors', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue({
        id: mockJobId,
        userId: mockUserId,
        status: 'queued',
        fileMetadata: { blobUrl: 'https://blob.storage/file.zip' },
      } as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      } as any);

      mockParseArchive.mockRejectedValue(new Error('Parse failed'));

      const response = await POST(createRequest(), createContext());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Processing failed');
    });

    it('should update job to failed state on error', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue({
        id: mockJobId,
        userId: mockUserId,
        status: 'queued',
        fileMetadata: { blobUrl: 'https://blob.storage/file.zip' },
      } as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      await POST(createRequest(), createContext());

      // Verify job was updated to failed
      expect(prisma.ingestJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockJobId },
          data: expect.objectContaining({
            status: 'failed',
          }),
        })
      );
    });

    it('should clean up temp file on success', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue({
        id: mockJobId,
        userId: mockUserId,
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

      await POST(createRequest(), createContext());

      expect(unlink).toHaveBeenCalled();
    });

    it('should clean up temp file on error', async () => {
      vi.mocked(prisma.ingestJob.findFirst).mockResolvedValue({
        id: mockJobId,
        userId: mockUserId,
        status: 'queued',
        fileMetadata: { blobUrl: 'https://blob.storage/file.zip' },
      } as any);
      vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      } as any);

      mockParseArchive.mockRejectedValue(new Error('Parse error'));

      await POST(createRequest(), createContext());

      expect(unlink).toHaveBeenCalled();
    });
  });
});
