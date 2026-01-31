/**
 * Gmail Sync Cron Job
 * POST /api/cron/gmail-sync
 *
 * Syncs Gmail messages for all connected users
 * Runs periodically (configured in vercel.json)
 *
 * Process:
 * 1. Find all users with Gmail connected
 * 2. For each user, create Gmail adapter
 * 3. Fetch new emails since last sync
 * 4. Parse into Conversations, Messages, and Evidence
 * 5. Update last sync timestamp
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@wig/db';
import { createGmailAdapter } from '@wig/adapters';

export async function POST(_request: NextRequest) {
  try {
    console.log('[Gmail Sync] Starting sync job');

    // Find all users with Gmail connected
    const users = await prisma.user.findMany({
      where: {
        googleRefreshToken: {
          not: null,
        },
      },
      select: {
        id: true,
        email: true,
        googleRefreshToken: true,
        googleAccessToken: true,
        lastGmailSyncAt: true,
        person: {
          select: {
            id: true,
          },
        },
      },
    });

    console.log(`[Gmail Sync] Found ${users.length} users with Gmail connected`);

    const results = [];

    for (const user of users) {
      try {
        console.log(`[Gmail Sync] Processing user ${user.email}`);

        // Create Gmail adapter with user's credentials
        const adapter = createGmailAdapter({
          refreshToken: user.googleRefreshToken!,
          accessToken: user.googleAccessToken || undefined,
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        });

        // Validate connection first
        const validation = await adapter.validateConnection();
        if (!validation.valid) {
          console.error(
            `[Gmail Sync] Invalid connection for ${user.email}:`,
            validation.error
          );
          results.push({
            userId: user.id,
            email: user.email,
            status: 'error',
            error: validation.error,
          });
          continue;
        }

        // Fetch interactions since last sync
        const interactionsResult = await adapter.listInteractions({
          since: user.lastGmailSyncAt || undefined,
          limit: 100,
        });

        console.log(
          `[Gmail Sync] Fetched ${interactionsResult.items.length} interactions for ${user.email}`
        );

        // Process each interaction
        for (const interaction of interactionsResult.items) {
          // Skip if no threadId in metadata
          if (!interaction.metadata?.threadId) {
            console.warn('[Gmail Sync] Skipping interaction without threadId');
            continue;
          }

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
              metadata: {
                subject: interaction.metadata.subject ?? null,
                labels: interaction.metadata.labels ?? null,
              } as any,
            },
          });

          // Create message
          await prisma.message.create({
            data: {
              userId: user.id,
              conversationId: conversation.id,
              senderId: interaction.participants[0] || 'unknown', // First participant is sender
              timestamp: interaction.timestamp,
              content: interaction.metadata.snippet as string,
              metadata: {
                messageId: interaction.sourceId,
                labels: interaction.metadata.labels ?? null,
              } as any,
            },
          });

          // Create evidence events for each participant pair
          // Skip the first participant (sender) and create evidence for interactions with others
          for (let i = 1; i < interaction.participants.length; i++) {
            const participant = interaction.participants[i];

            // Find or create person for this email address
            let person = await prisma.person.findFirst({
              where: {
                emails: {
                  has: participant,
                },
              },
            });

            if (!person) {
              person = await prisma.person.create({
                data: {
                  userId: user.id,
                  names: [participant.split('@')[0]], // Use email username as name
                  emails: [participant],
                  phones: [],
                  socialHandles: {},
                  metadata: {
                    source: 'gmail',
                  } as any,
                },
              });
            }

            // Determine if this is sent or received
            const labels = interaction.metadata.labels;
            const isSent = Array.isArray(labels) && labels.includes('SENT');
            const evidenceType = isSent
              ? 'email_sent'
              : 'email_received';

            // Create evidence event
            await prisma.evidenceEvent.create({
              data: {
                userId: user.id,
                subjectPersonId: user.person?.id || person.id, // Use user's person if available
                objectPersonId: person.id,
                type: evidenceType,
                timestamp: interaction.timestamp,
                source: 'gmail',
                metadata: {
                  threadId: interaction.metadata.threadId ?? null,
                  subject: interaction.metadata.subject ?? null,
                  messageId: interaction.sourceId,
                } as any,
              },
            });
          }
        }

        // Update last sync timestamp
        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastGmailSyncAt: new Date(),
          },
        });

        results.push({
          userId: user.id,
          email: user.email,
          status: 'success',
          synced: interactionsResult.items.length,
          hasMore: interactionsResult.hasMore,
        });
      } catch (error) {
        console.error(`[Gmail Sync] Error processing ${user.email}:`, error);
        results.push({
          userId: user.id,
          email: user.email,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log('[Gmail Sync] Sync job completed');

    return NextResponse.json({
      success: true,
      processed: users.length,
      results,
    });
  } catch (error) {
    console.error('[Gmail Sync] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Allow manual triggering for authenticated users
export const dynamic = 'force-dynamic';
