/**
 * Network Overview API
 * Returns all people and connections in the graph
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth-helpers';

export const GET = withAuth(async (_request: Request, { userId }) => {
  try {
    // Use parallel queries for better performance
    // CRITICAL: All queries filter by userId for multi-tenant isolation
    const [
      people,
      totalPeopleCount,
      edgeStats,
      organizationCounts,
    ] = await Promise.all([
      // Fetch people with organizations (limited for display)
      prisma.person.findMany({
        where: {
          userId,
          deletedAt: null
        },
        include: {
          organization: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 500, // Limit for performance - paginate if needed
      }),

      // Count total people (faster than fetching all)
      prisma.person.count({
        where: {
          userId,
          deletedAt: null
        },
      }),

      // Get edge statistics using raw query for efficiency
      // This counts edges where both persons belong to the user
      prisma.$queryRaw<Array<{
        total: bigint;
        strong: bigint;
        medium: bigint;
        weak: bigint;
      }>>`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN e.strength >= 0.7 THEN 1 END) as strong,
          COUNT(CASE WHEN e.strength >= 0.4 AND e.strength < 0.7 THEN 1 END) as medium,
          COUNT(CASE WHEN e.strength < 0.4 THEN 1 END) as weak
        FROM "Edge" e
        JOIN "Person" p1 ON e."fromPersonId" = p1.id
        JOIN "Person" p2 ON e."toPersonId" = p2.id
        WHERE p1."userId" = ${userId}
          AND p2."userId" = ${userId}
          AND p1."deletedAt" IS NULL
          AND p2."deletedAt" IS NULL
      `,

      // Count people per organization
      prisma.person.groupBy({
        by: ['organizationId'],
        where: {
          userId,
          deletedAt: null,
        },
        _count: true,
      }),
    ]);

    // Process edge stats (convert BigInt to number)
    const edgeCounts = edgeStats[0] || { total: BigInt(0), strong: BigInt(0), medium: BigInt(0), weak: BigInt(0) };
    const totalConnections = Number(edgeCounts.total);
    const strongConnections = Number(edgeCounts.strong);
    const mediumConnections = Number(edgeCounts.medium);
    const weakConnections = Number(edgeCounts.weak);

    // Build stats object
    const stats = {
      totalPeople: totalPeopleCount,
      totalConnections,
      averageConnectionsPerPerson: totalPeopleCount > 0 ? totalConnections / totalPeopleCount : 0,
      strongConnections,
      mediumConnections,
      weakConnections,
    };

    // Fetch organization names for groups
    const orgIds = organizationCounts
      .filter(g => g.organizationId !== null)
      .map(g => g.organizationId as string);

    const organizations = orgIds.length > 0 ? await prisma.organization.findMany({
      where: { id: { in: orgIds } },
      select: { id: true, name: true },
    }) : [];

    const orgNameMap = new Map(organizations.map(o => [o.id, o.name]));

    const organizationGroups = organizationCounts.map(g => ({
      name: g.organizationId ? orgNameMap.get(g.organizationId) || 'Unknown' : 'No Organization',
      count: g._count,
    })).sort((a, b) => b.count - a.count);

    // Fetch edges for the limited set of people (for graph display)
    const personIds = people.map(p => p.id);
    const edges = personIds.length > 0 ? await prisma.edge.findMany({
      where: {
        fromPersonId: { in: personIds },
        toPersonId: { in: personIds },
      },
      orderBy: {
        strength: 'desc',
      },
      take: 1000, // Limit edges for performance
    }) : [];

    return NextResponse.json({
      people: people.map(p => ({
        id: p.id,
        names: Array.isArray(p.names) ? p.names : [],
        emails: Array.isArray(p.emails) ? p.emails : [],
        phones: Array.isArray(p.phones) ? p.phones : [],
        title: p.title || undefined,
        organization: p.organization ? {
          id: p.organization.id,
          name: p.organization.name,
        } : undefined,
        socialHandles: p.socialHandles ? (p.socialHandles as Record<string, string>) : undefined,
      })),
      edges: edges.map(e => ({
        id: e.id,
        fromPersonId: e.fromPersonId,
        toPersonId: e.toPersonId,
        relationshipType: e.relationshipType,
        strength: e.strength,
        channels: Array.isArray(e.channels) ? e.channels : [],
        interactionCount: e.interactionCount,
        lastSeenAt: e.lastSeenAt.toISOString(),
      })),
      stats,
      organizationGroups,
    });
  } catch (error) {
    console.error('Failed to fetch network:', error);
    return NextResponse.json(
      { error: 'Failed to fetch network data' },
      { status: 500 }
    );
  }
});
