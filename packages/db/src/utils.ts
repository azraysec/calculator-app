/**
 * Utility Functions for WIG Database Operations
 *
 * Common patterns and helpers for working with the database.
 */

import { prisma, Person, Edge, Prisma } from './index';

// ============================================================================
// ENTITY RESOLUTION
// ============================================================================

/**
 * Find a person by any of their emails
 */
export async function findPersonByEmail(email: string): Promise<Person | null> {
  return prisma.person.findFirst({
    where: {
      emails: { has: email },
      deletedAt: null,
    },
  });
}

/**
 * Find potential duplicate persons based on emails or phones
 */
export async function findPotentialDuplicates(
  person: Pick<Person, 'id' | 'emails' | 'phones'>
): Promise<Person[]> {
  const conditions = [];

  if (person.emails.length > 0) {
    conditions.push({ emails: { hasSome: person.emails } });
  }

  if (person.phones.length > 0) {
    conditions.push({ phones: { hasSome: person.phones } });
  }

  if (conditions.length === 0) {
    return [];
  }

  return prisma.person.findMany({
    where: {
      OR: conditions,
      id: { not: person.id },
      deletedAt: null,
    },
  });
}

/**
 * Merge two persons, preserving all data
 * @returns The merged person record
 */
export async function mergePersons(
  targetId: string,
  sourceId: string,
  explanation: string,
  actorId?: string
): Promise<Person> {
  return prisma.$transaction(async (tx) => {
    // Get both persons
    const [target, source] = await Promise.all([
      tx.person.findUniqueOrThrow({ where: { id: targetId } }),
      tx.person.findUniqueOrThrow({ where: { id: sourceId } }),
    ]);

    // Merge data arrays (removing duplicates)
    const mergedNames = [...new Set([...target.names, ...source.names])];
    const mergedEmails = [...new Set([...target.emails, ...source.emails])];
    const mergedPhones = [...new Set([...target.phones, ...source.phones])];

    // Update target person with merged data
    const merged = await tx.person.update({
      where: { id: targetId },
      data: {
        names: mergedNames,
        emails: mergedEmails,
        phones: mergedPhones,
        previousIds: [...target.previousIds, sourceId],
        mergeExplanation: explanation,
        // Merge metadata
        metadata: {
          ...(target.metadata as object || {}),
          ...(source.metadata as object || {}),
          mergedAt: new Date().toISOString(),
        },
      },
    });

    // Update edges from source to point to target
    await tx.edge.updateMany({
      where: { fromPersonId: sourceId },
      data: { fromPersonId: targetId },
    });

    await tx.edge.updateMany({
      where: { toPersonId: sourceId },
      data: { toPersonId: targetId },
    });

    // Soft delete source person
    await tx.person.update({
      where: { id: sourceId },
      data: { deletedAt: new Date() },
    });

    // Create audit log
    const correlationId = `merge-${Date.now()}`;
    await tx.auditLog.create({
      data: {
        correlationId,
        action: 'person.merged',
        actorId: actorId || 'system',
        entityType: 'Person',
        entityId: targetId,
        metadata: {
          sourcePerson: sourceId,
          targetPerson: targetId,
          explanation,
        },
      },
    });

    return merged;
  });
}

// ============================================================================
// GRAPH TRAVERSAL
// ============================================================================

/**
 * Get all direct connections for a person
 */
export async function getDirectConnections(
  personId: string,
  minStrength = 0.0
): Promise<Array<Edge & { toPerson: Person }>> {
  return prisma.edge.findMany({
    where: {
      fromPersonId: personId,
      strength: { gte: minStrength },
    },
    include: {
      toPerson: {
        where: { deletedAt: null },
      },
    },
    orderBy: { strength: 'desc' },
  });
}

/**
 * Find the shortest path between two people (BFS)
 * @returns Array of edges forming the path, or null if no path exists
 */
export async function findShortestPath(
  fromId: string,
  toId: string,
  maxDepth = 4
): Promise<Edge[] | null> {
  if (fromId === toId) return [];

  const visited = new Set<string>([fromId]);
  let frontier: Array<{ id: string; path: Edge[] }> = [{ id: fromId, path: [] }];

  for (let depth = 0; depth < maxDepth; depth++) {
    const nextFrontier: Array<{ id: string; path: Edge[] }> = [];

    for (const { id, path } of frontier) {
      const edges = await prisma.edge.findMany({
        where: {
          fromPersonId: id,
          toPerson: { deletedAt: null },
        },
      });

      for (const edge of edges) {
        if (edge.toPersonId === toId) {
          return [...path, edge];
        }

        if (!visited.has(edge.toPersonId)) {
          visited.add(edge.toPersonId);
          nextFrontier.push({
            id: edge.toPersonId,
            path: [...path, edge],
          });
        }
      }
    }

    if (nextFrontier.length === 0) break;
    frontier = nextFrontier;
  }

  return null;
}

/**
 * Find mutual connections between two people
 */
export async function findMutualConnections(
  personAId: string,
  personBId: string
): Promise<Person[]> {
  // Get A's connections
  const aConnections = await prisma.edge.findMany({
    where: { fromPersonId: personAId },
    select: { toPersonId: true },
  });

  const aConnectionIds = aConnections.map((e) => e.toPersonId);

  // Find which of A's connections are also connected to B
  const mutualEdges = await prisma.edge.findMany({
    where: {
      toPersonId: { in: aConnectionIds },
      fromPersonId: personBId,
    },
    include: { toPerson: true },
  });

  return mutualEdges.map((e) => e.toPerson);
}

// ============================================================================
// RELATIONSHIP STRENGTH
// ============================================================================

interface StrengthFactors {
  recency: number;
  frequency: number;
  mutuality: number;
  channels: number;
}

/**
 * Calculate relationship strength score from factors
 * Each factor should be 0.0-1.0
 * @returns Overall strength score 0.0-1.0
 */
export function calculateStrength(factors: StrengthFactors): number {
  const weights = {
    recency: 0.35,
    frequency: 0.30,
    mutuality: 0.20,
    channels: 0.15,
  };

  return (
    factors.recency * weights.recency +
    factors.frequency * weights.frequency +
    factors.mutuality * weights.mutuality +
    factors.channels * weights.channels
  );
}

/**
 * Calculate recency factor (0.0-1.0) based on last interaction
 * More recent = higher score
 */
export function calculateRecencyFactor(lastSeenAt: Date): number {
  const now = Date.now();
  const lastSeen = lastSeenAt.getTime();
  const daysSince = (now - lastSeen) / (1000 * 60 * 60 * 24);

  // Exponential decay: 30 days = 0.5, 90 days = 0.25
  return Math.exp(-daysSince / 43.5); // ln(2) / 0.016 ≈ 43.5
}

/**
 * Calculate frequency factor (0.0-1.0) based on interaction count
 */
export function calculateFrequencyFactor(interactionCount: number): number {
  // Logarithmic scale: 1 interaction = 0.1, 10 = 0.5, 100 = 0.9
  return Math.min(1.0, Math.log10(interactionCount + 1) / 2);
}

// ============================================================================
// SYNC MANAGEMENT
// ============================================================================

/**
 * Update sync state after successful sync
 */
export async function recordSyncSuccess(
  sourceName: string,
  cursor: string | null,
  metadata?: Record<string, any>
): Promise<void> {
  await prisma.syncState.upsert({
    where: { sourceName },
    update: {
      cursor,
      lastSyncAt: new Date(),
      lastSuccessAt: new Date(),
      status: 'success',
      lastError: null,
      metadata: metadata as Prisma.InputJsonValue,
    },
    create: {
      sourceName,
      cursor,
      lastSyncAt: new Date(),
      lastSuccessAt: new Date(),
      status: 'success',
      metadata: metadata as Prisma.InputJsonValue,
    },
  });
}

/**
 * Update sync state after failed sync
 */
export async function recordSyncFailure(
  sourceName: string,
  error: string
): Promise<void> {
  await prisma.syncState.upsert({
    where: { sourceName },
    update: {
      lastSyncAt: new Date(),
      status: 'failed',
      lastError: error,
    },
    create: {
      sourceName,
      lastSyncAt: new Date(),
      status: 'failed',
      lastError: error,
    },
  });
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: {
  correlationId: string;
  action: string;
  actorId?: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      correlationId: params.correlationId,
      action: params.action,
      actorId: params.actorId || 'system',
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata as Prisma.InputJsonValue,
    },
  });
}

/**
 * Generate a unique correlation ID for tracing operations
 */
export function generateCorrelationId(prefix = 'op'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// GDPR COMPLIANCE
// ============================================================================

/**
 * Soft delete a person (GDPR right to erasure)
 */
export async function deletePerson(
  personId: string,
  actorId?: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.person.update({
      where: { id: personId },
      data: { deletedAt: new Date() },
    });

    const correlationId = generateCorrelationId('delete');
    await tx.auditLog.create({
      data: {
        correlationId,
        action: 'person.deleted',
        actorId: actorId || 'system',
        entityType: 'Person',
        entityId: personId,
        metadata: {},
      },
    });
  });
}

/**
 * Export all data for a person (GDPR right to data portability)
 */
export async function exportPersonData(personId: string) {
  const person = await prisma.person.findUniqueOrThrow({
    where: { id: personId },
    include: {
      organization: true,
      outgoingEdges: {
        include: { toPerson: true },
      },
      incomingEdges: {
        include: { fromPerson: true },
      },
    },
  });

  const interactions = await prisma.interaction.findMany({
    where: {
      participants: { hasSome: person.emails },
    },
  });

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      entityType: 'Person',
      entityId: personId,
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    person,
    interactions,
    auditLogs,
    exportedAt: new Date(),
  };
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Batch create persons with audit trail
 */
export async function batchCreatePersons(
  persons: Prisma.PersonCreateInput[],
  sourceName: string,
  actorId?: string
): Promise<Person[]> {
  return prisma.$transaction(async (tx) => {
    const created: Person[] = [];
    const correlationId = generateCorrelationId('import');

    for (const personData of persons) {
      const person = await tx.person.create({ data: personData });
      created.push(person);

      await tx.auditLog.create({
        data: {
          correlationId,
          action: 'person.created',
          actorId: actorId || 'system',
          entityType: 'Person',
          entityId: person.id,
          metadata: { source: sourceName },
        },
      });
    }

    return created;
  });
}

/**
 * Paginate through large result sets using cursor-based pagination
 */
export async function* paginatePersons(
  pageSize = 100,
  where?: Prisma.PersonWhereInput
) {
  let cursor: string | undefined = undefined;

  while (true) {
    const persons = await prisma.person.findMany({
      take: pageSize,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      where,
      orderBy: { createdAt: 'asc' },
    });

    if (persons.length === 0) break;

    yield persons;

    cursor = persons[persons.length - 1].id;
  }
}
