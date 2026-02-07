/**
 * Inngest function definitions for event handlers
 */

import { inngest } from './event-bus';
import { prisma } from './prisma';
import { LinkedInArchiveParser } from '@wig/adapters';
import { LinkedInRelationshipScorer } from '@wig/core';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Handle contacts.ingested events
 * Process ingested contacts and trigger entity resolution
 */
export const handleContactsIngested = inngest.createFunction(
  { id: 'handle-contacts-ingested', name: 'Handle Contacts Ingested' },
  { event: 'contacts.ingested' },
  async ({ event }) => {
    const { sourceName, count } = event.data;

    console.log(`Processing ${count} contacts from ${sourceName}`);

    // TODO: Implement actual processing
    // - Store contacts in database
    // - Trigger entity resolution
    // - Emit entity.resolved events

    return { processed: count };
  }
);

/**
 * Handle interactions.ingested events
 * Process interactions and update edge strengths
 */
export const handleInteractionsIngested = inngest.createFunction(
  { id: 'handle-interactions-ingested', name: 'Handle Interactions Ingested' },
  { event: 'interactions.ingested' },
  async ({ event }) => {
    const { sourceName, count } = event.data;

    console.log(`Processing ${count} interactions from ${sourceName}`);

    // TODO: Implement actual processing
    // - Store interactions in database
    // - Update edge relationship strengths
    // - Emit graph.updated events

    return { processed: count };
  }
);

/**
 * Handle entities.merged events
 * Log merge operations and update references
 */
export const handleEntitiesMerged = inngest.createFunction(
  { id: 'handle-entities-merged', name: 'Handle Entities Merged' },
  { event: 'entities.merged' },
  async ({ event }) => {
    const { entityType, targetId, sourceIds } = event.data;

    console.log(`Merged ${entityType}: ${sourceIds.join(', ')} → ${targetId}`);

    // TODO: Implement actual processing
    // - Update all edge references
    // - Create audit log entry
    // - Notify affected cached data

    return { merged: sourceIds.length };
  }
);

/**
 * Handle graph.updated events
 * Invalidate caches and recompute derived data
 */
export const handleGraphUpdated = inngest.createFunction(
  { id: 'handle-graph-updated', name: 'Handle Graph Updated' },
  { event: 'graph.updated' },
  async ({ event }) => {
    const { affectedPersonIds } = event.data;

    console.log(`Graph updated: ${affectedPersonIds.length} people affected`);

    // TODO: Implement actual processing
    // - Invalidate cached paths
    // - Recompute path scores if needed
    // - Update graph statistics

    return { invalidated: affectedPersonIds.length };
  }
);

/**
 * Handle sync.started events
 * Track sync operations
 */
export const handleSyncStarted = inngest.createFunction(
  { id: 'handle-sync-started', name: 'Handle Sync Started' },
  { event: 'sync.started' },
  async ({ event }) => {
    const { sourceName, syncId } = event.data;

    console.log(`Sync started: ${sourceName} (${syncId})`);

    // TODO: Update sync state in database

    return { status: 'tracking' };
  }
);

/**
 * Handle sync.completed events
 * Update sync state and log metrics
 */
export const handleSyncCompleted = inngest.createFunction(
  { id: 'handle-sync-completed', name: 'Handle Sync Completed' },
  { event: 'sync.completed' },
  async ({ event }) => {
    const { sourceName, syncId, recordsProcessed, duration } = event.data;

    console.log(
      `Sync completed: ${sourceName} (${syncId}) - ${recordsProcessed} records in ${duration}ms`
    );

    // TODO: Update sync state in database
    // TODO: Log metrics

    return { status: 'completed' };
  }
);

/**
 * Handle sync.failed events
 * Log errors and alert if needed
 */
export const handleSyncFailed = inngest.createFunction(
  { id: 'handle-sync-failed', name: 'Handle Sync Failed' },
  { event: 'sync.failed' },
  async ({ event }) => {
    const { sourceName, syncId, error } = event.data;

    console.error(`Sync failed: ${sourceName} (${syncId}) - ${error}`);

    // TODO: Update sync state in database
    // TODO: Alert if critical

    return { status: 'failed' };
  }
);

/**
 * Process LinkedIn archive in background
 * No serverless timeout - can take as long as needed
 */
export const processLinkedInArchive = inngest.createFunction(
  {
    id: 'process-linkedin-archive',
    name: 'Process LinkedIn Archive',
    concurrency: {
      limit: 5, // Process max 5 archives simultaneously
    },
  },
  { event: 'linkedin.archive.process' },
  async ({ event, step }) => {
    const { jobId } = event.data;

    // Step 1: Download file from blob
    const { blobUrl, userId } = await step.run('download-from-blob', async () => {
      const job = await prisma.ingestJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error('Job not found');
      }

      const fileMetadata = job.fileMetadata as any;
      const blobUrl = fileMetadata?.blobUrl;

      if (!blobUrl) {
        throw new Error('Blob URL not found in job metadata');
      }

      if (!job.userId) {
        throw new Error('Job missing userId - cannot process');
      }

      await prisma.ingestJob.update({
        where: { id: jobId },
        data: { progress: 5, logs: 'Downloading file from storage...' },
      });

      return { blobUrl, userId: job.userId };
    });

    // Step 2: Download and save to temp file
    const tempFilePath = await step.run('save-temp-file', async () => {
      const response = await fetch(blobUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file from blob: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const tempPath = join(tmpdir(), `linkedin-archive-${jobId}.zip`);
      await writeFile(tempPath, buffer);

      await prisma.ingestJob.update({
        where: { id: jobId },
        data: { progress: 10, logs: 'File downloaded, starting extraction...' },
      });

      return tempPath;
    });

    // Step 3: Parse the archive
    const parseResult = await step.run('parse-archive', async () => {
      const parser = new LinkedInArchiveParser(
        prisma,
        userId,
        (progress) => {
          prisma.ingestJob.update({
            where: { id: jobId },
            data: {
              progress: 10 + (progress.progress * 0.7), // 10-80%
              logs: progress.message,
            },
          }).catch((err) => {
            console.error('Failed to update progress:', err);
          });
        }
      );

      try {
        const result = await parser.parseArchive(tempFilePath);
        return result;
      } finally {
        // Clean up temp file
        try {
          await unlink(tempFilePath);
        } catch (err) {
          console.error('Failed to delete temp file:', err);
        }
      }
    });

    // Step 4: Re-score relationships
    const rescoredCount = await step.run('rescore-relationships', async () => {
      await prisma.ingestJob.update({
        where: { id: jobId },
        data: { progress: 85, logs: 'Scoring relationship strengths...' },
      });

      const scorer = new LinkedInRelationshipScorer(prisma);
      const rescored = await scorer.rescorePersonEdges(userId);

      return rescored;
    });

    // Step 5: Complete job
    await step.run('complete-job', async () => {
      await prisma.ingestJob.update({
        where: { id: jobId },
        data: {
          status: parseResult.errors.length > 0 ? 'completed' : 'completed',
          completedAt: new Date(),
          progress: 100,
          resultMetadata: {
            connectionsProcessed: parseResult.connectionsProcessed,
            messagesProcessed: parseResult.messagesProcessed,
            evidenceEventsCreated: parseResult.evidenceEventsCreated,
            newPersonsAdded: parseResult.newPersonsAdded,
            edgesRescored: rescoredCount,
            errors: parseResult.errors,
          },
          logs: parseResult.errors.length > 0
            ? `Completed with ${parseResult.errors.length} errors`
            : 'Completed successfully',
        },
      });
    });

    return {
      connectionsProcessed: parseResult.connectionsProcessed,
      messagesProcessed: parseResult.messagesProcessed,
      edgesRescored: rescoredCount,
    };
  }
);

/**
 * Process Gmail sync in background with full pagination
 * Each page is processed in its own Inngest step to avoid Vercel timeouts
 */
export const processGmailSync = inngest.createFunction(
  {
    id: 'process-gmail-sync',
    name: 'Process Gmail Sync',
    concurrency: {
      limit: 5, // Process max 5 users simultaneously (Inngest plan limit)
    },
  },
  { event: 'gmail.sync.start' },
  async ({ event, step }) => {
    const { jobId, userId, fullSync } = event.data;

    // Step 1: Get user credentials and validate
    const user = await step.run('validate-user', async () => {
      const job = await prisma.ingestJob.findUnique({ where: { id: jobId } });
      if (!job) throw new Error('Job not found');

      const userData = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          googleRefreshToken: true,
          googleAccessToken: true,
          lastGmailSyncAt: true,
          person: { select: { id: true } },
        },
      });

      if (!userData?.googleRefreshToken) {
        throw new Error('User not connected to Gmail');
      }

      await prisma.ingestJob.update({
        where: { id: jobId },
        data: {
          status: 'running',
          startedAt: new Date(),
          progress: 5,
          logs: 'Validating Gmail connection...',
        },
      });

      return userData;
    });

    // Step 2: Validate connection
    await step.run('validate-connection', async () => {
      const { createGmailAdapter } = await import('@wig/adapters');
      const adapter = createGmailAdapter({
        refreshToken: user.googleRefreshToken!,
        accessToken: user.googleAccessToken || undefined,
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      });

      const validation = await adapter.validateConnection();
      if (!validation.valid) {
        throw new Error(`Gmail connection invalid: ${validation.error}`);
      }

      await prisma.ingestJob.update({
        where: { id: jobId },
        data: { progress: 10, logs: 'Connection validated, starting sync...' },
      });
    });

    // Step 3: Paginated sync - each page is its own step
    const maxPages = 500; // Max 50,000 messages
    const batchSize = 100;
    let cursor: string | undefined = undefined;
    let totalProcessed = 0;
    let totalContacts = 0;
    let pageNumber = 0;
    let hasMore = true;

    // Determine since date
    const sinceDate = fullSync ? undefined : (user.lastGmailSyncAt ? new Date(user.lastGmailSyncAt) : undefined);

    while (hasMore && pageNumber < maxPages) {
      pageNumber++;

      // Each page gets its own step - Inngest saves progress between steps
      const pageResult = await step.run(`sync-page-${pageNumber}`, async () => {
        const { createGmailAdapter } = await import('@wig/adapters');
        const adapter = createGmailAdapter({
          refreshToken: user.googleRefreshToken!,
          accessToken: user.googleAccessToken || undefined,
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        });

        const result = await adapter.listInteractions({
          since: sinceDate,
          limit: batchSize,
          cursor,
        });

        let pageProcessed = 0;
        let pageContacts = 0;

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

          // Process participants and create edges
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
              pageContacts++;
            }

            // Create or update Edge
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

          pageProcessed++;
        }

        return {
          pageProcessed,
          pageContacts,
          hasMore: result.hasMore && !!result.nextCursor,
          nextCursor: result.nextCursor,
        };
      });

      // Accumulate totals
      totalProcessed += pageResult.pageProcessed;
      totalContacts += pageResult.pageContacts;
      hasMore = pageResult.hasMore;
      cursor = pageResult.nextCursor;

      // Update progress after each page
      await step.run(`update-progress-${pageNumber}`, async () => {
        const progress = Math.min(10 + Math.floor((pageNumber / 50) * 85), 95);
        await prisma.ingestJob.update({
          where: { id: jobId },
          data: {
            progress,
            logs: `Page ${pageNumber}: ${totalProcessed} messages, ${totalContacts} new contacts`,
            resultMetadata: {
              messagesProcessed: totalProcessed,
              newContacts: totalContacts,
              pagesProcessed: pageNumber,
            } as any,
          },
        });
      });
    }

    // Final step: Complete job
    await step.run('complete-job', async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { lastGmailSyncAt: new Date() },
      });

      await prisma.ingestJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          progress: 100,
          logs: `Sync complete! ${totalProcessed} messages, ${totalContacts} new contacts`,
          resultMetadata: {
            messagesProcessed: totalProcessed,
            newContacts: totalContacts,
            pagesProcessed: pageNumber,
          } as any,
        },
      });
    });

    return { totalProcessed, totalContacts, pagesProcessed: pageNumber };
  }
);

// Export all functions as an array for easy registration
export const inngestFunctions = [
  handleContactsIngested,
  handleInteractionsIngested,
  handleEntitiesMerged,
  handleGraphUpdated,
  handleSyncStarted,
  handleSyncCompleted,
  handleSyncFailed,
  processLinkedInArchive,
  processGmailSync,
];
