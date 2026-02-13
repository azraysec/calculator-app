/**
 * Score Calculator Service Tests
 *
 * Tests the complete scoring service that orchestrates all individual scorers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScoreCalculator, ScoringInput, ScoringResult } from './score-calculator';
import { DEFAULT_WEIGHTS, ScoringWeights } from './composite';

describe('ScoreCalculator', () => {
  const mockNow = new Date('2026-02-14T12:00:00.000Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should instantiate with default weights', () => {
    const calculator = new ScoreCalculator();
    expect(calculator).toBeInstanceOf(ScoreCalculator);
  });

  it('should instantiate with custom weights', () => {
    const customWeights: ScoringWeights = {
      recency: 0.4,
      frequency: 0.3,
      bidirectional: 0.2,
      channelDiversity: 0.1,
    };
    const calculator = new ScoreCalculator(customWeights);
    expect(calculator).toBeInstanceOf(ScoreCalculator);
  });

  it('should return a ScoringResult from calculate()', () => {
    const calculator = new ScoreCalculator();
    const input: ScoringInput = {
      interactions: [new Date('2026-02-10')],
      channels: ['email'],
      lastInteraction: new Date('2026-02-10'),
      firstInteraction: new Date('2026-02-01'),
    };

    const result = calculator.calculate(input);

    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('factors');
    expect(result).toHaveProperty('confidence');
  });

  it('should include all factor breakdowns in result', () => {
    const calculator = new ScoreCalculator();
    const input: ScoringInput = {
      interactions: [new Date('2026-02-10')],
      channels: ['email', 'linkedin'],
      lastInteraction: new Date('2026-02-10'),
      firstInteraction: new Date('2026-02-01'),
      sentCount: 5,
      receivedCount: 3,
    };

    const result = calculator.calculate(input);

    expect(result.factors).toHaveProperty('recency');
    expect(result.factors).toHaveProperty('frequency');
    expect(result.factors).toHaveProperty('bidirectional');
    expect(result.factors).toHaveProperty('channelDiversity');
  });

  it('should include overall score in result', () => {
    const calculator = new ScoreCalculator();
    const input: ScoringInput = {
      interactions: [new Date('2026-02-10')],
      channels: ['email'],
      lastInteraction: new Date('2026-02-10'),
      firstInteraction: new Date('2026-02-01'),
    };

    const result = calculator.calculate(input);

    expect(typeof result.score).toBe('number');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('should include confidence in result', () => {
    const calculator = new ScoreCalculator();
    const input: ScoringInput = {
      interactions: [new Date('2026-02-10')],
      channels: ['email'],
      lastInteraction: new Date('2026-02-10'),
      firstInteraction: new Date('2026-02-01'),
    };

    const result = calculator.calculate(input);

    expect(typeof result.confidence).toBe('number');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('should return score=0 and confidence=0 for empty input', () => {
    const calculator = new ScoreCalculator();
    const input: ScoringInput = {
      interactions: [],
      channels: [],
      lastInteraction: null,
      firstInteraction: null,
    };

    const result = calculator.calculate(input);

    expect(result.score).toBe(0);
    expect(result.confidence).toBe(0);
    expect(result.factors.recency).toBe(0);
    expect(result.factors.frequency).toBe(0);
    expect(result.factors.bidirectional).toBe(0);
    expect(result.factors.channelDiversity).toBe(0);
  });

  it('should return high confidence for complete input', () => {
    const calculator = new ScoreCalculator();
    // Generate 50 interactions over the past 30 days
    const interactions = Array.from({ length: 50 }, (_, i) =>
      new Date(mockNow - i * 24 * 60 * 60 * 1000)
    );

    const input: ScoringInput = {
      interactions,
      channels: ['email', 'linkedin', 'slack'],
      lastInteraction: new Date('2026-02-13'),
      firstInteraction: new Date('2026-01-15'),
      sentCount: 25,
      receivedCount: 25,
    };

    const result = calculator.calculate(input);

    // All 4 factors present + volume boost
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('should return medium confidence for partial input', () => {
    const calculator = new ScoreCalculator();
    const input: ScoringInput = {
      interactions: [new Date('2026-02-10')],
      channels: ['email'],
      lastInteraction: new Date('2026-02-10'),
      firstInteraction: new Date('2026-02-01'),
      // No sentCount/receivedCount
    };

    const result = calculator.calculate(input);

    // Has interaction, channel, and recent interaction, but no sent/received
    expect(result.confidence).toBeGreaterThan(0.4);
    expect(result.confidence).toBeLessThan(0.9);
  });

  it('should correctly integrate all factor calculations', () => {
    const calculator = new ScoreCalculator();

    // Create a scenario with known expected outcomes
    const input: ScoringInput = {
      interactions: Array.from({ length: 30 }, (_, i) =>
        new Date(mockNow - i * 24 * 60 * 60 * 1000)
      ),
      channels: ['email', 'linkedin', 'phone', 'slack'], // 4 channels = 1.0
      lastInteraction: new Date(mockNow - 1 * 24 * 60 * 60 * 1000), // 1 day ago ≈ 0.99
      firstInteraction: new Date(mockNow - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      sentCount: 15,
      receivedCount: 15, // Balanced = high bidirectional
    };

    const result = calculator.calculate(input);

    // Verify factors are calculated correctly
    expect(result.factors.recency).toBeGreaterThan(0.9); // Recent
    expect(result.factors.frequency).toBeGreaterThan(0.7); // 30 interactions / 30 days = 30/month
    expect(result.factors.bidirectional).toBeGreaterThan(0.9); // Balanced
    expect(result.factors.channelDiversity).toBe(1.0); // 4 channels

    // Overall score should be high
    expect(result.score).toBeGreaterThan(0.9);
  });
});
