/**
 * GraphService factory with Prisma dependency injection
 */

import { GraphServiceImpl } from '@wig/core';
import { prisma } from './prisma';

export function createGraphService() {
  return new GraphServiceImpl({
    getPerson: async (id) =>
      prisma.person.findUnique({
        where: { id, deletedAt: null },
        include: { organization: true },
      }),

    getOutgoingEdges: async (personId) =>
      prisma.edge.findMany({
        where: { fromPersonId: personId },
        orderBy: { strength: 'desc' },
      }),

    getIncomingEdges: async (personId) =>
      prisma.edge.findMany({
        where: { toPersonId: personId },
        orderBy: { strength: 'desc' },
      }),

    getAllPeople: async () =>
      prisma.person.findMany({ where: { deletedAt: null } }),

    getStats: async () => {
      const [peopleCount, edgeCount, orgCount] = await Promise.all([
        prisma.person.count({ where: { deletedAt: null } }),
        prisma.edge.count(),
        prisma.organization.count(),
      ]);
      return { peopleCount, edgeCount, orgCount };
    },
  });
}
