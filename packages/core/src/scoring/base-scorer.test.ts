/**
 * Unit tests for relationship strength scoring logic
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_WEIGHTS,
  calculateStrength,
  calculateRecencyFactor,
  calculateFrequencyFactor,
  calculateMutualityFactor,
  calculateChannelsFactor,
  calculateStrengthFactors,
} from './base-scorer';

describe('DEFAULT_WEIGHTS', () => {
  it('should sum to 1.0', () => {
    const sum =
      DEFAULT_WEIGHTS.recency +
      DEFAULT_WEIGHTS.frequency +
      DEFAULT_WEIGHTS.mutuality +
      DEFAULT_WEIGHTS.channels;
    expect(sum).toBeCloseTo(1.0, 10);
  });
});

describe('calculateStrength', () => {
  it('should return 0 for all zero factors', () => {
    const factors = { recency: 0, frequency: 0, mutuality: 0, channels: 0 };
    expect(calculateStrength(factors)).toBe(0);
  });

  it('should return 1 for all max factors', () => {
    const factors = { recency: 1, frequency: 1, mutuality: 1, channels: 1 };
    expect(calculateStrength(factors)).toBeCloseTo(1, 10);
  });

  it('should return weighted average with default weights', () => {
    const factors = { recency: 1, frequency: 0, mutuality: 0, channels: 0 };
    expect(calculateStrength(factors)).toBe(DEFAULT_WEIGHTS.recency);
  });

  it('should use custom weights when provided', () => {
    const factors = { recency: 1, frequency: 0, mutuality: 0, channels: 0 };
    const customWeights = { recency: 0.5, frequency: 0.2, mutuality: 0.2, channels: 0.1 };
    expect(calculateStrength(factors, customWeights)).toBe(0.5);
  });

  it('should clamp values above 1', () => {
    const factors = { recency: 2, frequency: 2, mutuality: 2, channels: 2 };
    expect(calculateStrength(factors)).toBe(1);
  });

  it('should clamp negative values to 0', () => {
    const factors = { recency: -1, frequency: -1, mutuality: -1, channels: -1 };
    expect(calculateStrength(factors)).toBe(0);
  });
});

describe('calculateRecencyFactor', () => {
  it('should return ~1 for today', () => {
    const today = new Date();
    const factor = calculateRecencyFactor(today);
    expect(factor).toBeCloseTo(1, 1);
  });

  it('should return ~0.5 for 90 days ago (half-life)', () => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const factor = calculateRecencyFactor(ninetyDaysAgo);
    expect(factor).toBeCloseTo(0.5, 1);
  });

  it('should return ~0.25 for 180 days ago (two half-lives)', () => {
    const oneEightyDaysAgo = new Date();
    oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180);
    const factor = calculateRecencyFactor(oneEightyDaysAgo);
    expect(factor).toBeCloseTo(0.25, 1);
  });

  it('should return very low value for year-old interactions', () => {
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    const factor = calculateRecencyFactor(yearAgo);
    expect(factor).toBeLessThan(0.1);
  });

  it('should decay monotonically', () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(today.getDate() - 60);

    const todayFactor = calculateRecencyFactor(today);
    const thirtyFactor = calculateRecencyFactor(thirtyDaysAgo);
    const sixtyFactor = calculateRecencyFactor(sixtyDaysAgo);

    expect(todayFactor).toBeGreaterThan(thirtyFactor);
    expect(thirtyFactor).toBeGreaterThan(sixtyFactor);
  });
});

describe('calculateFrequencyFactor', () => {
  it('should return 0 for no interactions', () => {
    const today = new Date();
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    expect(calculateFrequencyFactor(0, monthAgo, today)).toBe(0);
  });

  it('should return 0.5 for interactions on same day', () => {
    const today = new Date();
    expect(calculateFrequencyFactor(5, today, today)).toBe(0.5);
  });

  it('should return ~0.3 for 1 interaction per month', () => {
    const today = new Date();
    const monthAgo = new Date();
    monthAgo.setDate(today.getDate() - 30);
    const factor = calculateFrequencyFactor(1, monthAgo, today);
    expect(factor).toBeCloseTo(0.3, 1);
  });

  it('should return higher value for more frequent interactions', () => {
    const today = new Date();
    const monthAgo = new Date();
    monthAgo.setDate(today.getDate() - 30);

    const lowFreq = calculateFrequencyFactor(1, monthAgo, today);
    const highFreq = calculateFrequencyFactor(10, monthAgo, today);

    expect(highFreq).toBeGreaterThan(lowFreq);
  });

  it('should cap at 1.0', () => {
    const today = new Date();
    const monthAgo = new Date();
    monthAgo.setDate(today.getDate() - 30);

    const factor = calculateFrequencyFactor(1000, monthAgo, today);
    expect(factor).toBeLessThanOrEqual(1);
  });
});

describe('calculateMutualityFactor', () => {
  it('should return 0 for no interactions', () => {
    expect(calculateMutualityFactor(0, 0)).toBe(0);
  });

  it('should return 0.3 for one-way outbound only', () => {
    expect(calculateMutualityFactor(10, 0)).toBe(0.3);
  });

  it('should return 0.3 for one-way inbound only', () => {
    expect(calculateMutualityFactor(0, 10)).toBe(0.3);
  });

  it('should return 1.0 for perfectly balanced communication', () => {
    expect(calculateMutualityFactor(10, 10)).toBe(1);
  });

  it('should return ~0.67 for 2:1 ratio', () => {
    // min(10, 5) / 15 * 2 = 5/15 * 2 = 0.667
    expect(calculateMutualityFactor(10, 5)).toBeCloseTo(0.67, 1);
  });

  it('should be symmetric', () => {
    expect(calculateMutualityFactor(10, 5)).toBe(calculateMutualityFactor(5, 10));
  });
});

describe('calculateChannelsFactor', () => {
  it('should return 0 for no channels', () => {
    expect(calculateChannelsFactor([])).toBe(0);
  });

  it('should return 0.4 for single channel', () => {
    expect(calculateChannelsFactor(['email'])).toBe(0.4);
  });

  it('should return 0.7 for two channels', () => {
    expect(calculateChannelsFactor(['email', 'phone'])).toBe(0.7);
  });

  it('should return 1.0 for three or more channels', () => {
    expect(calculateChannelsFactor(['email', 'phone', 'meeting'])).toBe(1);
    expect(calculateChannelsFactor(['email', 'phone', 'meeting', 'slack'])).toBe(1);
  });

  it('should deduplicate channels', () => {
    expect(calculateChannelsFactor(['email', 'email', 'email'])).toBe(0.4);
  });
});

describe('calculateStrengthFactors', () => {
  it('should calculate all factors together', () => {
    const now = new Date();
    const monthAgo = new Date();
    monthAgo.setMonth(now.getMonth() - 1);

    const factors = calculateStrengthFactors({
      firstSeenAt: monthAgo,
      lastSeenAt: now,
      interactionCount: 10,
      sentCount: 5,
      receivedCount: 5,
      channels: ['email', 'meeting'],
    });

    expect(factors.recency).toBeGreaterThan(0.9); // Recent
    expect(factors.frequency).toBeGreaterThan(0); // Some interactions
    expect(factors.mutuality).toBe(1); // Balanced
    expect(factors.channels).toBe(0.7); // Two channels
  });

  it('should handle edge case with recent single interaction', () => {
    const now = new Date();

    const factors = calculateStrengthFactors({
      firstSeenAt: now,
      lastSeenAt: now,
      interactionCount: 1,
      sentCount: 1,
      receivedCount: 0,
      channels: ['email'],
    });

    expect(factors.recency).toBeCloseTo(1, 1);
    expect(factors.frequency).toBe(0.5); // Same day
    expect(factors.mutuality).toBe(0.3); // One-way
    expect(factors.channels).toBe(0.4); // Single channel
  });
});
