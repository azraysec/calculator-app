/**
 * Tests for Network Overview API
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
    edge: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

describe('Network API', () => {
  const mockUserId = 'user-123';

  const createRequest = () => {
    return new Request('http://localhost/api/network', {
      method: 'GET',
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);
  });

  describe('GET /api/network', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await GET(createRequest());

      expect(response.status).toBe(401);
    });

    it('should return network data with stats', async () => {
      const mockPeople = [
        {
          id: 'person-1',
          names: ['Alice'],
          emails: ['alice@example.com'],
          phones: [],
          title: 'Engineer',
          organization: { id: 'org-1', name: 'Company A' },
          socialHandles: { linkedin: 'alice' },
          createdAt: new Date(),
        },
        {
          id: 'person-2',
          names: ['Bob'],
          emails: ['bob@example.com'],
          phones: ['+1234567890'],
          title: null,
          organization: null,
          socialHandles: null,
          createdAt: new Date(),
        },
      ];

      const mockEdges = [
        {
          id: 'edge-1',
          fromPersonId: 'person-1',
          toPersonId: 'person-2',
          relationshipType: 'knows',
          strength: 0.8,
          channels: ['email'],
          interactionCount: 10,
          lastSeenAt: new Date(),
        },
      ];

      vi.mocked(prisma.person.findMany).mockResolvedValue(mockPeople as any);
      vi.mocked(prisma.edge.findMany).mockResolvedValue(mockEdges as any);

      const response = await GET(createRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.people).toHaveLength(2);
      expect(data.edges).toHaveLength(1);
      expect(data.stats.totalPeople).toBe(2);
      expect(data.stats.totalConnections).toBe(1);
      expect(data.stats.strongConnections).toBe(1); // strength >= 0.7
    });

    it('should filter by userId for multi-tenant isolation', async () => {
      vi.mocked(prisma.person.findMany).mockResolvedValue([]);
      vi.mocked(prisma.edge.findMany).mockResolvedValue([]);

      await GET(createRequest());

      expect(prisma.person.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            deletedAt: null,
          }),
        })
      );
    });

    it('should filter edges by person IDs', async () => {
      const mockPeople = [
        { id: 'person-1', names: ['Alice'], emails: [], phones: [], organization: null },
        { id: 'person-2', names: ['Bob'], emails: [], phones: [], organization: null },
      ];

      vi.mocked(prisma.person.findMany).mockResolvedValue(mockPeople as any);
      vi.mocked(prisma.edge.findMany).mockResolvedValue([]);

      await GET(createRequest());

      expect(prisma.edge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fromPersonId: { in: ['person-1', 'person-2'] },
            toPersonId: { in: ['person-1', 'person-2'] },
          }),
        })
      );
    });

    it('should calculate connection statistics correctly', async () => {
      vi.mocked(prisma.person.findMany).mockResolvedValue([
        { id: 'p1', names: [], emails: [], phones: [], organization: null },
        { id: 'p2', names: [], emails: [], phones: [], organization: null },
        { id: 'p3', names: [], emails: [], phones: [], organization: null },
      ] as any);

      vi.mocked(prisma.edge.findMany).mockResolvedValue([
        { id: 'e1', fromPersonId: 'p1', toPersonId: 'p2', strength: 0.9, channels: [], interactionCount: 5, lastSeenAt: new Date() },
        { id: 'e2', fromPersonId: 'p2', toPersonId: 'p3', strength: 0.5, channels: [], interactionCount: 3, lastSeenAt: new Date() },
        { id: 'e3', fromPersonId: 'p1', toPersonId: 'p3', strength: 0.2, channels: [], interactionCount: 1, lastSeenAt: new Date() },
      ] as any);

      const response = await GET(createRequest());
      const data = await response.json();

      expect(data.stats.strongConnections).toBe(1); // >= 0.7
      expect(data.stats.mediumConnections).toBe(1); // >= 0.4 && < 0.7
      expect(data.stats.weakConnections).toBe(1); // < 0.4
    });

    it('should group people by organization', async () => {
      vi.mocked(prisma.person.findMany).mockResolvedValue([
        { id: 'p1', names: ['A'], emails: [], phones: [], organization: { id: 'org-1', name: 'Company A' } },
        { id: 'p2', names: ['B'], emails: [], phones: [], organization: { id: 'org-1', name: 'Company A' } },
        { id: 'p3', names: ['C'], emails: [], phones: [], organization: null },
      ] as any);
      vi.mocked(prisma.edge.findMany).mockResolvedValue([]);

      const response = await GET(createRequest());
      const data = await response.json();

      expect(data.organizationGroups).toContainEqual({ name: 'Company A', count: 2 });
      expect(data.organizationGroups).toContainEqual({ name: 'No Organization', count: 1 });
    });

    it('should handle database errors for people', async () => {
      vi.mocked(prisma.person.findMany).mockRejectedValue(new Error('DB error'));

      const response = await GET(createRequest());
      const data = await response.json();

      // The route catches errors and returns empty arrays
      expect(response.status).toBe(200);
      expect(data.people).toEqual([]);
    });

    it('should handle database errors for edges', async () => {
      vi.mocked(prisma.person.findMany).mockResolvedValue([
        { id: 'p1', names: [], emails: [], phones: [], organization: null },
      ] as any);
      vi.mocked(prisma.edge.findMany).mockRejectedValue(new Error('DB error'));

      const response = await GET(createRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.edges).toEqual([]);
    });

    it('should handle empty network', async () => {
      vi.mocked(prisma.person.findMany).mockResolvedValue([]);
      vi.mocked(prisma.edge.findMany).mockResolvedValue([]);

      const response = await GET(createRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.people).toEqual([]);
      expect(data.edges).toEqual([]);
      expect(data.stats.totalPeople).toBe(0);
      expect(data.stats.averageConnectionsPerPerson).toBe(0);
    });
  });
});
