'use client';

/**
 * NetworkGraph - Network visualization with path selection and highlighting
 *
 * Integrates React Flow visualization with Zustand store for path selection
 * and PathHighlight component for visual highlighting.
 */

import { useMemo, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MarkerType,
  BackgroundVariant,
  NodeMouseHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { PersonNode } from './person-node';
import { applyNodeHighlight, applyEdgeHighlight } from './PathHighlight';
import { useGraphStore } from '@/lib/stores/graph-store';

const nodeTypes = {
  person: PersonNode,
};

export interface Person {
  id: string;
  names: string[];
  title?: string;
}

export interface PathEdge {
  id: string;
  strength: number;
  fromPersonId: string;
  toPersonId: string;
}

export interface NetworkPath {
  nodes: Person[];
  edges: PathEdge[];
}

export interface PathResult {
  path: string[];
  score: number;
  explanation: string;
  rank: number;
}

export interface NetworkGraphProps {
  /** All paths to display */
  paths?: NetworkPath[];
  /** Currently displayed path (for single path view) */
  path?: NetworkPath | null;
  /** Available path results for selection */
  pathResults?: PathResult[];
  /** Callback when a path is selected */
  onPathSelect?: (path: string[]) => void;
}

export function NetworkGraph({
  path,
  paths,
  pathResults,
  onPathSelect,
}: NetworkGraphProps) {
  const { selectedPath, setSelectedPath, clearSelectedPath } = useGraphStore();

  // Build nodes and edges from the path
  const { nodes: rawNodes, edges: rawEdges } = useMemo(() => {
    if (!path) return { nodes: [], edges: [] };

    const nodes: Node[] = path.nodes.map((person, index) => ({
      id: person.id,
      type: 'person',
      position: { x: index * 300, y: 200 },
      data: {
        name: person.names[0],
        title: person.title,
        isTarget: index === path.nodes.length - 1,
        isSource: index === 0,
      },
    }));

    const edges: Edge[] = path.edges.map((edge) => ({
      id: edge.id,
      source: edge.fromPersonId,
      target: edge.toPersonId,
      label: `${Math.round(edge.strength * 100)}%`,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: {
        strokeWidth: 2 + edge.strength * 3,
        stroke: edge.strength >= 0.7 ? '#10b981' : '#f59e0b',
      },
      labelStyle: {
        fill: '#6b7280',
        fontWeight: 500,
        fontSize: 12,
      },
      labelBgStyle: {
        fill: '#ffffff',
        fillOpacity: 0.8,
      },
    }));

    return { nodes, edges };
  }, [path]);

  // Apply highlighting based on selected path
  const nodes = useMemo(() => {
    if (!selectedPath || selectedPath.length === 0) return rawNodes;
    return applyNodeHighlight(rawNodes, selectedPath);
  }, [rawNodes, selectedPath]);

  const edges = useMemo(() => {
    if (!selectedPath || selectedPath.length === 0) return rawEdges;
    return applyEdgeHighlight(rawEdges, selectedPath);
  }, [rawEdges, selectedPath]);

  // Handle node click
  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      // If clicking a node that's in a path result, select that path
      if (pathResults) {
        const matchingPath = pathResults.find((pr) => pr.path.includes(node.id));
        if (matchingPath) {
          setSelectedPath(matchingPath.path);
          onPathSelect?.(matchingPath.path);
        }
      }
    },
    [pathResults, setSelectedPath, onPathSelect]
  );

  // Handle background click to clear selection
  const onPaneClick = useCallback(() => {
    clearSelectedPath();
  }, [clearSelectedPath]);

  if (!path) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">No path selected</div>
          <div className="text-sm">
            Search for a person to see introduction paths
          </div>
        </div>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      fitView
      minZoom={0.5}
      maxZoom={1.5}
      defaultEdgeOptions={{
        type: 'smoothstep',
      }}
    >
      <Background variant={BackgroundVariant.Dots} />
      <Controls />
    </ReactFlow>
  );
}

export default NetworkGraph;
