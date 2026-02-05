/**
 * Multi-tenant isolation tests for /api/connections
 *
 * Tests verify:
 * 1. Users can only see their own connections
 * 2. Pagination and filtering respect tenant boundaries
 * 3. Unauthenticated requests are rejected
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from './route';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// auth is already mocked in test-setup.ts

// Mock prisma
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

describe('GET /api/connections - Multi-tenant isolation', () => {
  const user1Id = 'user-1-id';
  const user2Id = 'user-2-id';

  const user1Connections = [
    {
      id: 'person-1',
      userId: user1Id,
      names: ['Alice Smith'],
      emails: ['alice@example.com'],
      phones: [],
      title: 'Engineer',
      organizationId: null,
      organization: null,
      deletedAt: null,
      socialHandles: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: {
        outgoingEdges: 5,
        incomingEdges: 3,
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should only return connections belonging to the authenticated user', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: user1Id } } as any);
    vi.mocked(prisma.person.findMany).mockResolvedValue(user1Connections);
    vi.mocked(prisma.person.count).mockResolvedValue(1);
    vi.mocked(prisma.edge.findMany).mockResolvedValue([]);

    const request = new Request('http://localhost/api/connections');
    const response = await GET(request, {});

    const data = await response.json();

    // Verify prisma was called with userId filter
    expect(prisma.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: user1Id,
          deletedAt: null,
        }),
      })
    );

    expect(data.connections).toHaveLength(1);
    expect(data.connections[0].id).toBe('person-1');
  });

  it('should filter by name and still respect userId boundary', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: user1Id } } as any);
    vi.mocked(prisma.person.findMany).mockResolvedValue([]);
    vi.mocked(prisma.person.count).mockResolvedValue(0);

    const request = new Request(
      'http://localhost/api/connections?name=Bob'
    );
    const response = await GET(request, {});

    // Even when filtering by name, userId filter should be present
    expect(prisma.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: user1Id,
          names: { hasSome: ['Bob'] },
        }),
      })
    );
  });

  it('should return 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = new Request('http://localhost/api/connections');
    const response = await GET(request, {});

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should respect pagination while maintaining tenant isolation', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: user1Id } } as any);
    vi.mocked(prisma.person.findMany).mockResolvedValue(user1Connections);
    vi.mocked(prisma.person.count).mockResolvedValue(50);
    vi.mocked(prisma.edge.findMany).mockResolvedValue([]);

    const request = new Request(
      'http://localhost/api/connections?page=2&pageSize=10'
    );
    const response = await GET(request, {});

    // Verify userId filter is present even with pagination
    expect(prisma.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: user1Id,
        }),
        skip: 10, // (page 2 - 1) * pageSize 10
        take: 10,
      })
    );
  });

  it('should filter by company and still respect tenant boundaries', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: user1Id } } as any);
    vi.mocked(prisma.person.findMany).mockResolvedValue([]);
    vi.mocked(prisma.person.count).mockResolvedValue(0);

    const request = new Request(
      'http://localhost/api/connections?company=Acme'
    );
    const response = await GET(request, {});

    expect(prisma.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: user1Id,
          organization: {
            name: {
              contains: 'Acme',
              mode: 'insensitive',
            },
          },
        }),
      })
    );
  });
});
