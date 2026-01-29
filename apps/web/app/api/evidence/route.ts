/**
 * Evidence API
 * GET /api/evidence?edgeIds=id1,id2,id3
 * Returns evidence events for specified edges
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@wig/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const edgeIdsParam = searchParams.get('edgeIds');

    if (!edgeIdsParam) {
      return NextResponse.json(
        { error: 'edgeIds parameter is required' },
        { status: 400 }
      );
    }

    const edgeIds = edgeIdsParam.split(',').filter(Boolean);

    if (edgeIds.length === 0) {
      return NextResponse.json({ edges: [] });
    }

    // Fetch edges with their evidence events
    const edges = await prisma.edge.findMany({
      where: {
        id: { in: edgeIds },
      },
      include: {
        fromPerson: {
          select: {
            id: true,
            names: true,
          },
        },
        toPerson: {
          select: {
            id: true,
            names: true,
          },
        },
      },
    });

    // Fetch evidence events for these person pairs
    const edgeData = await Promise.all(
      edges.map(async (edge) => {
        // Get evidence events between these two people (bidirectional)
        const evidence = await prisma.evidenceEvent.findMany({
          where: {
            OR: [
              {
                subjectPersonId: edge.fromPersonId,
                objectPersonId: edge.toPersonId,
              },
              {
                subjectPersonId: edge.toPersonId,
                objectPersonId: edge.fromPersonId,
              },
            ],
          },
          orderBy: {
            timestamp: 'desc',
          },
          take: 50, // Limit to most recent 50 events per edge
        });

        return {
          edgeId: edge.id,
          fromPersonName: edge.fromPerson.names[0] || 'Unknown',
          toPersonName: edge.toPerson.names[0] || 'Unknown',
          evidence: evidence.map((ev) => ({
            id: ev.id,
            type: ev.type,
            timestamp: ev.timestamp,
            source: ev.source,
            metadata: ev.metadata as Record<string, any>,
          })),
        };
      })
    );

    return NextResponse.json({ edges: edgeData });
  } catch (error) {
    console.error('Error fetching evidence:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
