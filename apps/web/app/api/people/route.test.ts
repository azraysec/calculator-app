/**
 * Tests for People Search API
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
    person: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

describe('People Search API', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);
  });

  describe('GET /api/people', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request('http://localhost/api/people?q=john');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return 400 when query is missing', async () => {
      const request = new Request('http://localhost/api/people');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('should search by partial name match', async () => {
      vi.mocked(prisma.person.findMany).mockResolvedValue([
        {
          id: 'person-1',
          names: ['John Doe'],
          emails: ['john@example.com'],
          title: 'Engineer',
          organization: null,
        },
        {
          id: 'person-2',
          names: ['Alice Smith'],
          emails: ['alice@example.com'],
          title: 'Designer',
          organization: null,
        },
      ] as any);

      const request = new Request('http://localhost/api/people?q=john');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(1);
      expect(data.results[0].names).toContain('John Doe');
      expect(data.metadata.usedFuzzyMatch).toBe(false);
    });

    it('should search by email', async () => {
      vi.mocked(prisma.person.findMany).mockResolvedValue([
        {
          id: 'person-1',
          names: ['John Doe'],
          emails: ['john@example.com'],
          title: 'Engineer',
          organization: null,
        },
      ] as any);

      const request = new Request('http://localhost/api/people?q=john@example');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(1);
    });

    it('should search by title', async () => {
      vi.mocked(prisma.person.findMany).mockResolvedValue([
        {
          id: 'person-1',
          names: ['John Doe'],
          emails: ['john@example.com'],
          title: 'Software Engineer',
          organization: null,
        },
      ] as any);

      const request = new Request('http://localhost/api/people?q=engineer');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(1);
    });

    it('should use fuzzy matching when no exact matches found', async () => {
      vi.mocked(prisma.person.findMany).mockResolvedValue([
        {
          id: 'person-1',
          names: ['Jonathan'],
          emails: ['jonathan@example.com'],
          title: null,
          organization: null,
        },
      ] as any);

      const request = new Request('http://localhost/api/people?q=johnatan'); // Typo
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata.usedFuzzyMatch).toBe(true);
    });

    it('should filter by userId for multi-tenant isolation', async () => {
      vi.mocked(prisma.person.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/people?q=test');
      await GET(request);

      expect(prisma.person.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            deletedAt: null,
          }),
        })
      );
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.person.findMany).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/people?q=test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should limit results to 10', async () => {
      const manyPeople = Array.from({ length: 20 }, (_, i) => ({
        id: `person-${i}`,
        names: [`John ${i}`],
        emails: [`john${i}@example.com`],
        title: null,
        organization: null,
      }));

      vi.mocked(prisma.person.findMany).mockResolvedValue(manyPeople as any);

      const request = new Request('http://localhost/api/people?q=john');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.length).toBeLessThanOrEqual(10);
    });

    it('should handle person with no title', async () => {
      vi.mocked(prisma.person.findMany).mockResolvedValue([
        {
          id: 'person-1',
          names: ['John Doe'],
          emails: ['john@example.com'],
          title: null,
          organization: null,
        },
      ] as any);

      const request = new Request('http://localhost/api/people?q=john');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should handle empty email array in fuzzy search', async () => {
      vi.mocked(prisma.person.findMany).mockResolvedValue([
        {
          id: 'person-1',
          names: ['Xyz Unknown'],
          emails: [],
          title: 'Something',
          organization: null,
        },
      ] as any);

      const request = new Request('http://localhost/api/people?q=nosuchmatch');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });
});
