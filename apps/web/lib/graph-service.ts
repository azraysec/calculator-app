/**
 * GraphService factory with Prisma dependency injection
 */

import { GraphServiceImpl } from '@wig/core';
import type { Person, Edge } from '@wig/shared-types';
import { prisma } from './prisma';

export function createGraphService() {
  return new GraphServiceImpl({
    getPerson: async (id) => {
      const result = await prisma.person.findUnique({
        where: { id, deletedAt: null },
        include: { organization: true },
      });

      if (!result) return null;

      return {
        ...result,
        socialHandles: result.socialHandles as Record<string, string> | undefined,
      } as Person;
    },

    getOutgoingEdges: async (personId) => {
      const results = await prisma.edge.findMany({
        where: { fromPersonId: personId },
        orderBy: { strength: 'desc' },
      });

      return results.map(edge => ({
        ...edge,
        strengthFactors: edge.strengthFactors as any,
      } as Edge));
    },

    getIncomingEdges: async (personId) => {
      const results = await prisma.edge.findMany({
        where: { toPersonId: personId },
        orderBy: { strength: 'desc' },
      });

      return results.map(edge => ({
        ...edge,
        strengthFactors: edge.strengthFactors as any,
      } as Edge));
    },

    getAllPeople: async () => {
      const results = await prisma.person.findMany({
        where: { deletedAt: null }
      });

      return results.map(person => ({
        ...person,
        socialHandles: person.socialHandles as Record<string, string> | undefined,
      } as Person));
    },

    getStats: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [totalPeople, totalEdges, totalOrganizations, strongConnections, recentInteractions] = await Promise.all([
        prisma.person.count({ where: { deletedAt: null } }),
        prisma.edge.count(),
        prisma.organization.count(),
        prisma.edge.count({ where: { strength: { gte: 0.7 } } }),
        prisma.interaction.count({ where: { timestamp: { gte: thirtyDaysAgo } } }),
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
