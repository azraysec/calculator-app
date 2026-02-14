/**
 * BFS Traversal Tests
 *
 * Tests the breadth-first search algorithm for finding paths.
 */

import { describe, it, expect } from 'vitest';
import { findAllPaths } from './bfs';
import type { Graph, Node, Edge } from './types';

/**
 * Helper to create a test graph
 */
function createTestGraph(): Graph {
  // Create a graph:
  //   A ---0.9--- B ---0.8--- D
  //   |           |
  //  0.7         0.6
  //   |           |
  //   C ---0.5--- E ---0.4--- F
  //
  // Nodes: A, B, C, D, E, F
  // A-B, A-C, B-D, B-E, C-E, E-F

  const nodes: Map<string, Node> = new Map([
    ['A', { id: 'A', name: 'Alice' }],
    ['B', { id: 'B', name: 'Bob' }],
    ['C', { id: 'C', name: 'Charlie' }],
    ['D', { id: 'D', name: 'Dave' }],
    ['E', { id: 'E', name: 'Eve' }],
    ['F', { id: 'F', name: 'Frank' }],
  ]);

  // Build bidirectional adjacency
  const adjacency: Map<string, Edge[]> = new Map();

  const addEdge = (from: string, to: string, score: number) => {
    const edge: Edge = { fromId: from, toId: to, score };
    const reverseEdge: Edge = { fromId: to, toId: from, score };

    const fromEdges = adjacency.get(from) || [];
    fromEdges.push(edge);
    adjacency.set(from, fromEdges);

    const toEdges = adjacency.get(to) || [];
    toEdges.push(reverseEdge);
    adjacency.set(to, toEdges);
  };

  addEdge('A', 'B', 0.9);
  addEdge('A', 'C', 0.7);
  addEdge('B', 'D', 0.8);
  addEdge('B', 'E', 0.6);
  addEdge('C', 'E', 0.5);
  addEdge('E', 'F', 0.4);

  return { nodes, adjacency };
}

/**
 * Helper to create a disconnected graph
 */
function createDisconnectedGraph(): Graph {
  const nodes: Map<string, Node> = new Map([
    ['A', { id: 'A', name: 'Alice' }],
    ['B', { id: 'B', name: 'Bob' }],
    ['X', { id: 'X', name: 'Xavier' }],
    ['Y', { id: 'Y', name: 'Yolanda' }],
  ]);

  const adjacency: Map<string, Edge[]> = new Map();

  // Only A-B connected, X-Y connected separately
  adjacency.set('A', [{ fromId: 'A', toId: 'B', score: 0.9 }]);
  adjacency.set('B', [{ fromId: 'B', toId: 'A', score: 0.9 }]);
  adjacency.set('X', [{ fromId: 'X', toId: 'Y', score: 0.8 }]);
  adjacency.set('Y', [{ fromId: 'Y', toId: 'X', score: 0.8 }]);

  return { nodes, adjacency };
}

describe('findAllPaths', () => {
  it('should find direct connection (1 hop path)', () => {
    const graph = createTestGraph();
    const paths = findAllPaths(graph, 'A', 'B', 3);

    expect(paths.length).toBeGreaterThanOrEqual(1);

    // Find the direct path
    const directPath = paths.find((p) => p.nodeIds.length === 2);
    expect(directPath).toBeDefined();
    expect(directPath?.nodeIds).toEqual(['A', 'B']);
    expect(directPath?.edges.length).toBe(1);
  });

  it('should find 2-hop path through intermediary', () => {
    const graph = createTestGraph();
    const paths = findAllPaths(graph, 'A', 'D', 3);

    expect(paths.length).toBeGreaterThanOrEqual(1);

    // Find a 2-hop path (A -> B -> D)
    const twoHopPath = paths.find((p) => p.nodeIds.length === 3);
    expect(twoHopPath).toBeDefined();
    expect(twoHopPath?.nodeIds).toEqual(['A', 'B', 'D']);
  });

  it('should find 3-hop path through two intermediaries', () => {
    const graph = createTestGraph();
    const paths = findAllPaths(graph, 'A', 'F', 3);

    expect(paths.length).toBeGreaterThanOrEqual(1);

    // Should find paths like A -> B -> E -> F or A -> C -> E -> F
    const threeHopPaths = paths.filter((p) => p.nodeIds.length === 4);
    expect(threeHopPaths.length).toBeGreaterThanOrEqual(1);
  });

  it('should only return direct connections when maxHops=1', () => {
    const graph = createTestGraph();
    const paths = findAllPaths(graph, 'A', 'B', 1);

    expect(paths.length).toBe(1);
    expect(paths[0].nodeIds).toEqual(['A', 'B']);
  });

  it('should return 1-hop and 2-hop paths when maxHops=2', () => {
    const graph = createTestGraph();
    const paths = findAllPaths(graph, 'A', 'D', 2);

    // A -> B -> D is 2 hops, should be included
    expect(paths.length).toBeGreaterThanOrEqual(1);

    // All paths should be at most 3 nodes (2 hops)
    for (const path of paths) {
      expect(path.nodeIds.length).toBeLessThanOrEqual(3);
    }
  });

  it('should return empty array when no path exists', () => {
    const graph = createDisconnectedGraph();
    const paths = findAllPaths(graph, 'A', 'X', 5);

    expect(paths).toEqual([]);
  });

  it('should return empty array when start === target', () => {
    const graph = createTestGraph();
    const paths = findAllPaths(graph, 'A', 'A', 3);

    expect(paths).toEqual([]);
  });

  it('should avoid cycles (not revisit nodes in same path)', () => {
    const graph = createTestGraph();
    const paths = findAllPaths(graph, 'A', 'D', 5);

    // No path should contain duplicates
    for (const path of paths) {
      const uniqueNodes = new Set(path.nodeIds);
      expect(uniqueNodes.size).toBe(path.nodeIds.length);
    }
  });

  it('should find multiple paths to same target', () => {
    const graph = createTestGraph();
    const paths = findAllPaths(graph, 'A', 'E', 3);

    // Should find at least 2 paths:
    // A -> B -> E
    // A -> C -> E
    expect(paths.length).toBeGreaterThanOrEqual(2);

    const pathStrings = paths.map((p) => p.nodeIds.join('->'));
    expect(pathStrings).toContain('A->B->E');
    expect(pathStrings).toContain('A->C->E');
  });

  it('should handle disconnected graph correctly', () => {
    const graph = createDisconnectedGraph();

    // A can reach B
    const pathsAB = findAllPaths(graph, 'A', 'B', 3);
    expect(pathsAB.length).toBe(1);

    // X can reach Y
    const pathsXY = findAllPaths(graph, 'X', 'Y', 3);
    expect(pathsXY.length).toBe(1);

    // A cannot reach X
    const pathsAX = findAllPaths(graph, 'A', 'X', 5);
    expect(pathsAX.length).toBe(0);
  });
});
