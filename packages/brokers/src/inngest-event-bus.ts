/**
 * Inngest-based EventBus Implementation
 *
 * This implementation uses Inngest as the backend for event publishing and subscription.
 * Inngest provides:
 * - Automatic retries with exponential backoff
 * - Event persistence and replay
 * - Built-in observability
 * - Vercel-friendly (no timeout issues)
 *
 * Migration path to Upstash Kafka documented if scale requires.
 */

import { Inngest } from 'inngest';
import type { DomainEvent, EventBus, EventType } from '@wig/shared-types';

/**
 * Inngest client configuration for WIG events
 *
 * Note: Schema validation omitted for MVP to avoid type incompatibility.
 * TypeScript provides compile-time type safety for events.
 */
export const inngest = new Inngest({
  id: 'warm-intro-graph',
});

/**
 * Type for event handlers registered in the system
 */
type EventHandler<T extends EventType> = (
  event: Extract<DomainEvent, { type: T }>
) => Promise<void>;

/**
 * InngestEventBus implements the EventBus interface using Inngest as the backend.
 *
 * Features:
 * - Type-safe event publishing and subscription
 * - Automatic retries (3 attempts with exponential backoff)
 * - Event persistence (30 day retention)
 * - Correlation ID tracking for distributed tracing
 *
 * @example
 * ```typescript
 * const eventBus = new InngestEventBus();
 *
 * // Subscribe to events
 * eventBus.subscribe('contacts.ingested', async (event) => {
 *   console.log(`Processed ${event.payload.count} contacts`);
 * });
 *
 * // Publish events
 * await eventBus.publish({
 *   type: 'contacts.ingested',
 *   payload: {
 *     sourceId: 'gmail-sync-123',
 *     sourceName: 'Gmail',
 *     count: 150,
 *     timestamp: new Date(),
 *     correlationId: 'corr-abc-123'
 *   }
 * });
 * ```
 */
export class InngestEventBus implements EventBus {
  private handlers: Map<
    EventType,
    Array<EventHandler<EventType>>
  > = new Map();
  private allHandlers: Array<(event: DomainEvent) => Promise<void>> = [];

  /**
   * Publish a domain event to Inngest.
   * The event will be persisted and delivered to all subscribers asynchronously.
   *
   * @param event - The domain event to publish
   */
  async publish<T extends EventType>(
    event: Extract<DomainEvent, { type: T }>
  ): Promise<void> {
    try {
      await inngest.send({
        name: event.type,
        data: event.payload,
      });
    } catch (error) {
      console.error(`Failed to publish event ${event.type}:`, error);
      throw new Error(
        `Event publishing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Subscribe to events of a specific type.
   * Handlers are stored in-memory and called when events are received.
   *
   * Note: For production, handlers should be registered in Inngest function definitions
   * (see inngest-functions.ts). This method is primarily for in-process event handling.
   *
   * @param eventType - The event type to subscribe to
   * @param handler - Async function to handle the event
   */
  subscribe<T extends EventType>(
    eventType: T,
    handler: (event: Extract<DomainEvent, { type: T }>) => Promise<void>
  ): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler as EventHandler<EventType>);
    this.handlers.set(eventType, handlers);
  }

  /**
   * Subscribe to all events.
   * Useful for cross-cutting concerns like logging, monitoring, and audit trails.
   *
   * @param handler - Async function to handle any event
   */
  subscribeAll(handler: (event: DomainEvent) => Promise<void>): void {
    this.allHandlers.push(handler);
  }

  /**
   * Internal method to dispatch events to in-process handlers.
   * Called by Inngest function handlers.
   *
   * @internal
   */
  async dispatch(event: DomainEvent): Promise<void> {
    const typeHandlers = this.handlers.get(event.type) || [];

    // Execute type-specific handlers
    await Promise.all(
      typeHandlers.map((handler) =>
        handler(event).catch((error) => {
          console.error(
            `Handler failed for event ${event.type}:`,
            error
          );
          // Re-throw to trigger Inngest retry
          throw error;
        })
      )
    );

    // Execute wildcard handlers
    await Promise.all(
      this.allHandlers.map((handler) =>
        handler(event).catch((error) => {
          console.error(
            `Wildcard handler failed for event ${event.type}:`,
            error
          );
          throw error;
        })
      )
    );
  }
}

/**
 * Singleton instance of the event bus
 * Use this instance throughout the application for consistency
 */
export const eventBus = new InngestEventBus();
