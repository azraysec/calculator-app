/**
 * Pathfinding Module Index Tests
 *
 * Tests that all pathfinding exports are available.
 */

import { describe, it, expect } from 'vitest';
import * as pathfinding from './index';

describe('Pathfinding Module Exports', () => {
  it('should export Pathfinder class', () => {
    expect(pathfinding.Pathfinder).toBeDefined();
    expect(typeof pathfinding.Pathfinder).toBe('function');
  });

  it('should export MAX_HOPS constant with value 3', () => {
    expect(pathfinding.MAX_HOPS).toBe(3);
  });

  it('should export MAX_PATHS constant with value 5', () => {
    expect(pathfinding.MAX_PATHS).toBe(5);
  });

  it('should export all utility functions', () => {
    expect(pathfinding.buildGraph).toBeTypeOf('function');
    expect(pathfinding.findAllPaths).toBeTypeOf('function');
    expect(pathfinding.scorePath).toBeTypeOf('function');
    expect(pathfinding.scorePaths).toBeTypeOf('function');
    expect(pathfinding.rankPaths).toBeTypeOf('function');
    expect(pathfinding.explainPath).toBeTypeOf('function');
    expect(pathfinding.explainPaths).toBeTypeOf('function');
  });
});
