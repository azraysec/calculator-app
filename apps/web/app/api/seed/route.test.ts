/**
 * Tests for Database Seed API endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    edge: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    interaction: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      count: vi.fn(),
    },
    person: {
      deleteMany: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    organization: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    user: {
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

describe('Seed API', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createRequest = (authHeader?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authHeader) {
      headers['authorization'] = authHeader;
    }
    return new Request('http://localhost/api/seed', {
      method: 'POST',
      headers,
    });
  };

  describe('POST /api/seed', () => {
    it('should return 401 without authorization', async () => {
      const response = await POST(createRequest());
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 with invalid authorization', async () => {
      const response = await POST(createRequest('Bearer invalid-token'));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should accept default dev-seed-secret when SEED_SECRET not set', async () => {
      vi.mocked(prisma.edge.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.interaction.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.person.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.organization.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.user.upsert).mockResolvedValue({ id: 'user-1' } as any);
      vi.mocked(prisma.organization.create).mockResolvedValue({ id: 'org-1' } as any);
      vi.mocked(prisma.person.upsert).mockResolvedValue({ id: 'me' } as any);
      vi.mocked(prisma.person.create).mockResolvedValue({ id: 'person-1' } as any);
      vi.mocked(prisma.edge.create).mockResolvedValue({} as any);
      vi.mocked(prisma.interaction.createMany).mockResolvedValue({ count: 3 });
      vi.mocked(prisma.person.count).mockResolvedValue(5);
      vi.mocked(prisma.edge.count).mockResolvedValue(6);
      vi.mocked(prisma.organization.count).mockResolvedValue(2);
      vi.mocked(prisma.interaction.count).mockResolvedValue(3);

      const response = await POST(createRequest('Bearer dev-seed-secret'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should accept custom SEED_SECRET from environment', async () => {
      process.env.SEED_SECRET = 'custom-secret';

      vi.mocked(prisma.edge.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.interaction.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.person.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.organization.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.user.upsert).mockResolvedValue({ id: 'user-1' } as any);
      vi.mocked(prisma.organization.create).mockResolvedValue({ id: 'org-1' } as any);
      vi.mocked(prisma.person.upsert).mockResolvedValue({ id: 'me' } as any);
      vi.mocked(prisma.person.create).mockResolvedValue({ id: 'person-1' } as any);
      vi.mocked(prisma.edge.create).mockResolvedValue({} as any);
      vi.mocked(prisma.interaction.createMany).mockResolvedValue({ count: 3 });
      vi.mocked(prisma.person.count).mockResolvedValue(5);
      vi.mocked(prisma.edge.count).mockResolvedValue(6);
      vi.mocked(prisma.organization.count).mockResolvedValue(2);
      vi.mocked(prisma.interaction.count).mockResolvedValue(3);

      const response = await POST(createRequest('Bearer custom-secret'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should seed database and return stats', async () => {
      vi.mocked(prisma.edge.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.interaction.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.person.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.organization.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.user.upsert).mockResolvedValue({ id: 'user-1' } as any);
      vi.mocked(prisma.organization.create).mockResolvedValue({ id: 'org-1' } as any);
      vi.mocked(prisma.person.upsert).mockResolvedValue({ id: 'me' } as any);
      vi.mocked(prisma.person.create).mockResolvedValue({ id: 'person-1' } as any);
      vi.mocked(prisma.edge.create).mockResolvedValue({} as any);
      vi.mocked(prisma.interaction.createMany).mockResolvedValue({ count: 3 });
      vi.mocked(prisma.person.count).mockResolvedValue(5);
      vi.mocked(prisma.edge.count).mockResolvedValue(6);
      vi.mocked(prisma.organization.count).mockResolvedValue(2);
      vi.mocked(prisma.interaction.count).mockResolvedValue(3);

      const response = await POST(createRequest('Bearer dev-seed-secret'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stats.people).toBe(5);
      expect(data.stats.organizations).toBe(2);
    });

    it('should clear existing data before seeding', async () => {
      vi.mocked(prisma.edge.deleteMany).mockResolvedValue({ count: 10 });
      vi.mocked(prisma.interaction.deleteMany).mockResolvedValue({ count: 20 });
      vi.mocked(prisma.person.deleteMany).mockResolvedValue({ count: 5 });
      vi.mocked(prisma.organization.deleteMany).mockResolvedValue({ count: 2 });
      vi.mocked(prisma.user.upsert).mockResolvedValue({ id: 'user-1' } as any);
      vi.mocked(prisma.organization.create).mockResolvedValue({ id: 'org-1' } as any);
      vi.mocked(prisma.person.upsert).mockResolvedValue({ id: 'me' } as any);
      vi.mocked(prisma.person.create).mockResolvedValue({ id: 'person-1' } as any);
      vi.mocked(prisma.edge.create).mockResolvedValue({} as any);
      vi.mocked(prisma.interaction.createMany).mockResolvedValue({ count: 3 });
      vi.mocked(prisma.person.count).mockResolvedValue(5);
      vi.mocked(prisma.edge.count).mockResolvedValue(6);
      vi.mocked(prisma.organization.count).mockResolvedValue(2);
      vi.mocked(prisma.interaction.count).mockResolvedValue(3);

      await POST(createRequest('Bearer dev-seed-secret'));

      // Verify delete operations were called
      expect(prisma.edge.deleteMany).toHaveBeenCalled();
      expect(prisma.interaction.deleteMany).toHaveBeenCalled();
      expect(prisma.person.deleteMany).toHaveBeenCalled();
      expect(prisma.organization.deleteMany).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.edge.deleteMany).mockRejectedValue(new Error('Connection failed'));

      const response = await POST(createRequest('Bearer dev-seed-secret'));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to seed database');
      expect(data.details).toBe('Connection failed');
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(prisma.edge.deleteMany).mockRejectedValue('String error');

      const response = await POST(createRequest('Bearer dev-seed-secret'));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to seed database');
      expect(data.details).toBe('Unknown error');
    });

    it('should create organizations and people', async () => {
      vi.mocked(prisma.edge.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.interaction.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.person.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.organization.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.user.upsert).mockResolvedValue({ id: 'user-1' } as any);
      vi.mocked(prisma.organization.create).mockResolvedValue({ id: 'org-1' } as any);
      vi.mocked(prisma.person.upsert).mockResolvedValue({ id: 'me' } as any);
      vi.mocked(prisma.person.create).mockResolvedValue({ id: 'person-1' } as any);
      vi.mocked(prisma.edge.create).mockResolvedValue({} as any);
      vi.mocked(prisma.interaction.createMany).mockResolvedValue({ count: 3 });
      vi.mocked(prisma.person.count).mockResolvedValue(5);
      vi.mocked(prisma.edge.count).mockResolvedValue(6);
      vi.mocked(prisma.organization.count).mockResolvedValue(2);
      vi.mocked(prisma.interaction.count).mockResolvedValue(3);

      await POST(createRequest('Bearer dev-seed-secret'));

      // Should create 2 organizations
      expect(prisma.organization.create).toHaveBeenCalledTimes(2);
      // Should create 4 people (1 upsert for 'me', 4 creates for others)
      expect(prisma.person.create).toHaveBeenCalledTimes(4);
      // Should create 6 edges
      expect(prisma.edge.create).toHaveBeenCalledTimes(6);
    });
  });
});
