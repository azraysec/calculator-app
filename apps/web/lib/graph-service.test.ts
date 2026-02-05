/**
 * Tests for GraphService factory
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('./prisma', () => ({
  prisma: {
    person: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    edge: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    organization: {
      count: vi.fn(),
    },
  },
}));

// Mock GraphServiceImpl - must be a class since it's called with new
let capturedCallbacks: any = null;
vi.mock('@wig/core', () => ({
  GraphServiceImpl: class MockGraphServiceImpl {
    constructor(callbacks: any) {
      capturedCallbacks = callbacks;
    }
  },
}));

import { createGraphService } from './graph-service';
import { prisma } from './prisma';
import { GraphServiceImpl } from '@wig/core';

describe('createGraphService', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    capturedCallbacks = null;
  });

  it('should create a GraphServiceImpl with callbacks', () => {
    createGraphService(mockUserId);

    expect(capturedCallbacks).toBeDefined();
    expect(capturedCallbacks.getPerson).toBeInstanceOf(Function);
    expect(capturedCallbacks.getOutgoingEdges).toBeInstanceOf(Function);
    expect(capturedCallbacks.getIncomingEdges).toBeInstanceOf(Function);
    expect(capturedCallbacks.getAllPeople).toBeInstanceOf(Function);
    expect(capturedCallbacks.getStats).toBeInstanceOf(Function);
  });

  describe('getPerson callback', () => {
    it('should filter by userId for multi-tenant isolation', async () => {
      createGraphService(mockUserId);
      vi.mocked(prisma.person.findFirst).mockResolvedValue(null);

      await capturedCallbacks.getPerson('person-123');

      expect(prisma.person.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'person-123',
            userId: mockUserId,
            deletedAt: null,
          }),
        })
      );
    });

    it('should return null when person not found', async () => {
      createGraphService(mockUserId);
      vi.mocked(prisma.person.findFirst).mockResolvedValue(null);

      const result = await capturedCallbacks.getPerson('person-123');

      expect(result).toBeNull();
    });

    it('should return person with socialHandles', async () => {
      const mockPerson = {
        id: 'person-123',
        userId: mockUserId,
        names: ['Alice'],
        socialHandles: { linkedin: 'alice' },
        organization: null,
      };

      createGraphService(mockUserId);
      vi.mocked(prisma.person.findFirst).mockResolvedValue(mockPerson as any);

      const result = await capturedCallbacks.getPerson('person-123');

      expect(result).toMatchObject({
        id: 'person-123',
        socialHandles: { linkedin: 'alice' },
      });
    });
  });

  describe('getOutgoingEdges callback', () => {
    it('should return empty array when person not found', async () => {
      createGraphService(mockUserId);
      vi.mocked(prisma.person.findFirst).mockResolvedValue(null);

      const result = await capturedCallbacks.getOutgoingEdges('person-123');

      expect(result).toEqual([]);
    });

    it('should return edges with multi-tenant filter', async () => {
      createGraphService(mockUserId);
      vi.mocked(prisma.person.findFirst).mockResolvedValue({ id: 'person-123' } as any);
      vi.mocked(prisma.edge.findMany).mockResolvedValue([
        { id: 'edge-1', fromPersonId: 'person-123', toPersonId: 'person-456', strengthFactors: {} },
      ] as any);

      const result = await capturedCallbacks.getOutgoingEdges('person-123');

      expect(result).toHaveLength(1);
      expect(prisma.edge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fromPersonId: 'person-123',
            toPerson: { userId: mockUserId },
          }),
        })
      );
    });
  });

  describe('getIncomingEdges callback', () => {
    it('should return empty array when person not found', async () => {
      createGraphService(mockUserId);
      vi.mocked(prisma.person.findFirst).mockResolvedValue(null);

      const result = await capturedCallbacks.getIncomingEdges('person-123');

      expect(result).toEqual([]);
    });

    it('should return edges with multi-tenant filter', async () => {
      createGraphService(mockUserId);
      vi.mocked(prisma.person.findFirst).mockResolvedValue({ id: 'person-123' } as any);
      vi.mocked(prisma.edge.findMany).mockResolvedValue([]);

      await capturedCallbacks.getIncomingEdges('person-123');

      expect(prisma.edge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            toPersonId: 'person-123',
            fromPerson: { userId: mockUserId },
          }),
        })
      );
    });
  });

  describe('getAllPeople callback', () => {
    it('should filter by userId', async () => {
      createGraphService(mockUserId);
      vi.mocked(prisma.person.findMany).mockResolvedValue([]);

      await capturedCallbacks.getAllPeople();

      expect(prisma.person.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          deletedAt: null,
        },
      });
    });

    it('should return people with socialHandles', async () => {
      createGraphService(mockUserId);
      vi.mocked(prisma.person.findMany).mockResolvedValue([
        { id: 'p1', names: ['Alice'], socialHandles: { twitter: '@alice' } },
      ] as any);

      const result = await capturedCallbacks.getAllPeople();

      expect(result[0].socialHandles).toEqual({ twitter: '@alice' });
    });
  });

  describe('getStats callback', () => {
    it('should return stats filtered by userId', async () => {
      createGraphService(mockUserId);

      vi.mocked(prisma.person.findMany).mockResolvedValue([
        { id: 'p1' },
        { id: 'p2' },
      ] as any);
      vi.mocked(prisma.person.count).mockResolvedValue(2);
      vi.mocked(prisma.edge.count).mockResolvedValueOnce(5).mockResolvedValueOnce(1);
      vi.mocked(prisma.organization.count).mockResolvedValue(3);

      const result = await capturedCallbacks.getStats();

      expect(result.totalPeople).toBe(2);
      expect(result.totalEdges).toBe(5);
      expect(result.totalOrganizations).toBe(3);
      expect(result.strongConnections).toBe(1);
      expect(result.averageConnections).toBe(2.5);
    });

    it('should handle zero people', async () => {
      createGraphService(mockUserId);

      vi.mocked(prisma.person.findMany).mockResolvedValue([]);
      vi.mocked(prisma.person.count).mockResolvedValue(0);
      vi.mocked(prisma.edge.count).mockResolvedValue(0);
      vi.mocked(prisma.organization.count).mockResolvedValue(0);

      const result = await capturedCallbacks.getStats();

      expect(result.totalPeople).toBe(0);
      expect(result.averageConnections).toBe(0);
    });
  });
});
