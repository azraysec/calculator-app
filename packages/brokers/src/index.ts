/**
 * @wig/brokers
 *
 * Event brokers and message queue implementations for the WIG system.
 *
 * This package provides:
 * - EventBus implementation using Inngest
 * - Domain event handlers
 * - Background job orchestration
 *
 * Usage:
 * ```typescript
 * import { eventBus, inngest } from '@wig/brokers';
 *
 * // Publish an event
 * await eventBus.publish({
 *   type: 'contacts.ingested',
 *   payload: { ... }
 * });
 * ```
 */

export { inngest, InngestEventBus, eventBus } from './inngest-event-bus';
export { functions } from './inngest-functions';
