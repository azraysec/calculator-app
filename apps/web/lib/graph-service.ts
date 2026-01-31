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
      // First verify the fromPerson belongs to this user
      const fromPerson = await prisma.person.findFirst({
        where: { id: personId, userId },
        select: { id: true }
      });

      if (!fromPerson) return [];

      const results = await prisma.edge.findMany({
        where: {
          fromPersonId: personId,
          // Ensure toPerson also belongs to this user
          toPerson: { userId }
        },
        orderBy: { strength: 'desc' },
      });

      return results.map(edge => ({
        ...edge,
        strengthFactors: edge.strengthFactors as any,
      } as Edge));
    },

    getIncomingEdges: async (personId) => {
      // CRITICAL: Only return edges where both people belong to the user
      // First verify the toPerson belongs to this user
      const toPerson = await prisma.person.findFirst({
        where: { id: personId, userId },
        select: { id: true }
      });

      if (!toPerson) return [];

      const results = await prisma.edge.findMany({
        where: {
          toPersonId: personId,
          // Ensure fromPerson also belongs to this user
          fromPerson: { userId }
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
