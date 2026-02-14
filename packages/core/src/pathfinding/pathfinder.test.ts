/**
 * Pathfinder Service Tests
 *
 * Tests the complete pathfinding service.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Pathfinder } from './pathfinder';

// Mock Prisma client
const mockPrisma = {
  person: {
    findMany: vi.fn(),
  },
  edge: {
    findMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

describe('Pathfinder', () => {
  const userId = 'user-1';
  const mePersonId = 'person-me';
  const targetId = 'person-target';

  const testPersons = [
    { id: mePersonId, names: ['Me'], metadata: { isMe: true } },
    { id: 'person-alice', names: ['Alice'], metadata: null },
    { id: 'person-bob', names: ['Bob'], metadata: null },
    { id: targetId, names: ['Target Person'], metadata: null },
  ];

  const testEdges = [
    { fromPersonId: mePersonId, toPersonId: 'person-alice', strength: 0.9, channels: ['email'] },
    { fromPersonId: 'person-alice', toPersonId: 'person-bob', strength: 0.8, channels: ['linkedin'] },
    { fromPersonId: 'person-bob', toPersonId: targetId, strength: 0.7, channels: ['phone'] },
    { fromPersonId: mePersonId, toPersonId: targetId, strength: 0.6, channels: ['email'] }, // Direct path
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ personId: mePersonId });
    mockPrisma.person.findMany.mockResolvedValue(testPersons);
    mockPrisma.edge.findMany.mockResolvedValue(testEdges);
  });

  it('should instantiate with PrismaClient', () => {
    const pathfinder = new Pathfinder(mockPrisma as any);
    expect(pathfinder).toBeInstanceOf(Pathfinder);
  });

  it('should return PathResult array', async () => {
    const pathfinder = new Pathfinder(mockPrisma as any);
    const results = await pathfinder.findWarmIntroPaths(userId, targetId);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('should return results ranked by score (highest first)', async () => {
    const pathfinder = new Pathfinder(mockPrisma as any);
    const results = await pathfinder.findWarmIntroPaths(userId, targetId);

    // Results should be sorted by score descending
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
    }
  });

  it('should include explanations in results', async () => {
    const pathfinder = new Pathfinder(mockPrisma as any);
    const results = await pathfinder.findWarmIntroPaths(userId, targetId);

    for (const result of results) {
      expect(result.explanation).toBeDefined();
      expect(typeof result.explanation).toBe('string');
      expect(result.explanation.length).toBeGreaterThan(0);
    }
  });

  it('should respect maxHops option', async () => {
    const pathfinder = new Pathfinder(mockPrisma as any);
    const results = await pathfinder.findWarmIntroPaths(userId, targetId, { maxHops: 1 });

    // With maxHops=1, only direct connections should be found
    for (const result of results) {
      expect(result.path.length).toBeLessThanOrEqual(2);
    }
  });

  it('should respect maxPaths option', async () => {
    const pathfinder = new Pathfinder(mockPrisma as any);
    const results = await pathfinder.findWarmIntroPaths(userId, targetId, { maxPaths: 2 });

    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('should return empty array when target not in graph', async () => {
    const pathfinder = new Pathfinder(mockPrisma as any);
    const results = await pathfinder.findWarmIntroPaths(userId, 'nonexistent-person');

    expect(results).toEqual([]);
  });

  it('should return empty array when no path to target', async () => {
    // Setup: isolated target with no edges
    const isolatedPersons = [
      { id: mePersonId, names: ['Me'], metadata: { isMe: true } },
      { id: 'isolated', names: ['Isolated'], metadata: null },
    ];
    mockPrisma.person.findMany.mockResolvedValue(isolatedPersons);
    mockPrisma.edge.findMany.mockResolvedValue([]);

    const pathfinder = new Pathfinder(mockPrisma as any);
    const results = await pathfinder.findWarmIntroPaths(userId, 'isolated');

    expect(results).toEqual([]);
  });

  it('should only return paths for the specified userId (multi-tenant)', async () => {
    const pathfinder = new Pathfinder(mockPrisma as any);
    await pathfinder.findWarmIntroPaths(userId, targetId);

    // Verify person query filtered by userId
    expect(mockPrisma.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: userId,
        }),
      })
    );

    // Verify edge query filtered by user's persons
    expect(mockPrisma.edge.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          toPerson: expect.objectContaining({
            userId: userId,
          }),
        }),
      })
    );
  });
});
