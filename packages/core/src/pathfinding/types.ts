/**
 * Pathfinding Types
 *
 * Core type definitions for the pathfinding module.
 */

/**
 * Node in the relationship graph
 */
export interface Node {
  /** Person ID */
  id: string;
  /** Person's display name */
  name: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Edge connecting two nodes in the graph
 */
export interface Edge {
  /** Source node ID */
  fromId: string;
  /** Target node ID */
  toId: string;
  /** Relationship strength (0-1) */
  score: number;
  /** Communication channels used */
  channels?: string[];
}

/**
 * Adjacency list representation of the graph
 */
export type Adjacency = Map<string, Edge[]>;

/**
 * Complete graph structure
 */
export interface Graph {
  /** Map of node ID to Node */
  nodes: Map<string, Node>;
  /** Adjacency list: node ID to outgoing edges */
  adjacency: Adjacency;
}

/**
 * A path through the graph
 */
export interface Path {
  /** Ordered array of node IDs from start to target */
  nodeIds: string[];
  /** Edges traversed in the path */
  edges: Edge[];
}

/**
 * A path with a computed score
 */
export interface ScoredPath extends Path {
  /** Computed path score (0-1) */
  score: number;
}

/**
 * A ranked path with explanation
 */
export interface RankedPath extends ScoredPath {
  /** Rank among all paths (1 = best) */
  rank: number;
  /** Human-readable explanation */
  explanation: string;
}

/**
 * Options for the pathfinder
 */
export interface PathfinderOptions {
  /** Maximum number of hops (default: 3) */
  maxHops?: number;
  /** Maximum number of paths to return (default: 5) */
  maxPaths?: number;
}

/**
 * Result from pathfinder
 */
export interface PathResult {
  /** Ordered array of node IDs */
  path: string[];
  /** Computed score (0-1) */
  score: number;
  /** Human-readable explanation */
  explanation: string;
  /** Rank among results (1 = best) */
  rank: number;
}
