/**
 * Inngest Function Definitions
 *
 * These functions are registered with Inngest and handle domain events.
 * Each function runs in isolation with automatic retries and observability.
 *
 * To add a new event handler:
 * 1. Add the event type to @wig/shared-types
 * 2. Create a function here that handles the event
 * 3. Export it in the `functions` array at the bottom
 */

import { inngest } from './inngest-event-bus';

/**
 * Example: Handle contacts ingestion events
 *
 * This function runs when contacts are ingested from a data source.
 * It could trigger:
 * - Entity resolution
 * - Duplicate detection
 * - Graph updates
 */
export const handleContactsIngested = inngest.createFunction(
  {
    id: 'handle-contacts-ingested',
    name: 'Handle Contacts Ingested',
    retries: 3,
  },
  { event: 'contacts.ingested' },
  async ({ event, step }) => {
    const { sourceName, count, correlationId } = event.data;

    // Log the event
    await step.run('log-ingestion', async () => {
      console.log(
        `[${correlationId}] Ingested ${count} contacts from ${sourceName}`
      );
    });

    // TODO: Trigger entity resolution
    // await step.run('resolve-entities', async () => {
    //   await entityResolver.processNewContacts(sourceId);
    // });

    // TODO: Update graph edges
    // await step.run('update-graph', async () => {
    //   await graphBuilder.updateEdgesForSource(sourceId);
    // });

    return {
      success: true,
      contactsProcessed: count,
      correlationId,
    };
  }
);

/**
 * Example: Handle graph update events
 *
 * This function runs when the graph is updated (edges created/modified).
 * It could trigger:
 * - Strength recalculation
 * - Path invalidation
 * - Analytics updates
 */
export const handleGraphUpdated = inngest.createFunction(
  {
    id: 'handle-graph-updated',
    name: 'Handle Graph Updated',
    retries: 3,
  },
  { event: 'graph.updated' },
  async ({ event, step }) => {
    const { edgesCreated, edgesUpdated, affectedPersonIds, correlationId } =
      event.data;

    await step.run('log-graph-update', async () => {
      console.log(
        `[${correlationId}] Graph updated: +${edgesCreated} edges, ~${edgesUpdated} edges, ${affectedPersonIds.length} people affected`
      );
    });

    // TODO: Recalculate relationship strengths
    // await step.run('recalculate-strengths', async () => {
    //   await strengthCalculator.recalculate(affectedPersonIds);
    // });

    return {
      success: true,
      correlationId,
    };
  }
);

/**
 * Example: Handle sync failures with exponential backoff
 *
 * This function demonstrates error handling with custom retry logic.
 */
export const handleSyncFailed = inngest.createFunction(
  {
    id: 'handle-sync-failed',
    name: 'Handle Sync Failed',
    retries: 5, // More retries for sync failures
  },
  { event: 'sync.failed' },
  async ({ event, step }) => {
    const { sourceName, error, retryable, correlationId } = event.data;

    await step.run('log-failure', async () => {
      console.error(
        `[${correlationId}] Sync failed for ${sourceName}: ${error}`
      );
    });

    if (!retryable) {
      await step.run('alert-non-retryable', async () => {
        // TODO: Send alert to monitoring system
        console.error(`Non-retryable sync failure for ${sourceName}`);
      });
      return { success: false, alertSent: true };
    }

    // TODO: Implement retry with exponential backoff
    // await step.run('schedule-retry', async () => {
    //   await syncScheduler.retry(sourceName, { delay: '5m' });
    // });

    return { success: true, retryScheduled: true };
  }
);

/**
 * Audit logger that captures all events
 *
 * This wildcard function logs every event to the audit trail.
 */
export const auditLogger = inngest.createFunction(
  {
    id: 'audit-logger',
    name: 'Audit Logger',
    retries: 1, // Logging should be idempotent
  },
  { event: '*' }, // Subscribe to all events
  async ({ event }) => {
    // Extract correlation ID from event data
    const correlationId = (event.data as any)?.correlationId || 'unknown';

    console.log(`[AUDIT] [${correlationId}] Event: ${event.name}`, {
      timestamp: new Date().toISOString(),
      eventType: event.name,
      correlationId,
    });

    // TODO: Write to audit log database
    // await prisma.auditLog.create({
    //   data: {
    //     correlationId,
    //     action: event.name,
    //     entityType: 'System',
    //     entityId: correlationId,
    //     metadata: event.data,
    //   }
    // });

    return { logged: true };
  }
);

/**
 * Export all functions for registration with Inngest
 *
 * Add new functions here to register them with the Inngest client.
 */
export const functions = [
  handleContactsIngested,
  handleGraphUpdated,
  handleSyncFailed,
  auditLogger,
];
