/**
 * Scoring Module Index Tests
 *
 * Tests that all scoring functions, classes, and constants are properly exported.
 */

import { describe, it, expect } from 'vitest';
import * as scoring from './index';

describe('Scoring Module Exports', () => {
  it('should export calculateRecency function', () => {
    expect(scoring.calculateRecency).toBeTypeOf('function');
  });

  it('should export calculateFrequency function', () => {
    expect(scoring.calculateFrequency).toBeTypeOf('function');
  });

  it('should export calculateBidirectional function', () => {
    expect(scoring.calculateBidirectional).toBeTypeOf('function');
  });

  it('should export calculateChannelDiversity function', () => {
    expect(scoring.calculateChannelDiversity).toBeTypeOf('function');
  });

  it('should export calculateComposite function', () => {
    expect(scoring.calculateComposite).toBeTypeOf('function');
  });

  it('should export ScoreCalculator class', () => {
    expect(scoring.ScoreCalculator).toBeTypeOf('function');
    const instance = new scoring.ScoreCalculator();
    expect(instance).toBeInstanceOf(scoring.ScoreCalculator);
  });

  it('should export DEFAULT_WEIGHTS constant', () => {
    expect(scoring.DEFAULT_WEIGHTS).toBeDefined();
    expect(scoring.DEFAULT_WEIGHTS).toHaveProperty('recency');
    expect(scoring.DEFAULT_WEIGHTS).toHaveProperty('frequency');
    expect(scoring.DEFAULT_WEIGHTS).toHaveProperty('bidirectional');
    expect(scoring.DEFAULT_WEIGHTS).toHaveProperty('channelDiversity');
  });

  it('should have DEFAULT_WEIGHTS sum to 1.0', () => {
    const sum =
      scoring.DEFAULT_WEIGHTS.recency +
      scoring.DEFAULT_WEIGHTS.frequency +
      scoring.DEFAULT_WEIGHTS.bidirectional +
      scoring.DEFAULT_WEIGHTS.channelDiversity;
    expect(sum).toBeCloseTo(1.0, 5);
  });
});
