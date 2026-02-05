/**
 * Tests for Debug API endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    person: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    edge: {
      count: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

describe('Debug API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/debug', () => {
    it('should return database counts and sample data', async () => {
      vi.mocked(prisma.person.count).mockResolvedValue(100);
      vi.mocked(prisma.edge.count).mockResolvedValue(250);
      vi.mocked(prisma.person.findMany).mockResolvedValue([
        { id: 'person-1', names: ['Alice'], deletedAt: null },
        { id: 'person-2', names: ['Bob'], deletedAt: null },
      ]);
      vi.mocked(prisma.person.findUnique).mockResolvedValue({
        id: 'me',
        names: ['Me'],
        emails: ['me@example.com'],
        deletedAt: null,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.counts.people).toBe(100);
      expect(data.counts.edges).toBe(250);
      expect(data.allPeople).toHaveLength(2);
      expect(data.meUser.id).toBe('me');
    });

    it('should indicate DATABASE_URL status when set', async () => {
      const originalUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = 'postgres://localhost/test';

      vi.mocked(prisma.person.count).mockResolvedValue(0);
      vi.mocked(prisma.edge.count).mockResolvedValue(0);
      vi.mocked(prisma.person.findMany).mockResolvedValue([]);
      vi.mocked(prisma.person.findUnique).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.database_url).toBe('SET');

      process.env.DATABASE_URL = originalUrl;
    });

    it('should indicate DATABASE_URL status when not set', async () => {
      const originalUrl = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      vi.mocked(prisma.person.count).mockResolvedValue(0);
      vi.mocked(prisma.edge.count).mockResolvedValue(0);
      vi.mocked(prisma.person.findMany).mockResolvedValue([]);
      vi.mocked(prisma.person.findUnique).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.database_url).toBe('NOT SET');

      process.env.DATABASE_URL = originalUrl;
    });

    it('should handle null meUser', async () => {
      vi.mocked(prisma.person.count).mockResolvedValue(5);
      vi.mocked(prisma.edge.count).mockResolvedValue(10);
      vi.mocked(prisma.person.findMany).mockResolvedValue([]);
      vi.mocked(prisma.person.findUnique).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meUser).toBeNull();
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.person.count).mockRejectedValue(new Error('Connection refused'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database query failed');
      expect(data.details).toBe('Connection refused');
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(prisma.person.count).mockRejectedValue('String error');

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database query failed');
      expect(data.details).toBe('Unknown error');
    });
  });
});
