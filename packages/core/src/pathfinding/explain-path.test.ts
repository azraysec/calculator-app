/**
 * Path Explainer Tests
 *
 * Tests the path explanation generation.
 */

import { describe, it, expect } from 'vitest';
import { explainPath } from './explain-path';
import type { RankedPath } from './types';

/**
 * Helper to create a ranked path
 */
function createRankedPath(nodeIds: string[], score: number): RankedPath {
  return {
    nodeIds,
    edges: [],
    score,
    rank: 1,
    explanation: '',
  };
}

describe('explainPath', () => {
  const nodeNames = new Map<string, string>([
    ['me', 'You'],
    ['alice', 'Alice Smith'],
    ['bob', 'Bob Jones'],
    ['charlie', 'Charlie Brown'],
    ['target', 'Dave Wilson'],
  ]);

  it('should include all person names in explanation', () => {
    const path = createRankedPath(['me', 'alice', 'target'], 0.7);
    const explanation = explainPath(path, nodeNames);

    expect(explanation).toContain('Alice Smith');
    expect(explanation).toContain('Dave Wilson');
  });

  it('should include strength description (strong/moderate/weak)', () => {
    const strongPath = createRankedPath(['me', 'alice', 'target'], 0.9);
    const moderatePath = createRankedPath(['me', 'alice', 'target'], 0.6);
    const weakPath = createRankedPath(['me', 'alice', 'target'], 0.3);

    const strongExplanation = explainPath(strongPath, nodeNames);
    const moderateExplanation = explainPath(moderatePath, nodeNames);
    const weakExplanation = explainPath(weakPath, nodeNames);

    expect(strongExplanation).toContain('strong');
    expect(moderateExplanation).toContain('moderate');
    expect(weakExplanation).toContain('weak');
  });

  it('should be human-readable sentence', () => {
    const path = createRankedPath(['me', 'alice', 'target'], 0.7);
    const explanation = explainPath(path, nodeNames);

    // Should be a proper sentence with expected components
    expect(explanation).toMatch(/Connect through .+ to reach .+/);
  });

  it('should handle direct connection (no intermediary)', () => {
    const path = createRankedPath(['me', 'target'], 0.9);
    const explanation = explainPath(path, nodeNames);

    expect(explanation).toContain('Direct');
    expect(explanation).toContain('Dave Wilson');
    expect(explanation).not.toContain('through');
  });
});
