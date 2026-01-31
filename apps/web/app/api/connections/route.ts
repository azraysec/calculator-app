/**
 * Connections API
 * GET /api/connections
 *
 * Fetch all connections with filtering, sorting, and pagination
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@wig/db';
import { withAuth } from '@/lib/auth-helpers';

export const GET = withAuth(async (request: Request, { userId }) => {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const skip = (page - 1) * pageSize;

    // Sorting
    const sortBy = searchParams.get('sortBy') || 'names';
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc';

    // Filtering
    const nameFilter = searchParams.get('name');
    const emailFilter = searchParams.get('email');
    const titleFilter = searchParams.get('title');
    const companyFilter = searchParams.get('company');

    // Build where clause
    // CRITICAL: Filter by userId for multi-tenant isolation
    const where: Prisma.PersonWhereInput = {
      userId,
      deletedAt: null,
    };

    if (nameFilter) {
      where.names = {
        hasSome: [nameFilter],
      };
    }

    if (emailFilter) {
      where.emails = {
        hasSome: [emailFilter],
      };
    }

    if (titleFilter) {
      where.title = {
        contains: titleFilter,
        mode: 'insensitive',
      };
    }

    if (companyFilter) {
      where.organization = {
        name: {
          contains: companyFilter,
          mode: 'insensitive',
        },
      };
    }

    // Build order by clause
    let orderBy: Prisma.PersonOrderByWithRelationInput = {};

    switch (sortBy) {
      case 'names':
        orderBy = { names: sortOrder };
        break;
      case 'emails':
        orderBy = { emails: sortOrder };
        break;
      case 'title':
        orderBy = { title: sortOrder };
        break;
      case 'createdAt':
        orderBy = { createdAt: sortOrder };
        break;
      case 'updatedAt':
        orderBy = { updatedAt: sortOrder };
        break;
      default:
        orderBy = { names: sortOrder };
    }

    // Fetch data
    const [connections, totalCount] = await Promise.all([
      prisma.person.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          organization: true,
          _count: {
            select: {
              outgoingEdges: true,
              incomingEdges: true,
            },
          },
        },
      }),
      prisma.person.count({ where }),
    ]);

    // Get sources from edges
    const enrichedConnections = await Promise.all(
      connections.map(async (person) => {
        const edges = await prisma.edge.findMany({
          where: {
            OR: [{ fromPersonId: person.id }, { toPersonId: person.id }],
          },
          select: {
            sources: true,
            interactionCount: true,
          },
        });

        const allSources = Array.from(
          new Set(edges.flatMap((edge) => edge.sources))
        );

        return {
          id: person.id,
          names: person.names,
          emails: person.emails,
          title: person.title,
          company: person.organization?.name || null,
          sources: allSources,
          connectionCount:
            person._count.outgoingEdges + person._count.incomingEdges,
          interactionCount: edges.reduce(
            (sum, edge) => sum + (edge.interactionCount || 0),
            0
          ),
          createdAt: person.createdAt,
          updatedAt: person.updatedAt,
          metadata: person.metadata,
        };
      })
    );

    return NextResponse.json({
      connections: enrichedConnections,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch connections',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
