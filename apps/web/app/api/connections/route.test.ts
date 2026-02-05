/**
 * Tests for Connections API
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
      count: vi.fn(),
    },
    edge: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

describe('Connections API', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);
  });

  describe('GET /api/connections', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request('http://localhost/api/connections');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return paginated connections', async () => {
      vi.mocked(prisma.person.findMany).mockResolvedValue([
        {
          id: 'person-1',
          names: ['Alice'],
          emails: ['alice@example.com'],
          title: 'Engineer',
          organization: { name: 'Company A' },
          _count: { outgoingEdges: 5, incomingEdges: 3 },
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {},
        },
      ] as any);
      vi.mocked(prisma.person.count).mockResolvedValue(1);
      vi.mocked(prisma.edge.findMany).mockResolvedValue([
        { sources: ['linkedin'], interactionCount: 10 },
      ] as any);

      const request = new Request('http://localhost/api/connections?page=1&pageSize=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.connections).toHaveLength(1);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.pageSize).toBe(10);
    });

    it('should filter by userId for multi-tenant isolation', async () => {
      vi.mocked(prisma.person.findMany).mockResolvedValue([]);
      vi.mocked(prisma.person.count).mockResolvedValue(0);

      const request = new Request('http://localhost/api/connections');
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

    it('should filter by name', async () => {
      vi.mocked(prisma.person.findMany).mockResolvedValue([]);
      vi.mocked(prisma.person.count).mockResolvedValue(0);

      const request = new Request('http://localhost/api/connections?name=Alice');
      await GET(request);

      expect(prisma.person.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            names: { hasSome: ['Alice'] },
          }),
        })
      );
    });

    it('should filter by email', async () => {
      vi.mocked(prisma.person.findMany).mockResolvedValue([]);
      vi.mocked(prisma.person.count).mockResolvedValue(0);

      const request = new Request('http://localhost/api/connections?email=test@example.com');
      await GET(request);

      expect(prisma.person.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            emails: { hasSome: ['test@example.com'] },
          }),
        })
      );
    });

    it('should filter by title', async () => {
      vi.mocked(prisma.person.findMany).mockResolvedValue([]);
      vi.mocked(prisma.person.count).mockResolvedValue(0);

      const request = new Request('http://localhost/api/connections?title=Engineer');
      await GET(request);

      expect(prisma.person.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: { contains: 'Engineer', mode: 'insensitive' },
          }),
        })
      );
    });

    it('should filter by company', async () => {
      vi.mocked(prisma.person.findMany).mockResolvedValue([]);
      vi.mocked(prisma.person.count).mockResolvedValue(0);

      const request = new Request('http://localhost/api/connections?company=Acme');
      await GET(request);

      expect(prisma.person.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organization: { name: { contains: 'Acme', mode: 'insensitive' } },
          }),
        })
      );
    });

    it('should sort by different fields', async () => {
      vi.mocked(prisma.person.findMany).mockResolvedValue([]);
      vi.mocked(prisma.person.count).mockResolvedValue(0);

      const sortFields = ['names', 'emails', 'title', 'createdAt', 'updatedAt', 'unknown'];

      for (const sortBy of sortFields) {
        const request = new Request(`http://localhost/api/connections?sortBy=${sortBy}&sortOrder=desc`);
        await GET(request);
      }

      expect(prisma.person.findMany).toHaveBeenCalledTimes(6);
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.person.findMany).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/connections');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch connections');
    });

    it('should calculate connection and interaction counts', async () => {
      vi.mocked(prisma.person.findMany).mockResolvedValue([
        {
          id: 'person-1',
          names: ['Alice'],
          emails: [],
          title: null,
          organization: null,
          _count: { outgoingEdges: 3, incomingEdges: 2 },
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: null,
        },
      ] as any);
      vi.mocked(prisma.person.count).mockResolvedValue(1);
      vi.mocked(prisma.edge.findMany).mockResolvedValue([
        { sources: ['linkedin'], interactionCount: 5 },
        { sources: ['gmail'], interactionCount: 10 },
      ] as any);

      const request = new Request('http://localhost/api/connections');
      const response = await GET(request);
      const data = await response.json();

      expect(data.connections[0].connectionCount).toBe(5);
      expect(data.connections[0].interactionCount).toBe(15);
      expect(data.connections[0].sources).toEqual(['linkedin', 'gmail']);
    });
  });
});
