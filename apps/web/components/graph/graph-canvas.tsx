'use client';

/**
 * GraphCanvas - React Flow visualization of introduction paths
 */

import { useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MarkerType,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { PersonNode } from './person-node';

const nodeTypes = {
  person: PersonNode,
};

interface Person {
  id: string;
  names: string[];
  title?: string;
}

interface PathEdge {
  id: string;
  strength: number;
  fromPersonId: string;
  toPersonId: string;
}

interface Path {
  nodes: Person[];
  edges: PathEdge[];
}

interface GraphCanvasProps {
  path: Path | null;
}

export function GraphCanvas({ path }: GraphCanvasProps) {
  const { nodes, edges } = useMemo(() => {
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
