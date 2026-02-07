/**
 * Admin API for direct Gmail sync (bypasses Inngest)
 * POST /api/admin/gmail-sync-direct - Run Gmail sync directly
 *
 * Use this when Inngest isn't working. Runs synchronously with 60s timeout.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60; // 60 second timeout

export async function POST() {
  try {
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
      take: 1, // Just do first user for now
    });

    if (users.length === 0) {
      return NextResponse.json({ error: 'No users with Gmail connected' }, { status: 400 });
    }

    const user = users[0];
    console.log('[Direct Sync] Starting for user:', user.email);

    // Create job for tracking
    const job = await prisma.ingestJob.create({
      data: {
        userId: user.id,
        sourceName: 'gmail',
        status: 'running',
        startedAt: new Date(),
        progress: 5,
        logs: 'Direct sync started...',
      },
    });

    try {
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
        throw new Error(`Gmail connection invalid: ${validation.error}`);
      }

      await prisma.ingestJob.update({
        where: { id: job.id },
        data: { progress: 10, logs: 'Connection validated, fetching messages...' },
      });

      // Fetch messages (limited for direct sync)
      let totalProcessed = 0;
      let totalContacts = 0;
      let cursor: string | undefined = undefined;
      const maxPages = 5; // Limit pages for direct sync (500 messages max)

      for (let page = 0; page < maxPages; page++) {
        const result = await adapter.listInteractions({
          limit: 100,
          cursor,
        });

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
              metadata: {
                messageId: interaction.sourceId,
              } as any,
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

        // Update progress
        await prisma.ingestJob.update({
          where: { id: job.id },
          data: {
            progress: 10 + (page + 1) * 15,
            logs: `Processed page ${page + 1}... ${totalProcessed} messages, ${totalContacts} new contacts`,
          },
        });

        if (!result.hasMore || !result.nextCursor) break;
        cursor = result.nextCursor;
      }

      // Update user's last sync time
      await prisma.user.update({
        where: { id: user.id },
        data: { lastGmailSyncAt: new Date() },
      });

      // Complete job
      await prisma.ingestJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          progress: 100,
          logs: `Direct sync complete! ${totalProcessed} messages, ${totalContacts} new contacts`,
          resultMetadata: {
            messagesProcessed: totalProcessed,
            newContacts: totalContacts,
          } as any,
        },
      });

      return NextResponse.json({
        success: true,
        jobId: job.id,
        messagesProcessed: totalProcessed,
        newContacts: totalContacts,
      });
    } catch (syncError) {
      console.error('[Direct Sync] Error:', syncError);

      await prisma.ingestJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          error: syncError instanceof Error ? syncError.message : 'Unknown error',
        },
      });

      throw syncError;
    }
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
