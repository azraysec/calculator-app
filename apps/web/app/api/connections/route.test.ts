/**
 * Unit Tests for Connections API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return connections with default pagination', async () => {
    const { prisma } = await import('@/lib/prisma');

    (prisma.person.findMany as any).mockResolvedValue([
      {
        id: '1',
        names: ['John Doe'],
        emails: ['john@example.com'],
        title: 'Engineer',
        organization: { name: 'ACME Corp' },
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
        _count: {
          edgesFrom: 5,
          edgesTo: 3,
          evidenceEventsAsSubject: 10,
          evidenceEventsAsObject: 8,
        },
      },
    ]);

    (prisma.person.count as any).mockResolvedValue(1);
    (prisma.edge.findMany as any).mockResolvedValue([
      { sources: ['linkedin_archive'] },
    ]);

    const request = new NextRequest('http://localhost:3000/api/connections');
    const response = await GET(request);
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

    const request = new NextRequest(
      'http://localhost:3000/api/connections?name=John'
    );
    await GET(request);

    expect(prisma.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          names: { hasSome: ['John'] },
        }),
      })
    );
  });

  it('should apply sorting', async () => {
    const { prisma } = await import('@/lib/prisma');

    const request = new NextRequest(
      'http://localhost:3000/api/connections?sortBy=title&sortOrder=desc'
    );
    await GET(request);

    expect(prisma.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { title: 'desc' },
      })
    );
  });

  it('should apply pagination', async () => {
    const { prisma } = await import('@/lib/prisma');

    const request = new NextRequest(
      'http://localhost:3000/api/connections?page=2&pageSize=10'
    );
    await GET(request);

    expect(prisma.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10, // (2-1) * 10
        take: 10,
      })
    );
  });
});
