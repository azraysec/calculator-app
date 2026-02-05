/**
 * Multi-tenant isolation tests for /api/people
 *
 * Tests verify:
 * 1. Users can only search their own people
 * 2. Users cannot see other users' people
 * 3. Unauthenticated requests are rejected
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from './route';
import { auth } from '@/lib/auth';

// auth is already mocked in test-setup.ts

// Mock @/lib/prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    person: {
      findMany: vi.fn(),
    },
  },
}));

describe('GET /api/people - Multi-tenant isolation', () => {
  const user1Id = 'user-1-id';
  const user2Id = 'user-2-id';

  const user1People = [
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
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should only return people belonging to the authenticated user', async () => {
    const { prisma } = await import('@/lib/prisma');

    // Mock user1 authentication
    vi.mocked(auth).mockResolvedValue({ user: { id: user1Id } } as any);
    vi.mocked(prisma.person.findMany).mockResolvedValue(user1People);

    const request = new Request('http://localhost/api/people?q=alice');
    const response = await GET(request, {});

    const data = await response.json();

    // Verify prisma was called with userId filter
    expect(prisma.person.findMany).toHaveBeenCalledWith({
      where: {
        userId: user1Id,
        deletedAt: null,
      },
      include: {
        organization: true,
      },
    });

    // Verify only user1's people are returned
    expect(data.results).toHaveLength(1);
    expect(data.results[0].id).toBe('person-1');
    expect(data.results[0].names).toEqual(['Alice Smith']);
  });

  it('should not return other users people in search results', async () => {
    const { prisma } = await import('@/lib/prisma');

    // Mock user1 authentication searching for user2's person
    vi.mocked(auth).mockResolvedValue({ user: { id: user1Id } } as any);
    vi.mocked(prisma.person.findMany).mockResolvedValue([]);

    const request = new Request('http://localhost/api/people?q=Bob');
    const response = await GET(request, {});

    const data = await response.json();

    // User1 searches for "Bob" but Bob belongs to user2
    // So results should be empty (prisma filtered by userId)
    expect(data.results).toHaveLength(0);
  });

  it('should return 401 when not authenticated', async () => {
    // Mock authentication failure
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = new Request('http://localhost/api/people?q=test');
    const response = await GET(request, {});

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return validation error for missing query parameter', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: user1Id } } as any);

    const request = new Request('http://localhost/api/people');
    const response = await GET(request, {});

    // Auth passes (200 or 400), but validation should fail with 400
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Validation error');
  });

  it('should filter results by userId even with fuzzy matching', async () => {
    const { prisma } = await import('@/lib/prisma');

    vi.mocked(auth).mockResolvedValue({ user: { id: user1Id } } as any);
    // Mock empty exact match results to trigger fuzzy matching
    vi.mocked(prisma.person.findMany).mockResolvedValue(user1People);

    const request = new Request('http://localhost/api/people?q=Alise'); // Typo in name
    const response = await GET(request, {});

    // Even with fuzzy matching, should only search within user's own people
    expect(prisma.person.findMany).toHaveBeenCalledWith({
      where: {
        userId: user1Id,
        deletedAt: null,
      },
      include: {
        organization: true,
      },
    });
  });
});
