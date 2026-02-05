/**
 * Tests for Data Sources API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock('@wig/db', () => ({
  prisma: {
    dataSourceConnection: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@wig/db';

describe('Data Sources API', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);
  });

  describe('GET /api/data-sources', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request('http://localhost/api/data-sources');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return empty array when no connections', async () => {
      vi.mocked(prisma.dataSourceConnection.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/data-sources');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.connections).toEqual([]);
    });

    it('should return user connections', async () => {
      const mockConnections = [
        {
          id: 'conn-1',
          sourceType: 'LINKEDIN',
          connectionStatus: 'CONNECTED',
          privacyLevel: 'PRIVATE',
          lastSyncedAt: new Date('2026-01-01'),
          metadata: { jobCount: 5 },
          createdAt: new Date('2025-12-01'),
          updatedAt: new Date('2026-01-01'),
        },
      ];

      vi.mocked(prisma.dataSourceConnection.findMany).mockResolvedValue(mockConnections);

      const request = new Request('http://localhost/api/data-sources');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.connections).toHaveLength(1);
      expect(data.connections[0].sourceType).toBe('LINKEDIN');
    });

    it('should filter by userId', async () => {
      vi.mocked(prisma.dataSourceConnection.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/data-sources');
      await GET(request);

      expect(prisma.dataSourceConnection.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.dataSourceConnection.findMany).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/data-sources');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch data sources');
    });
  });

  describe('POST /api/data-sources', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request('http://localhost/api/data-sources', {
        method: 'POST',
        body: JSON.stringify({ sourceType: 'LINKEDIN' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 400 when sourceType is missing', async () => {
      const request = new Request('http://localhost/api/data-sources', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('sourceType is required');
    });

    it('should create new connection when none exists', async () => {
      const mockConnection = {
        id: 'conn-new',
        userId: mockUserId,
        sourceType: 'GMAIL',
        connectionStatus: 'DISCONNECTED',
        privacyLevel: 'PRIVATE',
        lastSyncedAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.dataSourceConnection.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.dataSourceConnection.create).mockResolvedValue(mockConnection);

      const request = new Request('http://localhost/api/data-sources', {
        method: 'POST',
        body: JSON.stringify({ sourceType: 'GMAIL' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.connection.sourceType).toBe('GMAIL');
      expect(prisma.dataSourceConnection.create).toHaveBeenCalled();
    });

    it('should update existing connection', async () => {
      const existingConnection = {
        id: 'conn-existing',
        userId: mockUserId,
        sourceType: 'LINKEDIN',
        connectionStatus: 'CONNECTED',
        privacyLevel: 'PRIVATE',
        lastSyncedAt: new Date(),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedConnection = {
        ...existingConnection,
        privacyLevel: 'SHARED',
      };

      vi.mocked(prisma.dataSourceConnection.findUnique).mockResolvedValue(existingConnection);
      vi.mocked(prisma.dataSourceConnection.update).mockResolvedValue(updatedConnection);

      const request = new Request('http://localhost/api/data-sources', {
        method: 'POST',
        body: JSON.stringify({ sourceType: 'LINKEDIN', privacyLevel: 'SHARED' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.connection.privacyLevel).toBe('SHARED');
      expect(prisma.dataSourceConnection.update).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.dataSourceConnection.findUnique).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/data-sources', {
        method: 'POST',
        body: JSON.stringify({ sourceType: 'LINKEDIN' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create/update data source');
    });
  });
});
