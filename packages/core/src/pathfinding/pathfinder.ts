/**
 * Pathfinder Service
 *
 * High-level service that orchestrates graph building, path finding,
 * scoring, ranking, and explanation generation.
 */

import type { PrismaClient } from '@prisma/client';
import { buildGraph } from './graph-builder';
import { findAllPaths } from './bfs';
import { scorePaths } from './path-scoring';
import { rankPaths } from './path-ranker';
import { explainPaths } from './explain-path';
import type { PathfinderOptions, PathResult, Graph } from './types';

/** Default maximum number of hops */
export const MAX_HOPS = 3;

/** Default maximum number of paths to return */
export const MAX_PATHS = 5;

/**
 * Pathfinder class for finding warm intro paths.
 */
export class Pathfinder {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find warm intro paths from the user's "me" node to a target person.
   *
   * @param userId - User ID for multi-tenant isolation
   * @param targetId - Target person ID to find paths to
   * @param options - Optional configuration
   * @returns Array of path results, sorted by score
   */
  async findWarmIntroPaths(
    userId: string,
    targetId: string,
    options: PathfinderOptions = {}
  ): Promise<PathResult[]> {
    const { maxHops = MAX_HOPS, maxPaths = MAX_PATHS } = options;

    // Build graph for this user
    const graph = await buildGraph(userId, this.prisma);

    // Find the "me" node (user's Person record)
    const meId = await this.findMeNode(userId, graph);
    if (!meId) {
      return [];
    }

    // Check if target exists in graph
    if (!graph.nodes.has(targetId)) {
      return [];
    }

    // Find all paths from me to target
    const paths = findAllPaths(graph, meId, targetId, maxHops);
    if (paths.length === 0) {
      return [];
    }

    // Score paths
    const scoredPaths = scorePaths(paths);

    // Rank paths and take top N
    const rankedPaths = rankPaths(scoredPaths, maxPaths);

    // Generate explanations
    const nodeNames = new Map<string, string>();
    for (const [id, node] of graph.nodes) {
      nodeNames.set(id, node.name);
    }
    const explainedPaths = explainPaths(rankedPaths, nodeNames);

    // Convert to PathResult format
    return explainedPaths.map((path) => ({
      path: path.nodeIds,
      score: path.score,
      explanation: path.explanation,
      rank: path.rank,
    }));
  }

  /**
   * Find the user's "me" node in the graph.
   *
   * Looks for a Person record that is associated with the user.
   */
  private async findMeNode(userId: string, graph: Graph): Promise<string | null> {
    // First check if user has personId set
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { personId: true },
    });

    if (user?.personId && graph.nodes.has(user.personId)) {
      return user.personId;
    }

    // Fallback: look for a person with isMe metadata
    for (const [id, node] of graph.nodes) {
      if (node.metadata && (node.metadata as any).isMe === true) {
        return id;
      }
    }

    // Fallback: return first node (not ideal but prevents empty results)
    const firstNode = graph.nodes.keys().next();
    return firstNode.done ? null : firstNode.value;
  }
}
