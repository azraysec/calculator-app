/**
 * BFS Traversal
 *
 * Breadth-first search algorithm to find all paths between two nodes.
 * Supports configurable maximum hops and avoids cycles.
 */

import type { Graph, Path, Edge } from './types';

/**
 * Internal state for BFS traversal
 */
interface BFSState {
  currentId: string;
  path: string[];
  edges: Edge[];
  visited: Set<string>;
}

/**
 * Find all paths from start to target node using BFS.
 *
 * @param graph - The graph to search
 * @param startId - Starting node ID
 * @param targetId - Target node ID
 * @param maxHops - Maximum number of hops allowed (default: 3)
 * @returns Array of all found paths
 */
export function findAllPaths(
  graph: Graph,
  startId: string,
  targetId: string,
  maxHops: number = 3
): Path[] {
  // Handle edge cases
  if (startId === targetId) {
    return [];
  }

  if (!graph.nodes.has(startId) || !graph.nodes.has(targetId)) {
    return [];
  }

  const results: Path[] = [];

  // Initialize BFS queue
  const queue: BFSState[] = [
    {
      currentId: startId,
      path: [startId],
      edges: [],
      visited: new Set([startId]),
    },
  ];

  while (queue.length > 0) {
    const state = queue.shift()!;
    const { currentId, path, edges, visited } = state;

    // Get neighbors
    const outgoingEdges = graph.adjacency.get(currentId) || [];

    for (const edge of outgoingEdges) {
      const neighborId = edge.toId;

      // Skip if already visited in this path (avoid cycles)
      if (visited.has(neighborId)) {
        continue;
      }

      // Build new path
      const newPath = [...path, neighborId];
      const newEdges = [...edges, edge];

      // Check if we reached the target
      if (neighborId === targetId) {
        results.push({
          nodeIds: newPath,
          edges: newEdges,
        });
        continue;
      }

      // Check if we can continue (haven't exceeded maxHops)
      // Path length = number of nodes, hops = path.length - 1
      const currentHops = newPath.length - 1;
      if (currentHops >= maxHops) {
        continue;
      }

      // Add to queue for further exploration
      const newVisited = new Set(visited);
      newVisited.add(neighborId);

      queue.push({
        currentId: neighborId,
        path: newPath,
        edges: newEdges,
        visited: newVisited,
      });
    }
  }

  return results;
}
