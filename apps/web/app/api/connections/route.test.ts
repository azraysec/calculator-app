/**
 * Unit Tests for Connections API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from './route';
import { auth } from '@/lib/auth';

// auth is already mocked in test-setup.ts

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

describe('Connections API', () => {
  const userId = 'test-user-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return connections with default pagination', async () => {
    const { prisma } = await import('@/lib/prisma');

    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as any);

    vi.mocked(prisma.person.findMany).mockResolvedValue([
      {
        id: '1',
        userId,
        names: ['John Doe'],
        emails: ['john@example.com'],
        title: 'Engineer',
        organization: { name: 'ACME Corp' },
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
        _count: {
          outgoingEdges: 5,
          incomingEdges: 3,
        },
      },
    ] as any);

    vi.mocked(prisma.person.count).mockResolvedValue(1);
    vi.mocked(prisma.edge.findMany).mockResolvedValue([
      { sources: ['linkedin_archive'], interactionCount: 5 },
    ] as any);

    const request = new Request('http://localhost:3000/api/connections');
    const response = await GET(request, {});
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.connections).toHaveLength(1);
    expect(data.pagination).toEqual({
      page: 1,
      pageSize: 50,
      totalCount: 1,
      totalPages: 1,
    });
  });

  it('should apply name filter', async () => {
    const { prisma } = await import('@/lib/prisma');

    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as any);
    vi.mocked(prisma.person.findMany).mockResolvedValue([]);
    vi.mocked(prisma.person.count).mockResolvedValue(0);

    const request = new Request(
      'http://localhost:3000/api/connections?name=John'
    );
    await GET(request, {});

    expect(prisma.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId,
          names: { hasSome: ['John'] },
        }),
      })
    );
  });

  it('should apply sorting', async () => {
    const { prisma } = await import('@/lib/prisma');

    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as any);
    vi.mocked(prisma.person.findMany).mockResolvedValue([]);
    vi.mocked(prisma.person.count).mockResolvedValue(0);

    const request = new Request(
      'http://localhost:3000/api/connections?sortBy=title&sortOrder=desc'
    );
    await GET(request, {});

    expect(prisma.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { title: 'desc' },
      })
    );
  });

  it('should apply pagination', async () => {
    const { prisma } = await import('@/lib/prisma');

    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as any);
    vi.mocked(prisma.person.findMany).mockResolvedValue([]);
    vi.mocked(prisma.person.count).mockResolvedValue(0);

    const request = new Request(
      'http://localhost:3000/api/connections?page=2&pageSize=10'
    );
    await GET(request, {});

    expect(prisma.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10, // (2-1) * 10
        take: 10,
      })
    );
  });
});
