/**
 * Graph Builder
 *
 * Builds an in-memory graph representation from database records.
 * Supports multi-tenant isolation by filtering all queries by userId.
 */

import type { PrismaClient } from '@prisma/client';
import type { Graph, Node, Adjacency } from './types';

/**
 * Build a graph from the database for a specific user.
 *
 * @param userId - User ID to filter records by (multi-tenant isolation)
 * @param prisma - Prisma client instance
 * @returns Graph structure with nodes and adjacency list
 */
export async function buildGraph(
  userId: string,
  prisma: PrismaClient
): Promise<Graph> {
  // Query all persons for this user
  const persons = await prisma.person.findMany({
    where: {
      userId: userId,
      deletedAt: null,
    },
    select: {
      id: true,
      names: true,
      metadata: true,
    },
  });

  // Query all edges for this user's persons
  const personIds = persons.map((p) => p.id);

  const edges = await prisma.edge.findMany({
    where: {
      fromPersonId: { in: personIds },
      // Only include edges where both endpoints belong to this user
      toPerson: {
        userId: userId,
        deletedAt: null,
      },
    },
    select: {
      fromPersonId: true,
      toPersonId: true,
      strength: true,
      channels: true,
    },
  });

  // Build nodes map
  const nodes: Map<string, Node> = new Map();
  for (const person of persons) {
    nodes.set(person.id, {
      id: person.id,
      name: person.names[0] || 'Unknown',
      metadata: person.metadata as Record<string, unknown> | undefined,
    });
  }

  // Build adjacency list (bidirectional edges)
  const adjacency: Adjacency = new Map();

  // Initialize empty adjacency lists for all nodes
  for (const personId of personIds) {
    adjacency.set(personId, []);
  }

  // Add edges to adjacency list
  for (const edge of edges) {
    const fromEdges = adjacency.get(edge.fromPersonId) || [];
    fromEdges.push({
      fromId: edge.fromPersonId,
      toId: edge.toPersonId,
      score: edge.strength,
      channels: edge.channels,
    });
    adjacency.set(edge.fromPersonId, fromEdges);

    // Add reverse edge for bidirectional traversal
    const toEdges = adjacency.get(edge.toPersonId) || [];
    toEdges.push({
      fromId: edge.toPersonId,
      toId: edge.fromPersonId,
      score: edge.strength,
      channels: edge.channels,
    });
    adjacency.set(edge.toPersonId, toEdges);
  }

  return { nodes, adjacency };
}
