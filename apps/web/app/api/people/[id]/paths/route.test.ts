/**
 * Tests for People Paths API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock graph service
vi.mock('@/lib/graph-service', () => ({
  createGraphService: vi.fn(),
}));

import { auth } from '@/lib/auth';
import { createGraphService } from '@/lib/graph-service';

describe('People Paths API', () => {
  const mockUserId = 'user-123';
  const mockPersonId = '550e8400-e29b-41d4-a716-446655440000';
  const mockTargetId = '550e8400-e29b-41d4-a716-446655440001';

  const mockGraphService = {
    findPaths: vi.fn(),
  };

  const createRequest = (targetId?: string, maxHops?: string, minStrength?: string) => {
    const params = new URLSearchParams();
    if (targetId) params.set('target', targetId);
    if (maxHops) params.set('maxHops', maxHops);
    if (minStrength) params.set('minStrength', minStrength);

    return new Request(`http://localhost/api/people/${mockPersonId}/paths?${params.toString()}`);
  };

  const createContext = () => ({
    params: Promise.resolve({ id: mockPersonId }),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);
    vi.mocked(createGraphService).mockReturnValue(mockGraphService as any);
  });

  describe('GET /api/people/[id]/paths', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await GET(createRequest(mockTargetId), createContext());

      expect(response.status).toBe(401);
    });

    it('should return 400 when target is missing', async () => {
      const response = await GET(createRequest(), createContext());
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('should return 400 when target is not a valid UUID', async () => {
      const response = await GET(createRequest('invalid-uuid'), createContext());
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('should find paths with default parameters', async () => {
      const mockPaths = {
        paths: [
          {
            nodes: [mockPersonId, mockTargetId],
            strength: 0.8,
          },
        ],
        totalPaths: 1,
      };

      mockGraphService.findPaths.mockResolvedValue(mockPaths);

      const response = await GET(createRequest(mockTargetId), createContext());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.paths).toHaveLength(1);
      expect(mockGraphService.findPaths).toHaveBeenCalledWith(
        mockPersonId,
        mockTargetId,
        { maxHops: 3, minStrength: 0.3 }
      );
    });

    it('should use custom maxHops and minStrength', async () => {
      mockGraphService.findPaths.mockResolvedValue({ paths: [] });

      await GET(createRequest(mockTargetId, '5', '0.5'), createContext());

      expect(mockGraphService.findPaths).toHaveBeenCalledWith(
        mockPersonId,
        mockTargetId,
        { maxHops: 5, minStrength: 0.5 }
      );
    });

    it('should return 400 when maxHops exceeds maximum', async () => {
      const response = await GET(createRequest(mockTargetId, '10'), createContext());
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('should return 400 when minStrength is out of range', async () => {
      const response = await GET(createRequest(mockTargetId, '3', '1.5'), createContext());
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('should pass userId to graph service for isolation', async () => {
      mockGraphService.findPaths.mockResolvedValue({ paths: [] });

      await GET(createRequest(mockTargetId), createContext());

      expect(createGraphService).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle internal errors', async () => {
      mockGraphService.findPaths.mockRejectedValue(new Error('Graph error'));

      const response = await GET(createRequest(mockTargetId), createContext());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
