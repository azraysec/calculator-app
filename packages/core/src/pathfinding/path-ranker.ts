/**
 * Path Ranker
 *
 * Ranks scored paths by score and assigns rank numbers.
 */

import type { ScoredPath, RankedPath } from './types';

/**
 * Rank paths by score (descending) and assign rank numbers.
 *
 * @param paths - Scored paths to rank
 * @param maxPaths - Maximum number of paths to return (default: all)
 * @returns Ranked paths with rank numbers and explanations
 */
export function rankPaths(
  paths: ScoredPath[],
  maxPaths: number = paths.length
): RankedPath[] {
  if (paths.length === 0) {
    return [];
  }

  // Sort by score descending (stable sort preserves order for ties)
  const sorted = [...paths].sort((a, b) => b.score - a.score);

  // Take top N and assign ranks
  return sorted.slice(0, maxPaths).map((path, index) => ({
    ...path,
    rank: index + 1,
    explanation: '', // Will be filled by explainPath
  }));
}
