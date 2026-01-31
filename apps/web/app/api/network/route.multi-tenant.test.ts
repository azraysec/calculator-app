/**
 * Multi-tenant isolation tests for /api/network
 *
 * Tests verify:
 * 1. Users can only see their own network graph
 * 2. Edges only connect people within the same tenant
 * 3. Statistics are scoped to the user's data
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from './route';
import { prisma } from '@/lib/prisma';
import * as authHelpers from '@/lib/auth-helpers';

// Mock auth helper
vi.mock('@/lib/auth-helpers', async () => {
  const actual = await vi.importActual('@/lib/auth-helpers');
  return {
    ...actual,
    getAuthenticatedUserId: vi.fn(),
  };
});

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    person: {
      findMany: vi.fn(),
    },
    edge: {
      findMany: vi.fn(),
    },
  },
}));

describe('GET /api/network - Multi-tenant isolation', () => {
  const user1Id = 'user-1-id';
  const user2Id = 'user-2-id';

  const user1People = [
    {
      id: 'person-1',
      userId: user1Id,
      names: ['Alice'],
      emails: ['alice@example.com'],
      phones: [],
      title: 'Engineer',
      organizationId: 'org-1',
      organization: { id: 'org-1', name: 'Company A' },
      deletedAt: null,
      socialHandles: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'person-2',
      userId: user1Id,
      names: ['Bob'],
      emails: ['bob@example.com'],
      phones: [],
      title: 'Manager',
      organizationId: 'org-1',
      organization: { id: 'org-1', name: 'Company A' },
      deletedAt: null,
      socialHandles: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const user1Edges = [
    {
      id: 'edge-1',
      fromPersonId: 'person-1',
      toPersonId: 'person-2',
      relationshipType: 'colleague',
      strength: 0.8,
      strengthFactors: {},
      channels: ['email'],
      sources: ['gmail'],
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      interactionCount: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should only return people belonging to the authenticated user', async () => {
    vi.mocked(authHelpers.getAuthenticatedUserId).mockResolvedValue(user1Id);
    vi.mocked(prisma.person.findMany).mockResolvedValue(user1People);
    vi.mocked(prisma.edge.findMany).mockResolvedValue(user1Edges);

    const request = new Request('http://localhost/api/network');
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    expect(data.people).toHaveLength(2);
    expect(data.people[0].id).toBe('person-1');
    expect(data.people[1].id).toBe('person-2');
  });

  it('should only return edges between users own people', async () => {
    vi.mocked(authHelpers.getAuthenticatedUserId).mockResolvedValue(user1Id);
    vi.mocked(prisma.person.findMany).mockResolvedValue(user1People);
    vi.mocked(prisma.edge.findMany).mockResolvedValue(user1Edges);

    const request = new Request('http://localhost/api/network');
    const response = await GET(request, {});

    const data = await response.json();

    // Verify edges are filtered to only connect user's people
    expect(prisma.edge.findMany).toHaveBeenCalledWith({
      where: {
        fromPersonId: { in: ['person-1', 'person-2'] },
        toPersonId: { in: ['person-1', 'person-2'] },
      },
      orderBy: {
        strength: 'desc',
      },
    });

    expect(data.edges).toHaveLength(1);
    expect(data.edges[0].id).toBe('edge-1');
  });

  it('should calculate statistics scoped to user data', async () => {
    vi.mocked(authHelpers.getAuthenticatedUserId).mockResolvedValue(user1Id);
    vi.mocked(prisma.person.findMany).mockResolvedValue(user1People);
    vi.mocked(prisma.edge.findMany).mockResolvedValue(user1Edges);

    const request = new Request('http://localhost/api/network');
    const response = await GET(request, {});

    const data = await response.json();

    // Statistics should only reflect user's data
    expect(data.stats.totalPeople).toBe(2);
    expect(data.stats.totalConnections).toBe(1);
    expect(data.stats.strongConnections).toBe(1); // edge has strength 0.8
  });

  it('should return 401 when not authenticated', async () => {
    vi.mocked(authHelpers.getAuthenticatedUserId).mockRejectedValue(
      new Error('Unauthorized')
    );

    const request = new Request('http://localhost/api/network');
    const response = await GET(request, {});

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should not include edges to people from other tenants', async () => {
    // User1 has person-1 and person-2
    // User2 has person-3
    // An edge exists from person-1 to person-3 (cross-tenant)
    // This edge should NOT be returned

    const user1PeopleIds = ['person-1', 'person-2'];
    const crossTenantEdge = {
      id: 'edge-cross',
      fromPersonId: 'person-1', // user1's person
      toPersonId: 'person-3', // user2's person
      relationshipType: 'colleague',
      strength: 0.5,
      strengthFactors: {},
      channels: ['email'],
      sources: ['gmail'],
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      interactionCount: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(authHelpers.getAuthenticatedUserId).mockResolvedValue(user1Id);
    vi.mocked(prisma.person.findMany).mockResolvedValue(user1People);
    // Mock edge query that should filter out cross-tenant edges
    vi.mocked(prisma.edge.findMany).mockResolvedValue([]);

    const request = new Request('http://localhost/api/network');
    const response = await GET(request, {});

    // Verify edge query filters by user's person IDs on both sides
    expect(prisma.edge.findMany).toHaveBeenCalledWith({
      where: {
        fromPersonId: { in: user1PeopleIds },
        toPersonId: { in: user1PeopleIds },
      },
      orderBy: {
        strength: 'desc',
      },
    });

    const data = await response.json();
    expect(data.edges).toHaveLength(0); // Cross-tenant edge should not appear
  });

  it('should group people by organization within tenant scope', async () => {
    vi.mocked(authHelpers.getAuthenticatedUserId).mockResolvedValue(user1Id);
    vi.mocked(prisma.person.findMany).mockResolvedValue(user1People);
    vi.mocked(prisma.edge.findMany).mockResolvedValue(user1Edges);

    const request = new Request('http://localhost/api/network');
    const response = await GET(request, {});

    const data = await response.json();

    // Organization grouping should only include user's people
    expect(data.organizationGroups).toBeDefined();
    const companyAGroup = data.organizationGroups.find(
      (g: any) => g.name === 'Company A'
    );
    expect(companyAGroup).toBeDefined();
    expect(companyAGroup.count).toBe(2); // Alice and Bob
  });
});
