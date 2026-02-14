/**
 * Path Explainer
 *
 * Generates human-readable explanations for paths.
 */

import type { RankedPath } from './types';

/**
 * Get strength description based on score.
 */
function getStrengthDescription(score: number): string {
  if (score >= 0.8) return 'strong';
  if (score >= 0.5) return 'moderate';
  return 'weak';
}

/**
 * Generate a human-readable explanation for a path.
 *
 * @param path - Ranked path to explain
 * @param nodeNames - Map of node ID to display name
 * @returns Human-readable explanation string
 */
export function explainPath(
  path: RankedPath,
  nodeNames: Map<string, string>
): string {
  const { nodeIds, score } = path;

  if (nodeIds.length < 2) {
    return 'Invalid path';
  }

  // Get names for all nodes
  const names = nodeIds.map((id) => nodeNames.get(id) || id);
  const target = names[names.length - 1];
  const strength = getStrengthDescription(score);

  // Direct connection (no intermediaries)
  if (nodeIds.length === 2) {
    return `Direct ${strength} connection to ${target}`;
  }

  // Path with intermediaries
  const intermediaries = names.slice(1, -1);

  if (intermediaries.length === 1) {
    return `Connect through ${intermediaries[0]} to reach ${target} (${strength} path)`;
  }

  const intermediaryList = intermediaries.join(' → ');
  return `Connect through ${intermediaryList} to reach ${target} (${strength} path)`;
}

/**
 * Add explanations to ranked paths.
 *
 * @param paths - Ranked paths without explanations
 * @param nodeNames - Map of node ID to display name
 * @returns Ranked paths with explanations filled in
 */
export function explainPaths(
  paths: RankedPath[],
  nodeNames: Map<string, string>
): RankedPath[] {
  return paths.map((path) => ({
    ...path,
    explanation: explainPath(path, nodeNames),
  }));
}
