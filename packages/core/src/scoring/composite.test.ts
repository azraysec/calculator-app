/**
 * Composite Score Calculation Tests
 *
 * Tests the weighted combination of all scoring factors.
 */

import { describe, it, expect } from 'vitest';
import { calculateComposite, DEFAULT_WEIGHTS, ScoringFactors, ScoringWeights } from './composite';

describe('calculateComposite', () => {
  const allZeroFactors: ScoringFactors = {
    recency: 0,
    frequency: 0,
    bidirectional: 0,
    channelDiversity: 0,
  };

  const allOneFactors: ScoringFactors = {
    recency: 1,
    frequency: 1,
    bidirectional: 1,
    channelDiversity: 1,
  };

  it('should return 0 when all factors are 0', () => {
    expect(calculateComposite(allZeroFactors)).toBe(0);
  });

  it('should return 1 when all factors are 1', () => {
    expect(calculateComposite(allOneFactors)).toBe(1);
  });

  it('should have default weights that sum to 1.0', () => {
    const sum =
      DEFAULT_WEIGHTS.recency +
      DEFAULT_WEIGHTS.frequency +
      DEFAULT_WEIGHTS.bidirectional +
      DEFAULT_WEIGHTS.channelDiversity;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('should apply custom weights correctly', () => {
    const factors: ScoringFactors = {
      recency: 0.8,
      frequency: 0.6,
      bidirectional: 0.4,
      channelDiversity: 0.2,
    };

    const customWeights: ScoringWeights = {
      recency: 0.4,
      frequency: 0.3,
      bidirectional: 0.2,
      channelDiversity: 0.1,
    };

    // Expected: 0.8*0.4 + 0.6*0.3 + 0.4*0.2 + 0.2*0.1 = 0.32 + 0.18 + 0.08 + 0.02 = 0.6
    const score = calculateComposite(factors, customWeights);
    expect(score).toBeCloseTo(0.6, 5);
  });

  it('should throw error when weights do not sum to 1.0', () => {
    const badWeights: ScoringWeights = {
      recency: 0.5,
      frequency: 0.5,
      bidirectional: 0.5,
      channelDiversity: 0.5, // Sum = 2.0
    };

    expect(() => calculateComposite(allOneFactors, badWeights)).toThrow(
      'Weights must sum to 1.0'
    );
  });

  it('should return 0.30 when only recency=1 (others=0)', () => {
    const factors: ScoringFactors = {
      recency: 1,
      frequency: 0,
      bidirectional: 0,
      channelDiversity: 0,
    };
    expect(calculateComposite(factors)).toBeCloseTo(0.3, 5);
  });

  it('should return 0.25 when only frequency=1 (others=0)', () => {
    const factors: ScoringFactors = {
      recency: 0,
      frequency: 1,
      bidirectional: 0,
      channelDiversity: 0,
    };
    expect(calculateComposite(factors)).toBeCloseTo(0.25, 5);
  });

  it('should return 0.25 when only bidirectional=1 (others=0)', () => {
    const factors: ScoringFactors = {
      recency: 0,
      frequency: 0,
      bidirectional: 1,
      channelDiversity: 0,
    };
    expect(calculateComposite(factors)).toBeCloseTo(0.25, 5);
  });

  it('should return 0.20 when only channelDiversity=1 (others=0)', () => {
    const factors: ScoringFactors = {
      recency: 0,
      frequency: 0,
      bidirectional: 0,
      channelDiversity: 1,
    };
    expect(calculateComposite(factors)).toBeCloseTo(0.2, 5);
  });

  it('should always return a value >= 0', () => {
    expect(calculateComposite(allZeroFactors)).toBeGreaterThanOrEqual(0);
  });

  it('should always return a value <= 1', () => {
    expect(calculateComposite(allOneFactors)).toBeLessThanOrEqual(1);
  });
});
