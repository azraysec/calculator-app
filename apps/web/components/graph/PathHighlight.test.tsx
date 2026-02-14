/**
 * PathHighlight Tests
 */

import { describe, it, expect } from 'vitest';
import type { Node, Edge } from 'reactflow';
import {
  PathHighlight,
  applyNodeHighlight,
  applyEdgeHighlight,
} from './PathHighlight';

describe('PathHighlight', () => {
  it('should render without crashing', () => {
    // PathHighlight returns null, so it renders without crashing
    const result = PathHighlight({ pathNodeIds: ['a', 'b', 'c'] });
    expect(result).toBeNull();
  });

  it('should apply highlight styles to specified nodes', () => {
    const nodes: Node[] = [
      { id: 'a', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', position: { x: 100, y: 0 }, data: {} },
      { id: 'c', position: { x: 200, y: 0 }, data: {} },
      { id: 'd', position: { x: 300, y: 0 }, data: {} },
    ];

    const pathNodeIds = ['a', 'b', 'c'];
    const result = applyNodeHighlight(nodes, pathNodeIds);

    // Nodes in path should have highlight styles
    expect(result[0].style).toMatchObject({
      borderColor: '#3b82f6',
      zIndex: 10,
    });
    expect(result[1].style).toMatchObject({
      borderColor: '#3b82f6',
      zIndex: 10,
    });
    expect(result[2].style).toMatchObject({
      borderColor: '#3b82f6',
      zIndex: 10,
    });

    // Node not in path should have dimmed styles
    expect(result[3].style).toMatchObject({
      opacity: 0.4,
    });
  });

  it('should apply highlight styles to edges between nodes', () => {
    const edges: Edge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
      { id: 'e3', source: 'c', target: 'd' },
      { id: 'e4', source: 'x', target: 'y' },
    ];

    const pathNodeIds = ['a', 'b', 'c'];
    const result = applyEdgeHighlight(edges, pathNodeIds);

    // Edges in path should have highlight styles
    expect(result[0].style).toMatchObject({
      strokeWidth: 4,
      stroke: '#3b82f6',
    });
    expect(result[0].animated).toBe(true);

    expect(result[1].style).toMatchObject({
      strokeWidth: 4,
      stroke: '#3b82f6',
    });
    expect(result[1].animated).toBe(true);

    // Edge between path end and non-path node should be dimmed
    expect(result[2].style).toMatchObject({
      opacity: 0.2,
    });

    // Edge completely outside path should be dimmed
    expect(result[3].style).toMatchObject({
      opacity: 0.2,
    });
    expect(result[3].animated).toBe(false);
  });

  it('should handle empty pathNodeIds array', () => {
    const nodes: Node[] = [
      { id: 'a', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', position: { x: 100, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [{ id: 'e1', source: 'a', target: 'b' }];

    const emptyPath: string[] = [];

    // Should return nodes unchanged
    const nodeResult = applyNodeHighlight(nodes, emptyPath);
    expect(nodeResult).toEqual(nodes);

    // Should return edges unchanged
    const edgeResult = applyEdgeHighlight(edges, emptyPath);
    expect(edgeResult).toEqual(edges);
  });
});

