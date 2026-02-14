/**
 * Warm Intro Paths API Tests
 *
 * Tests for GET /api/paths/[targetId]
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    person: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock Pathfinder
const mockFindWarmIntroPaths = vi.fn();

vi.mock('@wig/core', () => ({
  Pathfinder: class MockPathfinder {
    findWarmIntroPaths = mockFindWarmIntroPaths;
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

describe('Warm Intro Paths API', () => {
  const mockUserId = 'user-123';
  const mockTargetId = '550e8400-e29b-41d4-a716-446655440000';

  const createRequest = (targetId: string, params?: Record<string, string>) => {
    const searchParams = new URLSearchParams(params);
    const queryString = searchParams.toString();
    const url = queryString
      ? `http://localhost/api/paths/${targetId}?${queryString}`
      : `http://localhost/api/paths/${targetId}`;
    return new Request(url);
  };

  const createContext = (targetId: string) => ({
    params: Promise.resolve({ targetId }),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);
  });

  describe('GET /api/paths/[targetId]', () => {
    it('should return 401 without authentication', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await GET(
        createRequest(mockTargetId),
        createContext(mockTargetId)
      );

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await GET(
        createRequest('invalid-uuid'),
        createContext('invalid-uuid')
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid targetId format');
    });

    it('should return 404 for non-existent targetId', async () => {
      vi.mocked(prisma.person.findFirst).mockResolvedValue(null);

      const response = await GET(
        createRequest(mockTargetId),
        createContext(mockTargetId)
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Not found');
    });

    it('should return 404 for targetId belonging to different user', async () => {
      // Even if the person exists, findFirst with userId filter returns null
      vi.mocked(prisma.person.findFirst).mockResolvedValue(null);

      const response = await GET(
        createRequest(mockTargetId),
        createContext(mockTargetId)
      );
      const data = await response.json();

      expect(response.status).toBe(404);

      // Verify the query included userId
      expect(prisma.person.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockTargetId,
          userId: mockUserId,
        },
      });
    });

    it('should return 200 with paths array on success', async () => {
      vi.mocked(prisma.person.findFirst).mockResolvedValue({
        id: mockTargetId,
        userId: mockUserId,
        names: ['Target Person'],
      } as any);

      const mockPaths = [
        {
          path: ['me', 'alice', mockTargetId],
          score: 0.85,
          explanation: 'Via Alice',
          rank: 1,
        },
      ];
      mockFindWarmIntroPaths.mockResolvedValue(mockPaths);

      const response = await GET(
        createRequest(mockTargetId),
        createContext(mockTargetId)
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.paths).toEqual(mockPaths);
    });

    it('should return 200 with empty array when no paths exist', async () => {
      vi.mocked(prisma.person.findFirst).mockResolvedValue({
        id: mockTargetId,
        userId: mockUserId,
      } as any);

      mockFindWarmIntroPaths.mockResolvedValue([]);

      const response = await GET(
        createRequest(mockTargetId),
        createContext(mockTargetId)
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.paths).toEqual([]);
    });

    it('should respect maxHops query parameter', async () => {
      vi.mocked(prisma.person.findFirst).mockResolvedValue({
        id: mockTargetId,
        userId: mockUserId,
      } as any);

      mockFindWarmIntroPaths.mockResolvedValue([]);

      await GET(
        createRequest(mockTargetId, { maxHops: '2' }),
        createContext(mockTargetId)
      );

      expect(mockFindWarmIntroPaths).toHaveBeenCalledWith(
        mockUserId,
        mockTargetId,
        { maxHops: 2, maxPaths: 5 }
      );
    });

    it('should respect maxPaths query parameter', async () => {
      vi.mocked(prisma.person.findFirst).mockResolvedValue({
        id: mockTargetId,
        userId: mockUserId,
      } as any);

      mockFindWarmIntroPaths.mockResolvedValue([]);

      await GET(
        createRequest(mockTargetId, { maxPaths: '10' }),
        createContext(mockTargetId)
      );

      expect(mockFindWarmIntroPaths).toHaveBeenCalledWith(
        mockUserId,
        mockTargetId,
        { maxHops: 3, maxPaths: 10 }
      );
    });

    it('should include score in each path result', async () => {
      vi.mocked(prisma.person.findFirst).mockResolvedValue({
        id: mockTargetId,
        userId: mockUserId,
      } as any);

      const mockPaths = [
        { path: ['me', mockTargetId], score: 0.9, explanation: 'Direct', rank: 1 },
        { path: ['me', 'alice', mockTargetId], score: 0.7, explanation: 'Via Alice', rank: 2 },
      ];
      mockFindWarmIntroPaths.mockResolvedValue(mockPaths);

      const response = await GET(
        createRequest(mockTargetId),
        createContext(mockTargetId)
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      for (const path of data.paths) {
        expect(typeof path.score).toBe('number');
        expect(path.score).toBeGreaterThanOrEqual(0);
        expect(path.score).toBeLessThanOrEqual(1);
      }
    });

    it('should include explanation in each path result', async () => {
      vi.mocked(prisma.person.findFirst).mockResolvedValue({
        id: mockTargetId,
        userId: mockUserId,
      } as any);

      const mockPaths = [
        { path: ['me', mockTargetId], score: 0.9, explanation: 'Direct connection', rank: 1 },
        { path: ['me', 'alice', mockTargetId], score: 0.7, explanation: 'Via Alice', rank: 2 },
      ];
      mockFindWarmIntroPaths.mockResolvedValue(mockPaths);

      const response = await GET(
        createRequest(mockTargetId),
        createContext(mockTargetId)
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      for (const path of data.paths) {
        expect(typeof path.explanation).toBe('string');
        expect(path.explanation.length).toBeGreaterThan(0);
      }
    });
  });
});
