/**
 * Path Ranker Tests
 *
 * Tests the path ranking algorithm.
 */

import { describe, it, expect } from 'vitest';
import { rankPaths } from './path-ranker';
import type { ScoredPath } from './types';

/**
 * Helper to create a scored path
 */
function createScoredPath(id: string, score: number): ScoredPath {
  return {
    nodeIds: ['start', id, 'end'],
    edges: [],
    score,
  };
}

describe('rankPaths', () => {
  it('should sort paths by score descending', () => {
    const paths: ScoredPath[] = [
      createScoredPath('low', 0.3),
      createScoredPath('high', 0.9),
      createScoredPath('mid', 0.6),
    ];

    const ranked = rankPaths(paths);

    expect(ranked[0].score).toBe(0.9);
    expect(ranked[1].score).toBe(0.6);
    expect(ranked[2].score).toBe(0.3);
  });

  it('should respect maxPaths limit', () => {
    const paths: ScoredPath[] = [
      createScoredPath('a', 0.9),
      createScoredPath('b', 0.8),
      createScoredPath('c', 0.7),
      createScoredPath('d', 0.6),
      createScoredPath('e', 0.5),
    ];

    const ranked = rankPaths(paths, 3);

    expect(ranked.length).toBe(3);
    expect(ranked[0].score).toBe(0.9);
    expect(ranked[2].score).toBe(0.7);
  });

  it('should assign correct rank numbers (1, 2, 3...)', () => {
    const paths: ScoredPath[] = [
      createScoredPath('a', 0.7),
      createScoredPath('b', 0.9),
      createScoredPath('c', 0.5),
    ];

    const ranked = rankPaths(paths);

    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].rank).toBe(3);
  });

  it('should handle ties with stable sort', () => {
    const paths: ScoredPath[] = [
      createScoredPath('first', 0.5),
      createScoredPath('second', 0.5),
      createScoredPath('third', 0.5),
    ];

    const ranked = rankPaths(paths);

    // All have same score, order should be stable
    expect(ranked.length).toBe(3);
    expect(ranked[0].nodeIds[1]).toBe('first');
    expect(ranked[1].nodeIds[1]).toBe('second');
    expect(ranked[2].nodeIds[1]).toBe('third');
  });

  it('should return empty array for empty input', () => {
    const ranked = rankPaths([]);
    expect(ranked).toEqual([]);
  });
});
