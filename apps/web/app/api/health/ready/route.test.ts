/**
 * Tests for Health Ready API endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';

describe('Health Ready API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
  });

  describe('GET /api/health/ready', () => {
    it('should return 200 when database is healthy', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ 1: 1 }]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ready');
      expect(data.checks.database.status).toBe('healthy');
    });

    it('should return 503 when database is unhealthy', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Connection refused'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('not_ready');
      expect(data.checks.database.status).toBe('unhealthy');
      expect(data.checks.database.message).toBe('Connection refused');
    });

    it('should include timestamp', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ 1: 1 }]);

      const response = await GET();
      const data = await response.json();

      expect(data.timestamp).toBe('2026-01-15T12:00:00.000Z');
    });

    it('should include inngest check as configured', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ 1: 1 }]);

      const response = await GET();
      const data = await response.json();

      expect(data.checks.inngest.status).toBe('configured');
    });

    it('should handle unknown database errors', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue('Unknown error type');

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.checks.database.status).toBe('unhealthy');
      expect(data.checks.database.message).toBe('Unknown error');
    });
  });
});
