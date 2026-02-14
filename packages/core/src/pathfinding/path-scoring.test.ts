/**
 * Path Scoring Tests
 *
 * Tests the path scoring algorithm with edge multiplication and hop penalties.
 */

import { describe, it, expect } from 'vitest';
import { scorePath, DEFAULT_EDGE_SCORE, HOP_PENALTY } from './path-scoring';
import type { Path, Edge } from './types';

/**
 * Helper to create a path
 */
function createPath(nodeIds: string[], edgeScores: number[]): Path {
  const edges: Edge[] = [];
  for (let i = 0; i < nodeIds.length - 1; i++) {
    edges.push({
      fromId: nodeIds[i],
      toId: nodeIds[i + 1],
      score: edgeScores[i],
    });
  }
  return { nodeIds, edges };
}

describe('scorePath', () => {
  it('should use edge score for single-edge path', () => {
    const path = createPath(['A', 'B'], [0.8]);
    const score = scorePath(path);

    // Single hop, no penalty: 0.8 * 0.9^0 = 0.8
    expect(score).toBeCloseTo(0.8, 5);
  });

  it('should multiply edge scores for two-edge path', () => {
    const path = createPath(['A', 'B', 'C'], [0.8, 0.6]);
    const score = scorePath(path);

    // 0.8 * 0.6 * 0.9^1 = 0.48 * 0.9 = 0.432
    expect(score).toBeCloseTo(0.8 * 0.6 * HOP_PENALTY, 5);
  });

  it('should multiply all edge scores for three-edge path', () => {
    const path = createPath(['A', 'B', 'C', 'D'], [0.9, 0.8, 0.7]);
    const score = scorePath(path);

    // 0.9 * 0.8 * 0.7 * 0.9^2 = 0.504 * 0.81 = 0.40824
    const expected = 0.9 * 0.8 * 0.7 * Math.pow(HOP_PENALTY, 2);
    expect(score).toBeCloseTo(expected, 5);
  });

  it('should score shorter path higher than longer path (same edge scores)', () => {
    const shortPath = createPath(['A', 'B'], [1.0]);
    const longPath = createPath(['A', 'B', 'C'], [1.0, 1.0]);

    const shortScore = scorePath(shortPath);
    const longScore = scorePath(longPath);

    expect(shortScore).toBeGreaterThan(longScore);
  });

  it('should use default score (0.5) for missing edge', () => {
    const path: Path = {
      nodeIds: ['A', 'B'],
      edges: [{ fromId: 'A', toId: 'B', score: undefined as any }],
    };

    const edgeScores = new Map<string, number>();
    // Don't provide override, edge.score is undefined
    const score = scorePath(path, edgeScores);

    // Should use DEFAULT_EDGE_SCORE
    expect(score).toBeCloseTo(DEFAULT_EDGE_SCORE, 5);
  });

  it('should apply hop penalty (all 1.0 edges still < 1.0 for multi-hop)', () => {
    const path = createPath(['A', 'B', 'C'], [1.0, 1.0]);
    const score = scorePath(path);

    // 1.0 * 1.0 * 0.9 = 0.9 < 1.0
    expect(score).toBeLessThan(1.0);
    expect(score).toBeCloseTo(HOP_PENALTY, 5);
  });

  it('should always return a value >= 0', () => {
    const path = createPath(['A', 'B', 'C', 'D', 'E'], [0.1, 0.1, 0.1, 0.1]);
    const score = scorePath(path);

    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('should always return a value <= 1', () => {
    const path = createPath(['A', 'B'], [1.0]);
    const score = scorePath(path);

    expect(score).toBeLessThanOrEqual(1);
  });
});
