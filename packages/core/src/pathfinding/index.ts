/**
 * Pathfinding Module
 *
 * Exports for graph-based path discovery.
 */

// Main service
export { Pathfinder } from './pathfinder';

// Types
export type {
  Graph,
  Node,
  Edge,
  Adjacency,
  Path,
  ScoredPath,
  RankedPath,
  PathfinderOptions,
  PathResult,
} from './types';

// Constants
export { MAX_HOPS, MAX_PATHS, DEFAULT_EDGE_SCORE, HOP_PENALTY } from './constants';

// Utility functions (for advanced use cases)
export { buildGraph } from './graph-builder';
export { findAllPaths } from './bfs';
export { scorePath, scorePaths } from './path-scoring';
export { rankPaths } from './path-ranker';
export { explainPath, explainPaths } from './explain-path';
