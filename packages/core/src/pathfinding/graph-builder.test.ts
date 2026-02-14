/**
 * Graph Builder Tests
 *
 * Tests the graph building from database records with multi-tenant isolation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildGraph } from './graph-builder';

// Mock Prisma client
const mockPrisma = {
  person: {
    findMany: vi.fn(),
  },
  edge: {
    findMany: vi.fn(),
  },
};

describe('buildGraph', () => {
  const user1Id = 'user-1-id';
  const user2Id = 'user-2-id';

  const user1Persons = [
    { id: 'person-1', names: ['Alice'], metadata: null },
    { id: 'person-2', names: ['Bob'], metadata: null },
    { id: 'person-3', names: ['Charlie'], metadata: { isMe: true } },
  ];

  const user2Persons = [
    { id: 'person-4', names: ['Dave'], metadata: null },
  ];

  const user1Edges = [
    { fromPersonId: 'person-1', toPersonId: 'person-2', strength: 0.8, channels: ['email'] },
    { fromPersonId: 'person-2', toPersonId: 'person-3', strength: 0.6, channels: ['linkedin'] },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty graph for empty database', async () => {
    mockPrisma.person.findMany.mockResolvedValue([]);
    mockPrisma.edge.findMany.mockResolvedValue([]);

    const graph = await buildGraph(user1Id, mockPrisma as any);

    expect(graph.nodes.size).toBe(0);
    expect(graph.adjacency.size).toBe(0);
  });

  it('should load all persons for the specified user', async () => {
    mockPrisma.person.findMany.mockResolvedValue(user1Persons);
    mockPrisma.edge.findMany.mockResolvedValue([]);

    const graph = await buildGraph(user1Id, mockPrisma as any);

    expect(graph.nodes.size).toBe(3);
    expect(graph.nodes.get('person-1')?.name).toBe('Alice');
    expect(graph.nodes.get('person-2')?.name).toBe('Bob');
    expect(graph.nodes.get('person-3')?.name).toBe('Charlie');

    // Verify query filtered by userId
    expect(mockPrisma.person.findMany).toHaveBeenCalledWith({
      where: {
        userId: user1Id,
        deletedAt: null,
      },
      select: {
        id: true,
        names: true,
        metadata: true,
      },
    });
  });

  it('should NOT load persons belonging to other users', async () => {
    // User 1's query returns only user 1's persons
    mockPrisma.person.findMany.mockResolvedValue(user1Persons);
    mockPrisma.edge.findMany.mockResolvedValue([]);

    const graph = await buildGraph(user1Id, mockPrisma as any);

    // Should not contain user 2's persons
    expect(graph.nodes.has('person-4')).toBe(false);
    expect(graph.nodes.size).toBe(3);
  });

  it('should load all connections for the specified user', async () => {
    mockPrisma.person.findMany.mockResolvedValue(user1Persons);
    mockPrisma.edge.findMany.mockResolvedValue(user1Edges);

    const graph = await buildGraph(user1Id, mockPrisma as any);

    // Check that edges were loaded
    const person1Edges = graph.adjacency.get('person-1') || [];
    expect(person1Edges.length).toBeGreaterThan(0);

    // Verify query filtered by user's persons
    expect(mockPrisma.edge.findMany).toHaveBeenCalledWith({
      where: {
        fromPersonId: { in: ['person-1', 'person-2', 'person-3'] },
        toPerson: {
          userId: user1Id,
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
  });

  it('should NOT load connections belonging to other users', async () => {
    // Setup: user2 queries the graph
    mockPrisma.person.findMany.mockResolvedValue(user2Persons);
    mockPrisma.edge.findMany.mockResolvedValue([]); // User 2 has no edges

    const graph = await buildGraph(user2Id, mockPrisma as any);

    // User 2 should not see user 1's edges
    expect(graph.adjacency.get('person-1')).toBeUndefined();
  });

  it('should build correct adjacency list structure', async () => {
    mockPrisma.person.findMany.mockResolvedValue(user1Persons);
    mockPrisma.edge.findMany.mockResolvedValue(user1Edges);

    const graph = await buildGraph(user1Id, mockPrisma as any);

    // Check adjacency structure
    expect(graph.adjacency.has('person-1')).toBe(true);
    expect(graph.adjacency.has('person-2')).toBe(true);
    expect(graph.adjacency.has('person-3')).toBe(true);

    // Check edge details
    const person1Edges = graph.adjacency.get('person-1') || [];
    const edgeToBob = person1Edges.find((e) => e.toId === 'person-2');
    expect(edgeToBob).toBeDefined();
    expect(edgeToBob?.score).toBe(0.8);
    expect(edgeToBob?.channels).toEqual(['email']);
  });

  it('should create bidirectional edges for connections', async () => {
    mockPrisma.person.findMany.mockResolvedValue(user1Persons);
    mockPrisma.edge.findMany.mockResolvedValue(user1Edges);

    const graph = await buildGraph(user1Id, mockPrisma as any);

    // Edge from person-1 to person-2 should have reverse edge
    const person1Edges = graph.adjacency.get('person-1') || [];
    const person2Edges = graph.adjacency.get('person-2') || [];

    const forwardEdge = person1Edges.find((e) => e.toId === 'person-2');
    const reverseEdge = person2Edges.find((e) => e.toId === 'person-1');

    expect(forwardEdge).toBeDefined();
    expect(reverseEdge).toBeDefined();
    expect(forwardEdge?.score).toBe(reverseEdge?.score);
  });

  it('should handle persons with no connections', async () => {
    const personsWithIsolated = [
      ...user1Persons,
      { id: 'person-isolated', names: ['Isolated'], metadata: null },
    ];

    mockPrisma.person.findMany.mockResolvedValue(personsWithIsolated);
    mockPrisma.edge.findMany.mockResolvedValue(user1Edges);

    const graph = await buildGraph(user1Id, mockPrisma as any);

    // Isolated person should be in nodes
    expect(graph.nodes.has('person-isolated')).toBe(true);

    // Isolated person should have empty adjacency list
    const isolatedEdges = graph.adjacency.get('person-isolated') || [];
    expect(isolatedEdges.length).toBe(0);
  });
});
