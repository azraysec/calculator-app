/**
 * Tests for LinkedIn Archive Upload API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing route
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    ingestJob: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
}));

import { POST } from './route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';

describe('LinkedIn Archive Upload API', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);
  });

  describe('POST /api/linkedin/archive/upload', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const formData = new FormData();
      const request = new Request('http://localhost/api/linkedin/archive/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 400 when no file uploaded', async () => {
      const formData = new FormData();
      const request = new Request('http://localhost/api/linkedin/archive/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No file provided');
    });

    it('should return 400 when file is not a ZIP', async () => {
      const formData = new FormData();
      const file = new File(['test content'], 'archive.txt', { type: 'text/plain' });
      formData.append('file', file);

      const request = new Request('http://localhost/api/linkedin/archive/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('File must be a ZIP archive');
    });

    it('should upload file and create job', async () => {
      const mockBlobResult = {
        url: 'https://blob.storage/archive.zip',
        downloadUrl: 'https://blob.storage/archive.zip?download',
      };

      const mockJob = {
        id: 'job-123',
        userId: mockUserId,
        status: 'queued',
        sourceName: 'linkedin_archive',
      };

      vi.mocked(put).mockResolvedValue(mockBlobResult as any);
      vi.mocked(prisma.ingestJob.create).mockResolvedValue(mockJob as any);

      const formData = new FormData();
      const zipContent = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // ZIP magic bytes
      const file = new File([zipContent], 'archive.zip', { type: 'application/zip' });
      formData.append('file', file);

      const request = new Request('http://localhost/api/linkedin/archive/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobId).toBe('job-123');
      expect(data.status).toBe('queued');
      expect(data.message).toBe('File uploaded successfully. Ready for processing.');
    });

    it('should handle blob upload errors', async () => {
      vi.mocked(put).mockRejectedValue(new Error('Blob storage error'));

      const formData = new FormData();
      const zipContent = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
      const file = new File([zipContent], 'archive.zip', { type: 'application/zip' });
      formData.append('file', file);

      const request = new Request('http://localhost/api/linkedin/archive/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to upload archive');
      expect(data.details).toContain('Blob storage error');
    });

    it('should return 400 when file exceeds size limit', async () => {
      const formData = new FormData();
      // Create a mock file with size > 100MB
      const largeFile = {
        name: 'large-archive.zip',
        size: 101 * 1024 * 1024, // 101MB
        type: 'application/zip',
      };
      // Mock the file getter to return our large file
      Object.defineProperty(formData, 'get', {
        value: (name: string) => {
          if (name === 'file') return largeFile as any;
          return null;
        },
      });

      const request = {
        formData: () => Promise.resolve(formData),
      } as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('File size exceeds 100MB limit');
    });

    it('should handle non-Error blob upload exception', async () => {
      vi.mocked(put).mockRejectedValue('String upload error');

      const formData = new FormData();
      const zipContent = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
      const file = new File([zipContent], 'archive.zip', { type: 'application/zip' });
      formData.append('file', file);

      const request = new Request('http://localhost/api/linkedin/archive/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to upload archive');
      expect(data.details).toContain('Unknown error');
    });
  });
});
