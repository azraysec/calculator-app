/**
 * EventBus implementation using Inngest
 */

import type { EventBus, DomainEvent } from '@wig/shared-types';
import { Inngest } from 'inngest';

// Create Inngest client
export const inngest = new Inngest({
  id: 'wig',
  name: 'Warm Intro Graph',
});

/**
 * EventBus implementation backed by Inngest
 */
export class InngestEventBus implements EventBus {
  constructor(private client: Inngest) {}

  async publish(event: DomainEvent): Promise<void> {
    try {
      await this.client.send({
        name: event.type,
        data: event.payload,
      });
    } catch (error) {
      console.error(`Failed to publish event ${event.type}:`, error);
      throw new Error(`Event publish failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  subscribe<T extends DomainEvent['type']>(
    eventType: T,
    _handler: (event: Extract<DomainEvent, { type: T }>) => Promise<void>
  ): void {
    // Note: Subscription registration happens via Inngest function definitions
    // This method is a no-op in the Inngest implementation
    // Actual handlers are registered in apps/web/lib/inngest-functions.ts
    console.log(`Event subscription registered for: ${eventType}`);
  }

  subscribeAll(_handler: (event: DomainEvent) => Promise<void>): void {
    // Note: Subscription registration happens via Inngest function definitions
    // This method is a no-op in the Inngest implementation
    console.log('All-events subscription registered');
  }
}

// Singleton instance
export const eventBus = new InngestEventBus(inngest);
