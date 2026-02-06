/**
 * GraphService factory with Prisma dependency injection
 * CRITICAL: All queries filter by userId for multi-tenant isolation
 */

import { GraphServiceImpl } from '@wig/core';
import type { Person, Edge } from '@wig/shared-types';
import { prisma } from './prisma';

export function createGraphService(userId: string) {
  return new GraphServiceImpl({
    getPerson: async (id) => {
      // CRITICAL: Filter by userId for multi-tenant isolation
      const result = await prisma.person.findFirst({
        where: {
          id,
          userId,
          deletedAt: null
        },
        include: { organization: true },
      });

      if (!result) return null;

      return {
        ...result,
        socialHandles: result.socialHandles as Record<string, string> | undefined,
      } as Person;
    },

    getOutgoingEdges: async (personId) => {
      // CRITICAL: Only return edges where both people belong to the user
      // Treat edges as BIDIRECTIONAL - include both outgoing and incoming
      // This is necessary because LinkedIn connections are bidirectional relationships
      const [outgoing, incoming] = await Promise.all([
        prisma.edge.findMany({
          where: {
            fromPersonId: personId,
            fromPerson: { userId },
            toPerson: { userId }
          },
          orderBy: { strength: 'desc' },
        }),
        prisma.edge.findMany({
          where: {
            toPersonId: personId,
            fromPerson: { userId },
            toPerson: { userId }
          },
          orderBy: { strength: 'desc' },
        }),
      ]);

      // Convert incoming edges to "outgoing" by swapping from/to
      const incomingAsOutgoing = incoming.map(edge => ({
        ...edge,
        fromPersonId: edge.toPersonId,
        toPersonId: edge.fromPersonId,
        strengthFactors: edge.strengthFactors as any,
      } as Edge));

      // Combine and deduplicate (prefer original direction if both exist)
      const seen = new Set(outgoing.map(e => e.toPersonId));
      const combined = [
        ...outgoing.map(edge => ({
          ...edge,
          strengthFactors: edge.strengthFactors as any,
        } as Edge)),
        ...incomingAsOutgoing.filter(e => !seen.has(e.toPersonId)),
      ];

      return combined;
    },

    getIncomingEdges: async (personId) => {
      // CRITICAL: Only return edges where both people belong to the user
      // The toPerson filter ensures tenant isolation without a separate query
      const results = await prisma.edge.findMany({
        where: {
          toPersonId: personId,
          // Ensure both fromPerson and toPerson belong to this user
          fromPerson: { userId },
          toPerson: { userId }
        },
        orderBy: { strength: 'desc' },
      });

      return results.map(edge => ({
        ...edge,
        strengthFactors: edge.strengthFactors as any,
      } as Edge));
    },

    getAllPeople: async () => {
      // CRITICAL: Filter by userId for multi-tenant isolation
      const results = await prisma.person.findMany({
        where: {
          userId,
          deletedAt: null
        }
      });

      return results.map(person => ({
        ...person,
        socialHandles: person.socialHandles as Record<string, string> | undefined,
      } as Person));
    },

    // Batch methods for efficient pathfinding (70% speedup over sequential)
    getPeople: async (ids: string[]) => {
      if (ids.length === 0) return [];

      const results = await prisma.person.findMany({
        where: {
          id: { in: ids },
          userId,
          deletedAt: null
        },
        include: { organization: true },
      });

      return results.map(person => ({
        ...person,
        socialHandles: person.socialHandles as Record<string, string> | undefined,
      } as Person));
    },

    getOutgoingEdgesForMany: async (personIds: string[]) => {
      if (personIds.length === 0) return new Map();

      // Fetch both outgoing AND incoming edges (bidirectional)
      const [outgoing, incoming] = await Promise.all([
        prisma.edge.findMany({
          where: {
            fromPersonId: { in: personIds },
            fromPerson: { userId },
            toPerson: { userId }
          },
          orderBy: { strength: 'desc' },
        }),
        prisma.edge.findMany({
          where: {
            toPersonId: { in: personIds },
            fromPerson: { userId },
            toPerson: { userId }
          },
          orderBy: { strength: 'desc' },
        }),
      ]);

      // Initialize map with empty arrays
      const edgeMap = new Map<string, Edge[]>();
      const seenTargets = new Map<string, Set<string>>(); // personId -> set of target ids

      for (const personId of personIds) {
        edgeMap.set(personId, []);
        seenTargets.set(personId, new Set());
      }

      // Add outgoing edges
      for (const edge of outgoing) {
        const edges = edgeMap.get(edge.fromPersonId) || [];
        const seen = seenTargets.get(edge.fromPersonId) || new Set();

        edges.push({
          ...edge,
          strengthFactors: edge.strengthFactors as any,
        } as Edge);
        seen.add(edge.toPersonId);

        edgeMap.set(edge.fromPersonId, edges);
        seenTargets.set(edge.fromPersonId, seen);
      }

      // Add incoming edges as "outgoing" (bidirectional)
      for (const edge of incoming) {
        const sourcePersonId = edge.toPersonId; // The person we're looking for edges from
        if (!personIds.includes(sourcePersonId)) continue;

        const edges = edgeMap.get(sourcePersonId) || [];
        const seen = seenTargets.get(sourcePersonId) || new Set();

        // Only add if we haven't already added an edge to this target
        if (!seen.has(edge.fromPersonId)) {
          edges.push({
            ...edge,
            fromPersonId: edge.toPersonId, // Swap direction
            toPersonId: edge.fromPersonId,
            strengthFactors: edge.strengthFactors as any,
          } as Edge);
          seen.add(edge.fromPersonId);
        }

        edgeMap.set(sourcePersonId, edges);
        seenTargets.set(sourcePersonId, seen);
      }

      return edgeMap;
    },

    getStats: async () => {
      // CRITICAL: Filter all stats by userId
      // Get all person IDs for this user to filter edges
      const userPeople = await prisma.person.findMany({
        where: { userId, deletedAt: null },
        select: { id: true }
      });
      const personIds = userPeople.map(p => p.id);

      const [totalPeople, totalEdges, totalOrganizations, strongConnections, recentInteractions] = await Promise.all([
        prisma.person.count({ where: { userId, deletedAt: null } }),
        // Only count edges between this user's people
        prisma.edge.count({
          where: {
            fromPersonId: { in: personIds },
            toPersonId: { in: personIds }
          }
        }),
        // Organizations linked to this user's people
        prisma.organization.count({
          where: {
            people: {
              some: { userId }
            }
          }
        }),
        prisma.edge.count({
          where: {
            strength: { gte: 0.7 },
            fromPersonId: { in: personIds },
            toPersonId: { in: personIds }
          }
        }),
        // TODO: Add recentInteractions count when Interaction model has userId relation
        Promise.resolve(0),
      ]);

      const averageConnections = totalPeople > 0 ? totalEdges / totalPeople : 0;

      return {
        totalPeople,
        totalOrganizations,
        totalEdges,
        averageConnections,
        strongConnections,
        recentInteractions,
        dataSources: [],
      };
    },
  });
}
