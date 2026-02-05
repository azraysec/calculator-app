/**
 * Tests for Data Source by ID API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from './route';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock('@wig/db', () => ({
  prisma: {
    dataSourceConnection: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@wig/db';

describe('Data Source by ID API', () => {
  const mockUserId = 'user-123';
  const mockConnectionId = 'conn-456';

  const createRequest = (method: string = 'GET', body?: any) => {
    const options: RequestInit = { method };
    if (body) {
      options.body = JSON.stringify(body);
    }
    return new Request(`http://localhost/api/data-sources/${mockConnectionId}`, options);
  };

  // Matches Next.js context pattern - params is a Promise
  const createContext = (id?: string) => ({
    params: Promise.resolve({ id: id || mockConnectionId }),
  } as any);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);
  });

  describe('GET /api/data-sources/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await GET(createRequest(), createContext());

      expect(response.status).toBe(401);
    });

    it('should return 404 when connection not found', async () => {
      vi.mocked(prisma.dataSourceConnection.findUnique).mockResolvedValue(null);

      const response = await GET(createRequest(), createContext());
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Data source not found');
    });

    it('should return 403 when user does not own connection', async () => {
      vi.mocked(prisma.dataSourceConnection.findUnique).mockResolvedValue({
        id: mockConnectionId,
        userId: 'other-user',
        sourceType: 'LINKEDIN',
        connectionStatus: 'CONNECTED',
        privacyLevel: 'PRIVATE',
        lastSyncedAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await GET(createRequest(), createContext());
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return connection when user owns it', async () => {
      const mockConnection = {
        id: mockConnectionId,
        userId: mockUserId,
        sourceType: 'LINKEDIN',
        connectionStatus: 'CONNECTED',
        privacyLevel: 'PRIVATE',
        lastSyncedAt: new Date('2026-01-01'),
        metadata: { syncCount: 3 },
        createdAt: new Date('2025-12-01'),
        updatedAt: new Date('2026-01-01'),
      };

      vi.mocked(prisma.dataSourceConnection.findUnique).mockResolvedValue(mockConnection);

      const response = await GET(createRequest(), createContext());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.connection.id).toBe(mockConnectionId);
      expect(data.connection.sourceType).toBe('LINKEDIN');
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.dataSourceConnection.findUnique).mockRejectedValue(new Error('DB error'));

      const response = await GET(createRequest(), createContext());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch data source');
    });

    it('should return 400 when id is missing', async () => {
      const response = await GET(createRequest(), { params: Promise.resolve({ id: '' }) } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Data source ID is required');
    });
  });

  describe('PATCH /api/data-sources/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await PATCH(createRequest('PATCH', { privacyLevel: 'SHARED' }), createContext());

      expect(response.status).toBe(401);
    });

    it('should return 404 when connection not found', async () => {
      vi.mocked(prisma.dataSourceConnection.findUnique).mockResolvedValue(null);

      const response = await PATCH(createRequest('PATCH', { privacyLevel: 'SHARED' }), createContext());
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Data source not found');
    });

    it('should return 403 when user does not own connection', async () => {
      vi.mocked(prisma.dataSourceConnection.findUnique).mockResolvedValue({
        id: mockConnectionId,
        userId: 'other-user',
        sourceType: 'LINKEDIN',
        connectionStatus: 'CONNECTED',
        privacyLevel: 'PRIVATE',
        lastSyncedAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await PATCH(createRequest('PATCH', { privacyLevel: 'SHARED' }), createContext());

      expect(response.status).toBe(403);
    });

    it('should update connection settings', async () => {
      const existingConnection = {
        id: mockConnectionId,
        userId: mockUserId,
        sourceType: 'LINKEDIN',
        connectionStatus: 'CONNECTED',
        privacyLevel: 'PRIVATE',
        lastSyncedAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedConnection = {
        ...existingConnection,
        privacyLevel: 'SHARED',
      };

      vi.mocked(prisma.dataSourceConnection.findUnique).mockResolvedValue(existingConnection);
      vi.mocked(prisma.dataSourceConnection.update).mockResolvedValue(updatedConnection);

      const response = await PATCH(createRequest('PATCH', { privacyLevel: 'SHARED' }), createContext());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.connection.privacyLevel).toBe('SHARED');
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.dataSourceConnection.findUnique).mockRejectedValue(new Error('DB error'));

      const response = await PATCH(createRequest('PATCH', { privacyLevel: 'SHARED' }), createContext());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update data source');
    });

    it('should return 400 when id is missing', async () => {
      const response = await PATCH(createRequest('PATCH', { privacyLevel: 'SHARED' }), { params: Promise.resolve({ id: '' }) } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Data source ID is required');
    });
  });

  describe('DELETE /api/data-sources/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await DELETE(createRequest('DELETE'), createContext());

      expect(response.status).toBe(401);
    });

    it('should return 404 when connection not found', async () => {
      vi.mocked(prisma.dataSourceConnection.findUnique).mockResolvedValue(null);

      const response = await DELETE(createRequest('DELETE'), createContext());
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Data source not found');
    });

    it('should return 403 when user does not own connection', async () => {
      vi.mocked(prisma.dataSourceConnection.findUnique).mockResolvedValue({
        id: mockConnectionId,
        userId: 'other-user',
        sourceType: 'LINKEDIN',
        connectionStatus: 'CONNECTED',
        privacyLevel: 'PRIVATE',
        lastSyncedAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await DELETE(createRequest('DELETE'), createContext());

      expect(response.status).toBe(403);
    });

    it('should delete connection when user owns it', async () => {
      vi.mocked(prisma.dataSourceConnection.findUnique).mockResolvedValue({
        id: mockConnectionId,
        userId: mockUserId,
        sourceType: 'LINKEDIN',
        connectionStatus: 'CONNECTED',
        privacyLevel: 'PRIVATE',
        lastSyncedAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.dataSourceConnection.delete).mockResolvedValue({} as any);

      const response = await DELETE(createRequest('DELETE'), createContext());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.dataSourceConnection.delete).toHaveBeenCalledWith({
        where: { id: mockConnectionId },
      });
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.dataSourceConnection.findUnique).mockRejectedValue(new Error('DB error'));

      const response = await DELETE(createRequest('DELETE'), createContext());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete data source');
    });

    it('should return 400 when id is missing', async () => {
      const response = await DELETE(createRequest('DELETE'), { params: Promise.resolve({ id: '' }) } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Data source ID is required');
    });
  });
});
