/**
 * Domain Events for WIG System
 *
 * All events in the system follow a type-safe discriminated union pattern.
 * Events are published through the EventBus and processed asynchronously.
 *
 * Event naming convention: {entity}.{action}
 * Examples: contacts.ingested, entities.merged, graph.updated
 */

// ============================================================================
// INGESTION EVENTS
// ============================================================================

export interface ContactsIngestedEvent {
  type: 'contacts.ingested';
  payload: {
    sourceId: string;
    sourceName: string;
    count: number;
    timestamp: Date;
    correlationId: string;
  };
}

export interface InteractionsIngestedEvent {
  type: 'interactions.ingested';
  payload: {
    sourceId: string;
    sourceName: string;
    count: number;
    timestamp: Date;
    correlationId: string;
  };
}

export interface OrganizationsIngestedEvent {
  type: 'organizations.ingested';
  payload: {
    sourceId: string;
    sourceName: string;
    count: number;
    timestamp: Date;
    correlationId: string;
  };
}

// ============================================================================
// ENTITY RESOLUTION EVENTS
// ============================================================================

export interface EntitiesMergedEvent {
  type: 'entities.merged';
  payload: {
    entityType: 'Person' | 'Organization';
    targetId: string;
    sourceIds: string[];
    confidence: number;
    reason: string;
    correlationId: string;
  };
}

export interface EntityResolvedEvent {
  type: 'entity.resolved';
  payload: {
    entityType: 'Person' | 'Organization';
    entityId: string;
    matches: Array<{
      id: string;
      confidence: number;
      matchFields: string[];
    }>;
    action: 'merged' | 'flagged-for-review' | 'no-match';
    correlationId: string;
  };
}

// ============================================================================
// GRAPH EVENTS
// ============================================================================

export interface GraphUpdatedEvent {
  type: 'graph.updated';
  payload: {
    edgesCreated: number;
    edgesUpdated: number;
    edgesDeleted: number;
    affectedPersonIds: string[];
    correlationId: string;
  };
}

export interface RelationshipStrengthRecalculatedEvent {
  type: 'relationship.strength-recalculated';
  payload: {
    edgeId: string;
    fromPersonId: string;
    toPersonId: string;
    oldStrength: number;
    newStrength: number;
    factors: {
      recency: number;
      frequency: number;
      mutuality: number;
      channels: number;
    };
    correlationId: string;
  };
}

// ============================================================================
// SYNC EVENTS
// ============================================================================

export interface SyncStartedEvent {
  type: 'sync.started';
  payload: {
    syncId: string;
    sourceName: string;
    timestamp: Date;
    correlationId: string;
  };
}

export interface SyncCompletedEvent {
  type: 'sync.completed';
  payload: {
    syncId: string;
    sourceName: string;
    duration: number;
    recordsProcessed: number;
    newRecords: number;
    updatedRecords: number;
    errors: number;
    correlationId: string;
  };
}

export interface SyncFailedEvent {
  type: 'sync.failed';
  payload: {
    syncId: string;
    sourceName: string;
    error: string;
    retryable: boolean;
    correlationId: string;
  };
}

// ============================================================================
// USER ACTION EVENTS
// ============================================================================

export interface PathSearchedEvent {
  type: 'path.searched';
  payload: {
    userId: string;
    targetPersonId: string;
    pathsFound: number;
    maxHops: number;
    duration: number;
    correlationId: string;
  };
}

export interface OutreachDraftedEvent {
  type: 'outreach.drafted';
  payload: {
    userId: string;
    targetPersonId: string;
    intermediaryIds: string[];
    channel: 'email' | 'linkedin' | 'whatsapp' | 'other';
    correlationId: string;
  };
}

export interface OutreachSentEvent {
  type: 'outreach.sent';
  payload: {
    userId: string;
    targetPersonId: string;
    intermediaryIds: string[];
    channel: 'email' | 'linkedin' | 'whatsapp' | 'other';
    messageId: string;
    correlationId: string;
  };
}

// ============================================================================
// DISCRIMINATED UNION
// ============================================================================

/**
 * DomainEvent is a discriminated union of all possible events in the system.
 * TypeScript will enforce exhaustive checking in switch statements.
 */
export type DomainEvent =
  | ContactsIngestedEvent
  | InteractionsIngestedEvent
  | OrganizationsIngestedEvent
  | EntitiesMergedEvent
  | EntityResolvedEvent
  | GraphUpdatedEvent
  | RelationshipStrengthRecalculatedEvent
  | SyncStartedEvent
  | SyncCompletedEvent
  | SyncFailedEvent
  | PathSearchedEvent
  | OutreachDraftedEvent
  | OutreachSentEvent;

/**
 * Extract event type from DomainEvent
 */
export type EventType = DomainEvent['type'];

/**
 * Get payload type for a specific event type
 */
export type EventPayload<T extends EventType> = Extract<
  DomainEvent,
  { type: T }
>['payload'];

// ============================================================================
// EVENT BUS INTERFACE
// ============================================================================

/**
 * EventBus is the main interface for publishing and subscribing to domain events.
 *
 * MVP Implementation: Inngest
 * Future Migration Path: Upstash Kafka (if scale requires)
 *
 * @example
 * ```typescript
 * // Publishing an event
 * await eventBus.publish({
 *   type: 'contacts.ingested',
 *   payload: {
 *     sourceId: 'gmail',
 *     sourceName: 'Gmail',
 *     count: 123,
 *     timestamp: new Date(),
 *     correlationId: 'sync-abc-123'
 *   }
 * });
 *
 * // Subscribing to an event
 * eventBus.subscribe('contacts.ingested', async (event) => {
 *   console.log(`Ingested ${event.payload.count} contacts`);
 * });
 * ```
 */
export interface EventBus {
  /**
   * Publish a domain event to the event bus.
   * Events are processed asynchronously and may be retried on failure.
   *
   * @param event - The domain event to publish
   * @returns Promise that resolves when event is accepted (not processed)
   */
  publish<T extends EventType>(
    event: Extract<DomainEvent, { type: T }>
  ): Promise<void>;

  /**
   * Subscribe to events of a specific type.
   * Handler will be called asynchronously for each event.
   *
   * @param eventType - The event type to subscribe to
   * @param handler - Async function to handle the event
   */
  subscribe<T extends EventType>(
    eventType: T,
    handler: (event: Extract<DomainEvent, { type: T }>) => Promise<void>
  ): void;

  /**
   * Subscribe to all events (useful for logging/monitoring)
   *
   * @param handler - Async function to handle any event
   */
  subscribeAll(handler: (event: DomainEvent) => Promise<void>): void;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generate a correlation ID for tracing related operations
 */
export function generateCorrelationId(): string {
  return `corr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Type guard to check if an event is of a specific type
 */
export function isEventType<T extends EventType>(
  event: DomainEvent,
  type: T
): event is Extract<DomainEvent, { type: T }> {
  return event.type === type;
}
