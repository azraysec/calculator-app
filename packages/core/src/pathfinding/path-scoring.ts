/**
 * Path Scoring
 *
 * Calculates scores for paths based on edge strengths and hop penalties.
 */

import type { Path, ScoredPath } from './types';

/** Default score when edge score is missing */
export const DEFAULT_EDGE_SCORE = 0.5;

/** Hop penalty factor (applied per hop) */
export const HOP_PENALTY = 0.9;

/**
 * Calculate score for a single path.
 *
 * Score is computed by:
 * 1. Multiplying all edge scores together
 * 2. Applying a hop penalty (shorter paths score higher)
 *
 * @param path - Path to score
 * @param edgeScores - Optional map of edge key to score override
 * @returns Computed score between 0 and 1
 */
export function scorePath(
  path: Path,
  edgeScores?: Map<string, number>
): number {
  if (path.edges.length === 0) {
    return 0;
  }

  // Multiply all edge scores
  let score = 1.0;
  for (const edge of path.edges) {
    // Look up override score or use edge's score
    const edgeKey = `${edge.fromId}-${edge.toId}`;
    const edgeScore = edgeScores?.get(edgeKey) ?? edge.score ?? DEFAULT_EDGE_SCORE;
    score *= edgeScore;
  }

  // Apply hop penalty
  // More hops = lower score
  const hops = path.nodeIds.length - 1;
  const hopPenalty = Math.pow(HOP_PENALTY, hops - 1);
  score *= hopPenalty;

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, score));
}

/**
 * Score multiple paths.
 *
 * @param paths - Paths to score
 * @param edgeScores - Optional map of edge key to score override
 * @returns Scored paths
 */
export function scorePaths(
  paths: Path[],
  edgeScores?: Map<string, number>
): ScoredPath[] {
  return paths.map((path) => ({
    ...path,
    score: scorePath(path, edgeScores),
  }));
}
