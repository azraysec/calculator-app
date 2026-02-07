/**
 * Admin API for direct Gmail sync (bypasses Inngest)
 * POST /api/admin/gmail-sync-direct - Run Gmail sync directly (1 page at a time)
 *
 * Use this when Inngest isn't working. Call multiple times to sync more pages.
 * Pass ?cursor=xxx to continue from previous sync.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor') || undefined;

    // Get user with Gmail connected
    const users = await prisma.user.findMany({
      where: {
        googleRefreshToken: { not: null },
      },
      select: {
        id: true,
        email: true,
        googleRefreshToken: true,
        googleAccessToken: true,
        lastGmailSyncAt: true,
        person: { select: { id: true } },
      },
      take: 1,
    });

    if (users.length === 0) {
      return NextResponse.json({ error: 'No users with Gmail connected' }, { status: 400 });
    }

    const user = users[0];
    console.log('[Direct Sync] Starting for user:', user.email, 'cursor:', cursor);

    const { createGmailAdapter } = await import('@wig/adapters');
    const adapter = createGmailAdapter({
      refreshToken: user.googleRefreshToken!,
      accessToken: user.googleAccessToken || undefined,
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    });

    // Validate connection
    const validation = await adapter.validateConnection();
    if (!validation.valid) {
      return NextResponse.json({ error: `Gmail connection invalid: ${validation.error}` }, { status: 400 });
    }

    // Fetch ONE page of messages (50 to stay under timeout)
    const result = await adapter.listInteractions({
      limit: 50,
      cursor,
    });

    let totalProcessed = 0;
    let totalContacts = 0;

    for (const interaction of result.items) {
      if (!interaction.metadata?.threadId) continue;

      const threadId = interaction.metadata.threadId as string;

      // Find or create conversation
      const conversation = await prisma.conversation.upsert({
        where: {
          sourceName_externalId: {
            sourceName: interaction.sourceName,
            externalId: threadId,
          },
        },
        create: {
          userId: user.id,
          sourceName: interaction.sourceName,
          externalId: threadId,
          participants: interaction.participants,
          metadata: {
            subject: interaction.metadata.subject ?? null,
            labels: interaction.metadata.labels ?? null,
          } as any,
        },
        update: {
          participants: interaction.participants,
        },
      });

      // Create message
      await prisma.message.upsert({
        where: {
          id: `${interaction.sourceName}-${interaction.sourceId}`,
        },
        create: {
          id: `${interaction.sourceName}-${interaction.sourceId}`,
          userId: user.id,
          conversationId: conversation.id,
          senderId: interaction.participants[0] || 'unknown',
          timestamp: interaction.timestamp,
          content: interaction.metadata.snippet as string,
          metadata: { messageId: interaction.sourceId } as any,
        },
        update: {
          timestamp: interaction.timestamp,
        },
      });

      // Process participants
      for (let i = 1; i < interaction.participants.length; i++) {
        const participant = interaction.participants[i];

        let person = await prisma.person.findFirst({
          where: { emails: { has: participant } },
        });

        if (!person) {
          person = await prisma.person.create({
            data: {
              userId: user.id,
              names: [participant.split('@')[0]],
              emails: [participant],
              phones: [],
              socialHandles: {},
              metadata: { source: 'gmail' } as any,
            },
          });
          totalContacts++;
        }

        // Create edge if user has person record
        if (user.person?.id && person.id !== user.person.id) {
          const labels = interaction.metadata.labels;
          const isSent = Array.isArray(labels) && labels.includes('SENT');
          const fromPersonId = isSent ? user.person.id : person.id;
          const toPersonId = isSent ? person.id : user.person.id;

          await prisma.edge.upsert({
            where: {
              fromPersonId_toPersonId: { fromPersonId, toPersonId },
            },
            create: {
              fromPersonId,
              toPersonId,
              relationshipType: 'interacted_with',
              strength: 0.3,
              sources: ['gmail'],
              channels: ['email'],
              interactionCount: 1,
              firstSeenAt: interaction.timestamp,
              lastSeenAt: interaction.timestamp,
            },
            update: {
              interactionCount: { increment: 1 },
              lastSeenAt: interaction.timestamp,
            },
          });
        }
      }

      totalProcessed++;
    }

    // Update user's last sync time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastGmailSyncAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      messagesProcessed: totalProcessed,
      newContacts: totalContacts,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
      message: result.hasMore
        ? `Processed ${totalProcessed} messages. Call again with cursor=${result.nextCursor} to continue.`
        : `Sync complete! Processed ${totalProcessed} messages.`,
    });
  } catch (error) {
    console.error('[Direct Sync] Error:', error);
    return NextResponse.json(
      {
        error: 'Direct sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
