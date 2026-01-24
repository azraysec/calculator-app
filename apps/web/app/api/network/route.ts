/**
 * Network Overview API
 * Returns all people and connections in the graph
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Fetch all people (not deleted)
    const people = await prisma.person.findMany({
      where: { deletedAt: null },
      include: {
        organization: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Fetch all edges
    const edges = await prisma.edge.findMany({
      orderBy: {
        strength: 'desc',
      },
    });

    // Calculate statistics
    const stats = {
      totalPeople: people.length,
      totalConnections: edges.length,
      averageConnectionsPerPerson: people.length > 0 ? edges.length / people.length : 0,
      strongConnections: edges.filter(e => e.strength >= 0.7).length,
      mediumConnections: edges.filter(e => e.strength >= 0.4 && e.strength < 0.7).length,
      weakConnections: edges.filter(e => e.strength < 0.4).length,
    };

    // Group people by organization
    const organizationGroups = people.reduce((acc, person) => {
      const orgName = person.organization?.name || 'No Organization';
      if (!acc[orgName]) {
        acc[orgName] = [];
      }
      acc[orgName].push(person);
      return acc;
    }, {} as Record<string, typeof people>);

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
      organizationGroups: Object.entries(organizationGroups).map(([name, members]) => ({
        name,
        count: members.length,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch network:', error);
    return NextResponse.json(
      { error: 'Failed to fetch network data' },
      { status: 500 }
    );
  }
}
