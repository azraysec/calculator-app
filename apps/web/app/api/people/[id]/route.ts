/**
 * Person Detail API
 * GET /api/people/[id] - Fetch complete person data with all evidence
 */

import { NextResponse } from 'next/server';
import { prisma } from '@wig/db';
import { withAuth } from '@/lib/auth-helpers';

export const GET = withAuth(async (
  _request: Request,
  { userId, params }
) => {
  try {
    const { id } = await params;

    // Fetch person with all related data
    // CRITICAL: Filter by userId for multi-tenant isolation
    const person = await prisma.person.findFirst({
      where: {
        id,
        userId,
        deletedAt: null
      },
      include: {
        organization: true,
        outgoingEdges: {
          include: {
            toPerson: {
              select: {
                id: true,
                names: true,
                emails: true,
                title: true,
                organization: true,
              },
            },
          },
        },
        incomingEdges: {
          include: {
            fromPerson: {
              select: {
                id: true,
                names: true,
                emails: true,
                title: true,
                organization: true,
              },
            },
          },
        },
      },
    });

    if (!person) {
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      );
    }

    // Fetch evidence events where this person is subject or object
    // CRITICAL: Filter by userId for multi-tenant isolation
    const evidence = await prisma.evidenceEvent.findMany({
      where: {
        userId,
        OR: [
          { subjectPersonId: id },
          { objectPersonId: id },
        ],
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 100, // Limit to most recent 100 events
    });

    // Get conversations involving this person
    // CRITICAL: Filter by userId for multi-tenant isolation
    const conversations = await prisma.conversation.findMany({
      where: {
        userId,
        participants: {
          has: id,
        },
      },
      include: {
        messages: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 10, // Last 10 messages per conversation
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 20, // Most recent 20 conversations
    });

    // Aggregate statistics
    const stats = {
      totalConnections: person.outgoingEdges.length + person.incomingEdges.length,
      totalEvidence: evidence.length,
      totalConversations: conversations.length,
      sources: Array.from(new Set(evidence.map((e) => e.source))),
    };

    // Group evidence by type
    const evidenceByType = evidence.reduce((acc, ev) => {
      const type = ev.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push({
        id: ev.id,
        timestamp: ev.timestamp,
        source: ev.source,
        metadata: ev.metadata as Record<string, any>,
      });
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      person: {
        id: person.id,
        names: person.names,
        emails: person.emails,
        phones: person.phones,
        title: person.title,
        organization: person.organization,
        socialHandles: person.socialHandles as Record<string, any> | null,
        metadata: person.metadata as Record<string, any> | null,
        createdAt: person.createdAt,
        updatedAt: person.updatedAt,
      },
      connections: {
        outgoing: person.outgoingEdges.map((edge) => ({
          id: edge.id,
          person: edge.toPerson,
          relationshipType: edge.relationshipType,
          strength: edge.strength,
          strengthFactors: edge.strengthFactors as Record<string, any> | null,
          sources: edge.sources,
          firstSeenAt: edge.firstSeenAt,
          lastSeenAt: edge.lastSeenAt,
          interactionCount: edge.interactionCount,
        })),
        incoming: person.incomingEdges.map((edge) => ({
          id: edge.id,
          person: edge.fromPerson,
          relationshipType: edge.relationshipType,
          strength: edge.strength,
          strengthFactors: edge.strengthFactors as Record<string, any> | null,
          sources: edge.sources,
          firstSeenAt: edge.firstSeenAt,
          lastSeenAt: edge.lastSeenAt,
          interactionCount: edge.interactionCount,
        })),
      },
      evidence: {
        all: evidence.map((ev) => ({
          id: ev.id,
          type: ev.type,
          timestamp: ev.timestamp,
          source: ev.source,
          subjectPersonId: ev.subjectPersonId,
          objectPersonId: ev.objectPersonId,
          metadata: ev.metadata as Record<string, any> | null,
        })),
        byType: evidenceByType,
      },
      conversations: conversations.map((conv) => ({
        id: conv.id,
        externalId: conv.externalId,
        sourceName: conv.sourceName,
        participants: conv.participants,
        metadata: conv.metadata as Record<string, any> | null,
        updatedAt: conv.updatedAt,
        recentMessages: conv.messages.map((msg) => ({
          id: msg.id,
          senderId: msg.senderId,
          timestamp: msg.timestamp,
          content: msg.content,
          metadata: msg.metadata as Record<string, any> | null,
        })),
      })),
      stats,
    });
  } catch (error) {
    console.error('Error fetching person details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
