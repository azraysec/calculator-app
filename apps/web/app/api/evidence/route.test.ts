/**
 * Tests for Evidence API endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock('@wig/db', () => ({
  prisma: {
    edge: {
      findMany: vi.fn(),
    },
    evidenceEvent: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@wig/db';

describe('Evidence API', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);
  });

  describe('GET /api/evidence', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request('http://localhost/api/evidence?edgeIds=edge-1');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return 400 when edgeIds parameter is missing', async () => {
      const request = new Request('http://localhost/api/evidence');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('edgeIds parameter is required');
    });

    it('should return 400 when edgeIds is empty', async () => {
      // Empty string is falsy so triggers the required parameter check
      const request = new Request('http://localhost/api/evidence?edgeIds=');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('edgeIds parameter is required');
    });

    it('should return empty array when no edges match', async () => {
      vi.mocked(prisma.edge.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/evidence?edgeIds=non-existent');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.edges).toEqual([]);
    });

    it('should return evidence for specified edges', async () => {
      const mockEdge = {
        id: 'edge-1',
        fromPersonId: 'person-1',
        toPersonId: 'person-2',
        fromPerson: { id: 'person-1', names: ['Alice'] },
        toPerson: { id: 'person-2', names: ['Bob'] },
      };

      const mockEvidence = [
        {
          id: 'ev-1',
          type: 'linkedin_connection',
          timestamp: new Date('2026-01-01'),
          source: 'linkedin',
          metadata: { connectionDate: '2020-01-15' },
        },
      ];

      vi.mocked(prisma.edge.findMany).mockResolvedValue([mockEdge]);
      vi.mocked(prisma.evidenceEvent.findMany).mockResolvedValue(mockEvidence);

      const request = new Request('http://localhost/api/evidence?edgeIds=edge-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.edges).toHaveLength(1);
      expect(data.edges[0].edgeId).toBe('edge-1');
      expect(data.edges[0].fromPersonName).toBe('Alice');
      expect(data.edges[0].toPersonName).toBe('Bob');
      expect(data.edges[0].evidence).toHaveLength(1);
    });

    it('should filter evidence by userId for privacy', async () => {
      const mockEdge = {
        id: 'edge-1',
        fromPersonId: 'person-1',
        toPersonId: 'person-2',
        fromPerson: { id: 'person-1', names: ['Alice'] },
        toPerson: { id: 'person-2', names: ['Bob'] },
      };

      vi.mocked(prisma.edge.findMany).mockResolvedValue([mockEdge]);
      vi.mocked(prisma.evidenceEvent.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/evidence?edgeIds=edge-1');
      await GET(request);

      // Verify userId filter was applied
      expect(prisma.evidenceEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
          }),
        })
      );
    });

    it('should handle multiple edgeIds', async () => {
      const mockEdges = [
        {
          id: 'edge-1',
          fromPersonId: 'person-1',
          toPersonId: 'person-2',
          fromPerson: { id: 'person-1', names: ['Alice'] },
          toPerson: { id: 'person-2', names: ['Bob'] },
        },
        {
          id: 'edge-2',
          fromPersonId: 'person-3',
          toPersonId: 'person-4',
          fromPerson: { id: 'person-3', names: ['Charlie'] },
          toPerson: { id: 'person-4', names: ['Diana'] },
        },
      ];

      vi.mocked(prisma.edge.findMany).mockResolvedValue(mockEdges);
      vi.mocked(prisma.evidenceEvent.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/evidence?edgeIds=edge-1,edge-2');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.edges).toHaveLength(2);
    });

    it('should use Unknown for persons without names', async () => {
      const mockEdge = {
        id: 'edge-1',
        fromPersonId: 'person-1',
        toPersonId: 'person-2',
        fromPerson: { id: 'person-1', names: [] },
        toPerson: { id: 'person-2', names: [] },
      };

      vi.mocked(prisma.edge.findMany).mockResolvedValue([mockEdge]);
      vi.mocked(prisma.evidenceEvent.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/evidence?edgeIds=edge-1');
      const response = await GET(request);
      const data = await response.json();

      expect(data.edges[0].fromPersonName).toBe('Unknown');
      expect(data.edges[0].toPersonName).toBe('Unknown');
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.edge.findMany).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/evidence?edgeIds=edge-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
