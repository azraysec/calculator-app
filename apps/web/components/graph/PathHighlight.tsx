'use client';

/**
 * PathHighlight - Provides highlight styles for introduction path nodes and edges
 *
 * This component generates style overrides for React Flow to highlight
 * a selected introduction path in the network graph.
 */

import { useMemo } from 'react';
import type { Node, Edge } from 'reactflow';

export interface PathHighlightProps {
  /** IDs of nodes in the path to highlight, in order */
  pathNodeIds: string[];
}

export interface HighlightStyles {
  /** Node style overrides by node ID */
  nodeStyles: Map<string, React.CSSProperties>;
  /** Edge style overrides by edge ID (format: "fromId-toId") */
  edgeStyles: Map<string, React.CSSProperties>;
  /** Classnames for highlighted nodes */
  highlightedNodeClass: string;
  /** Classnames for non-highlighted nodes */
  dimmedNodeClass: string;
  /** Check if a node ID is in the highlighted path */
  isHighlighted: (nodeId: string) => boolean;
}

/** Node style when highlighted */
const HIGHLIGHTED_NODE_STYLE: React.CSSProperties = {
  boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.5), 0 4px 20px rgba(59, 130, 246, 0.3)',
  borderColor: '#3b82f6',
  transform: 'scale(1.02)',
  transition: 'all 0.3s ease-in-out',
  zIndex: 10,
};

/** Node style when dimmed (not in path) */
const DIMMED_NODE_STYLE: React.CSSProperties = {
  opacity: 0.4,
  transition: 'all 0.3s ease-in-out',
};

/** Edge style when highlighted */
const HIGHLIGHTED_EDGE_STYLE: React.CSSProperties = {
  strokeWidth: 4,
  stroke: '#3b82f6',
  transition: 'all 0.3s ease-in-out',
};

/** Edge style when dimmed */
const DIMMED_EDGE_STYLE: React.CSSProperties = {
  opacity: 0.2,
  transition: 'all 0.3s ease-in-out',
};

/**
 * Hook to compute highlight styles for a path
 */
export function usePathHighlight(pathNodeIds: string[]): HighlightStyles {
  return useMemo(() => {
    const highlightedNodeIds = new Set(pathNodeIds);
    const nodeStyles = new Map<string, React.CSSProperties>();
    const edgeStyles = new Map<string, React.CSSProperties>();

    // Create edge IDs for consecutive nodes in path
    const highlightedEdgeIds = new Set<string>();
    for (let i = 0; i < pathNodeIds.length - 1; i++) {
      const edgeId = `${pathNodeIds[i]}-${pathNodeIds[i + 1]}`;
      highlightedEdgeIds.add(edgeId);
      // Also add reverse direction
      const reverseEdgeId = `${pathNodeIds[i + 1]}-${pathNodeIds[i]}`;
      highlightedEdgeIds.add(reverseEdgeId);
    }

    return {
      nodeStyles,
      edgeStyles,
      highlightedNodeClass: 'path-highlight-node',
      dimmedNodeClass: 'path-dimmed-node',
      isHighlighted: (nodeId: string) => highlightedNodeIds.has(nodeId),
    };
  }, [pathNodeIds]);
}

/**
 * Apply highlight styles to nodes
 */
export function applyNodeHighlight(
  nodes: Node[],
  pathNodeIds: string[]
): Node[] {
  if (pathNodeIds.length === 0) return nodes;

  const highlightedIds = new Set(pathNodeIds);

  return nodes.map((node) => {
    const isHighlighted = highlightedIds.has(node.id);
    return {
      ...node,
      style: {
        ...node.style,
        ...(isHighlighted ? HIGHLIGHTED_NODE_STYLE : DIMMED_NODE_STYLE),
      },
    };
  });
}

/**
 * Apply highlight styles to edges
 */
export function applyEdgeHighlight(
  edges: Edge[],
  pathNodeIds: string[]
): Edge[] {
  if (pathNodeIds.length === 0) return edges;

  // Create set of highlighted edge connections
  const highlightedEdges = new Set<string>();
  for (let i = 0; i < pathNodeIds.length - 1; i++) {
    highlightedEdges.add(`${pathNodeIds[i]}-${pathNodeIds[i + 1]}`);
    highlightedEdges.add(`${pathNodeIds[i + 1]}-${pathNodeIds[i]}`);
  }

  return edges.map((edge) => {
    const edgeKey = `${edge.source}-${edge.target}`;
    const isHighlighted = highlightedEdges.has(edgeKey);

    return {
      ...edge,
      style: {
        ...edge.style,
        ...(isHighlighted ? HIGHLIGHTED_EDGE_STYLE : DIMMED_EDGE_STYLE),
      },
      animated: isHighlighted,
    };
  });
}

/**
 * PathHighlight component - renders nothing but provides context
 * Use the utility functions for applying styles
 */
export function PathHighlight({ pathNodeIds: _pathNodeIds }: PathHighlightProps): null {
  // This component doesn't render anything - it's a stub for type exports
  // Use the utility functions (applyNodeHighlight, applyEdgeHighlight) directly
  return null;
}

export default PathHighlight;
