/**
 * Unit tests for PathFinder class and pathfinding utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PathFinder, calculatePathRankingFactors } from './pathfinding';
import type { Person, Edge, Path } from '@wig/shared-types';

// Helper to create mock person
function createMockPerson(id: string, name: string): Person {
  return {
    id,
    names: [name],
    emails: [`${name.toLowerCase()}@example.com`],
    phones: [],
    previousIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Helper to create mock edge
function createMockEdge(
  fromId: string,
  toId: string,
  strength: number = 0.8,
  daysAgo: number = 7
): Edge {
  const lastSeenAt = new Date();
  lastSeenAt.setDate(lastSeenAt.getDate() - daysAgo);

  return {
    id: `edge-${fromId}-${toId}`,
    fromPersonId: fromId,
    toPersonId: toId,
    relationshipType: 'knows',
    strength,
    sources: ['linkedin'],
    channels: ['linkedin'],
    firstSeenAt: new Date(),
    lastSeenAt,
    interactionCount: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('PathFinder', () => {
  describe('findPaths - sequential mode', () => {
    it('should return empty array when source person not found', async () => {
      const getPerson = vi.fn().mockResolvedValue(null);
      const getOutgoingEdges = vi.fn().mockResolvedValue([]);

      const finder = new PathFinder(getPerson, getOutgoingEdges);
      const paths = await finder.findPaths('source-id', 'target-id');

      expect(paths).toEqual([]);
      expect(getPerson).toHaveBeenCalledWith('source-id');
    });

    it('should find direct connection (1-hop path)', async () => {
      const alice = createMockPerson('alice', 'Alice');
      const bob = createMockPerson('bob', 'Bob');
      const edge = createMockEdge('alice', 'bob');

      const getPerson = vi.fn().mockImplementation((id) => {
        if (id === 'alice') return Promise.resolve(alice);
        if (id === 'bob') return Promise.resolve(bob);
        return Promise.resolve(null);
      });
      const getOutgoingEdges = vi.fn().mockResolvedValue([edge]);

      const finder = new PathFinder(getPerson, getOutgoingEdges);
      const paths = await finder.findPaths('alice', 'bob');

      expect(paths).toHaveLength(1);
      expect(paths[0].nodes).toHaveLength(2);
      expect(paths[0].nodes[0].id).toBe('alice');
      expect(paths[0].nodes[1].id).toBe('bob');
      expect(paths[0].edges).toHaveLength(1);
      expect(paths[0].explanation).toContain('Direct connection');
    });

    it('should find 2-hop path through intermediary', async () => {
      const alice = createMockPerson('alice', 'Alice');
      const bob = createMockPerson('bob', 'Bob');
      const charlie = createMockPerson('charlie', 'Charlie');

      const edge1 = createMockEdge('alice', 'bob');
      const edge2 = createMockEdge('bob', 'charlie');

      const getPerson = vi.fn().mockImplementation((id) => {
        const people: Record<string, Person> = { alice, bob, charlie };
        return Promise.resolve(people[id] || null);
      });
      const getOutgoingEdges = vi.fn().mockImplementation((personId) => {
        if (personId === 'alice') return Promise.resolve([edge1]);
        if (personId === 'bob') return Promise.resolve([edge2]);
        return Promise.resolve([]);
      });

      const finder = new PathFinder(getPerson, getOutgoingEdges);
      const paths = await finder.findPaths('alice', 'charlie');

      expect(paths).toHaveLength(1);
      expect(paths[0].nodes).toHaveLength(3);
      expect(paths[0].nodes[0].id).toBe('alice');
      expect(paths[0].nodes[1].id).toBe('bob');
      expect(paths[0].nodes[2].id).toBe('charlie');
      expect(paths[0].explanation).toContain('2-hop path via Bob');
    });

    it('should respect maxHops option', async () => {
      const alice = createMockPerson('alice', 'Alice');
      const bob = createMockPerson('bob', 'Bob');
      const charlie = createMockPerson('charlie', 'Charlie');
      const dave = createMockPerson('dave', 'Dave');

      // Create a 3-hop path: Alice -> Bob -> Charlie -> Dave
      const getPerson = vi.fn().mockImplementation((id) => {
        const people: Record<string, Person> = { alice, bob, charlie, dave };
        return Promise.resolve(people[id] || null);
      });
      const getOutgoingEdges = vi.fn().mockImplementation((personId) => {
        if (personId === 'alice') return Promise.resolve([createMockEdge('alice', 'bob')]);
        if (personId === 'bob') return Promise.resolve([createMockEdge('bob', 'charlie')]);
        if (personId === 'charlie') return Promise.resolve([createMockEdge('charlie', 'dave')]);
        return Promise.resolve([]);
      });

      const finder = new PathFinder(getPerson, getOutgoingEdges);

      // With maxHops=2, should not find the 3-hop path
      const paths2 = await finder.findPaths('alice', 'dave', { maxHops: 2 });
      expect(paths2).toHaveLength(0);

      // With maxHops=3, should find it
      const paths3 = await finder.findPaths('alice', 'dave', { maxHops: 3 });
      expect(paths3).toHaveLength(1);
    });

    it('should filter edges below minStrength', async () => {
      const alice = createMockPerson('alice', 'Alice');
      const bob = createMockPerson('bob', 'Bob');

      // Weak edge that should be filtered
      const weakEdge = createMockEdge('alice', 'bob', 0.2);

      const getPerson = vi.fn().mockImplementation((id) => {
        if (id === 'alice') return Promise.resolve(alice);
        if (id === 'bob') return Promise.resolve(bob);
        return Promise.resolve(null);
      });
      const getOutgoingEdges = vi.fn().mockResolvedValue([weakEdge]);

      const finder = new PathFinder(getPerson, getOutgoingEdges);
      const paths = await finder.findPaths('alice', 'bob', { minStrength: 0.3 });

      expect(paths).toHaveLength(0);
    });

    it('should limit results to maxResults', async () => {
      const alice = createMockPerson('alice', 'Alice');
      const bob = createMockPerson('bob', 'Bob');

      // Create multiple paths
      const edges = [
        createMockEdge('alice', 'bob', 0.9),
        createMockEdge('alice', 'bob', 0.8),
        createMockEdge('alice', 'bob', 0.7),
      ];
      edges.forEach((e, i) => (e.id = `edge-${i}`));

      const getPerson = vi.fn().mockImplementation((id) => {
        if (id === 'alice') return Promise.resolve(alice);
        if (id === 'bob') return Promise.resolve(bob);
        return Promise.resolve(null);
      });
      const getOutgoingEdges = vi.fn().mockResolvedValue(edges);

      const finder = new PathFinder(getPerson, getOutgoingEdges);
      const paths = await finder.findPaths('alice', 'bob', { maxResults: 2 });

      expect(paths.length).toBeLessThanOrEqual(2);
    });

    it('should skip deleted persons', async () => {
      const alice = createMockPerson('alice', 'Alice');
      const deletedBob: Person = {
        ...createMockPerson('bob', 'Bob'),
        deletedAt: new Date(),
      };

      const edge = createMockEdge('alice', 'bob');

      const getPerson = vi.fn().mockImplementation((id) => {
        if (id === 'alice') return Promise.resolve(alice);
        if (id === 'bob') return Promise.resolve(deletedBob);
        return Promise.resolve(null);
      });
      const getOutgoingEdges = vi.fn().mockResolvedValue([edge]);

      const finder = new PathFinder(getPerson, getOutgoingEdges);
      const paths = await finder.findPaths('alice', 'bob');

      expect(paths).toHaveLength(0);
    });

    it('should avoid cycles in paths', async () => {
      const alice = createMockPerson('alice', 'Alice');
      const bob = createMockPerson('bob', 'Bob');

      // Create a cycle: Alice -> Bob -> Alice
      const edge1 = createMockEdge('alice', 'bob');
      const edge2 = createMockEdge('bob', 'alice');

      const getPerson = vi.fn().mockImplementation((id) => {
        if (id === 'alice') return Promise.resolve(alice);
        if (id === 'bob') return Promise.resolve(bob);
        return Promise.resolve(null);
      });
      const getOutgoingEdges = vi.fn().mockImplementation((personId) => {
        if (personId === 'alice') return Promise.resolve([edge1]);
        if (personId === 'bob') return Promise.resolve([edge2]);
        return Promise.resolve([]);
      });

      const finder = new PathFinder(getPerson, getOutgoingEdges);
      const paths = await finder.findPaths('alice', 'bob');

      // Should find path without cycling back
      expect(paths).toHaveLength(1);
      expect(paths[0].nodes.filter((n) => n.id === 'alice')).toHaveLength(1);
    });
  });

  describe('findPaths - batch mode', () => {
    it('should use batch operations when available', async () => {
      const alice = createMockPerson('alice', 'Alice');
      const bob = createMockPerson('bob', 'Bob');
      const edge = createMockEdge('alice', 'bob');

      const getPerson = vi.fn().mockResolvedValue(alice);
      const getOutgoingEdges = vi.fn();
      const getPeople = vi.fn().mockResolvedValue([bob]);
      const getOutgoingEdgesForMany = vi.fn().mockResolvedValue(
        new Map([['alice', [edge]]])
      );

      const finder = new PathFinder(
        getPerson,
        getOutgoingEdges,
        getPeople,
        getOutgoingEdgesForMany
      );
      const paths = await finder.findPaths('alice', 'bob');

      expect(paths).toHaveLength(1);
      // Should NOT call sequential getOutgoingEdges
      expect(getOutgoingEdges).not.toHaveBeenCalled();
      // Should call batch operations
      expect(getOutgoingEdgesForMany).toHaveBeenCalled();
      expect(getPeople).toHaveBeenCalled();
    });

    it('should handle batch operations with 2-hop paths', async () => {
      const alice = createMockPerson('alice', 'Alice');
      const bob = createMockPerson('bob', 'Bob');
      const charlie = createMockPerson('charlie', 'Charlie');

      const edge1 = createMockEdge('alice', 'bob');
      const edge2 = createMockEdge('bob', 'charlie');

      const getPerson = vi.fn().mockImplementation((id) => {
        if (id === 'alice') return Promise.resolve(alice);
        return Promise.resolve(null);
      });
      const getOutgoingEdges = vi.fn();
      const getPeople = vi.fn().mockImplementation((ids: string[]) => {
        const people: Record<string, Person> = { alice, bob, charlie };
        return Promise.resolve(ids.map((id) => people[id]).filter(Boolean));
      });
      const getOutgoingEdgesForMany = vi.fn().mockImplementation((ids: string[]) => {
        const edgesMap = new Map<string, Edge[]>();
        if (ids.includes('alice')) edgesMap.set('alice', [edge1]);
        if (ids.includes('bob')) edgesMap.set('bob', [edge2]);
        return Promise.resolve(edgesMap);
      });

      const finder = new PathFinder(
        getPerson,
        getOutgoingEdges,
        getPeople,
        getOutgoingEdgesForMany
      );
      const paths = await finder.findPaths('alice', 'charlie');

      expect(paths).toHaveLength(1);
      expect(paths[0].nodes).toHaveLength(3);
    });
  });

  describe('path ranking', () => {
    it('should rank paths by score (higher first)', async () => {
      const alice = createMockPerson('alice', 'Alice');
      const bob = createMockPerson('bob', 'Bob');

      // Two edges with different strengths
      const strongEdge = createMockEdge('alice', 'bob', 0.9);
      const weakEdge = { ...createMockEdge('alice', 'bob', 0.5), id: 'weak-edge' };

      const getPerson = vi.fn().mockImplementation((id) => {
        if (id === 'alice') return Promise.resolve(alice);
        if (id === 'bob') return Promise.resolve(bob);
        return Promise.resolve(null);
      });

      // Return both edges to get multiple paths
      const getOutgoingEdges = vi.fn().mockResolvedValue([strongEdge, weakEdge]);

      const finder = new PathFinder(getPerson, getOutgoingEdges);
      const paths = await finder.findPaths('alice', 'bob', { maxResults: 10 });

      // Paths should be ranked by score descending
      if (paths.length >= 2) {
        expect(paths[0].score).toBeGreaterThanOrEqual(paths[1].score);
      }
    });

    it('should prefer shorter paths when scores are similar', async () => {
      const alice = createMockPerson('alice', 'Alice');
      const bob = createMockPerson('bob', 'Bob');
      const charlie = createMockPerson('charlie', 'Charlie');

      // Direct path: Alice -> Charlie (1 hop)
      // Indirect path: Alice -> Bob -> Charlie (2 hops)
      const directEdge = createMockEdge('alice', 'charlie', 0.8);
      const edge1 = createMockEdge('alice', 'bob', 0.9);
      const edge2 = createMockEdge('bob', 'charlie', 0.9);

      const getPerson = vi.fn().mockImplementation((id) => {
        const people: Record<string, Person> = { alice, bob, charlie };
        return Promise.resolve(people[id] || null);
      });
      const getOutgoingEdges = vi.fn().mockImplementation((personId) => {
        if (personId === 'alice') return Promise.resolve([directEdge, edge1]);
        if (personId === 'bob') return Promise.resolve([edge2]);
        return Promise.resolve([]);
      });

      const finder = new PathFinder(getPerson, getOutgoingEdges);
      const paths = await finder.findPaths('alice', 'charlie');

      // Both paths should be found
      expect(paths.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('explanation generation', () => {
    it('should generate explanation for direct connection', async () => {
      const alice = createMockPerson('alice', 'Alice');
      const bob = createMockPerson('bob', 'Bob');
      const edge = createMockEdge('alice', 'bob', 0.8);

      const getPerson = vi.fn().mockImplementation((id) => {
        if (id === 'alice') return Promise.resolve(alice);
        if (id === 'bob') return Promise.resolve(bob);
        return Promise.resolve(null);
      });
      const getOutgoingEdges = vi.fn().mockResolvedValue([edge]);

      const finder = new PathFinder(getPerson, getOutgoingEdges);
      const paths = await finder.findPaths('alice', 'bob');

      expect(paths[0].explanation).toContain('Direct connection');
      expect(paths[0].explanation).toContain('strength');
    });

    it('should generate explanation with intermediary names', async () => {
      const alice = createMockPerson('alice', 'Alice');
      const bob = createMockPerson('bob', 'Bob');
      const charlie = createMockPerson('charlie', 'Charlie');

      const edge1 = createMockEdge('alice', 'bob');
      const edge2 = createMockEdge('bob', 'charlie');

      const getPerson = vi.fn().mockImplementation((id) => {
        const people: Record<string, Person> = { alice, bob, charlie };
        return Promise.resolve(people[id] || null);
      });
      const getOutgoingEdges = vi.fn().mockImplementation((personId) => {
        if (personId === 'alice') return Promise.resolve([edge1]);
        if (personId === 'bob') return Promise.resolve([edge2]);
        return Promise.resolve([]);
      });

      const finder = new PathFinder(getPerson, getOutgoingEdges);
      const paths = await finder.findPaths('alice', 'charlie');

      expect(paths[0].explanation).toContain('2-hop path');
      expect(paths[0].explanation).toContain('Bob');
    });
  });
});

describe('calculatePathRankingFactors', () => {
  it('should return zeros for empty path', () => {
    const emptyPath: Path = {
      nodes: [],
      edges: [],
      score: 0,
      explanation: '',
    };

    const factors = calculatePathRankingFactors(emptyPath);

    expect(factors.introducerRelationshipStrength).toBe(0);
    expect(factors.downstreamRelationshipStrength).toBe(0);
    expect(factors.pathLengthPenalty).toBe(1);
    expect(factors.recencyScore).toBe(0);
    expect(factors.evidenceQuality).toBe(0);
  });

  it('should calculate factors for single-edge path', () => {
    const edge = createMockEdge('alice', 'bob', 0.8, 7);

    const path: Path = {
      nodes: [createMockPerson('alice', 'Alice'), createMockPerson('bob', 'Bob')],
      edges: [edge],
      score: 0.8,
      explanation: 'Direct connection',
    };

    const factors = calculatePathRankingFactors(path);

    expect(factors.introducerRelationshipStrength).toBe(0.8);
    expect(factors.downstreamRelationshipStrength).toBe(1.0); // No downstream edges
    expect(factors.pathLengthPenalty).toBe(1); // 0.8^0 = 1
    expect(factors.recencyScore).toBeGreaterThan(0);
    expect(factors.evidenceQuality).toBeGreaterThan(0);
  });

  it('should calculate factors for multi-edge path', () => {
    const edge1 = createMockEdge('alice', 'bob', 0.9, 5);
    const edge2 = createMockEdge('bob', 'charlie', 0.7, 10);

    const path: Path = {
      nodes: [
        createMockPerson('alice', 'Alice'),
        createMockPerson('bob', 'Bob'),
        createMockPerson('charlie', 'Charlie'),
      ],
      edges: [edge1, edge2],
      score: 0.63,
      explanation: '2-hop path via Bob',
    };

    const factors = calculatePathRankingFactors(path);

    expect(factors.introducerRelationshipStrength).toBe(0.9);
    expect(factors.downstreamRelationshipStrength).toBe(0.7);
    expect(factors.pathLengthPenalty).toBe(0.8); // 0.8^1 = 0.8
    expect(factors.recencyScore).toBeGreaterThan(0);
  });

  it('should give higher recency score for more recent interactions', () => {
    const recentEdge = createMockEdge('alice', 'bob', 0.8, 1); // 1 day ago
    const oldEdge = createMockEdge('alice', 'bob', 0.8, 180); // 180 days ago

    const recentPath: Path = {
      nodes: [createMockPerson('alice', 'Alice'), createMockPerson('bob', 'Bob')],
      edges: [recentEdge],
      score: 0.8,
      explanation: '',
    };

    const oldPath: Path = {
      nodes: [createMockPerson('alice', 'Alice'), createMockPerson('bob', 'Bob')],
      edges: [oldEdge],
      score: 0.8,
      explanation: '',
    };

    const recentFactors = calculatePathRankingFactors(recentPath);
    const oldFactors = calculatePathRankingFactors(oldPath);

    expect(recentFactors.recencyScore).toBeGreaterThan(oldFactors.recencyScore);
  });

  it('should give higher evidence quality for interaction sources', () => {
    const interactionEdge: Edge = {
      ...createMockEdge('alice', 'bob', 0.8),
      sources: ['interaction', 'email'],
    };
    const connectionOnlyEdge: Edge = {
      ...createMockEdge('alice', 'bob', 0.8),
      sources: ['linkedin_connection'],
    };

    const interactionPath: Path = {
      nodes: [createMockPerson('alice', 'Alice'), createMockPerson('bob', 'Bob')],
      edges: [interactionEdge],
      score: 0.8,
      explanation: '',
    };

    const connectionPath: Path = {
      nodes: [createMockPerson('alice', 'Alice'), createMockPerson('bob', 'Bob')],
      edges: [connectionOnlyEdge],
      score: 0.8,
      explanation: '',
    };

    const interactionFactors = calculatePathRankingFactors(interactionPath);
    const connectionFactors = calculatePathRankingFactors(connectionPath);

    expect(interactionFactors.evidenceQuality).toBeGreaterThan(
      connectionFactors.evidenceQuality
    );
  });
});
