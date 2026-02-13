/**
 * Frequency Score Calculation Tests
 *
 * Tests the logarithmic frequency scoring based on interaction rate.
 */

import { describe, it, expect } from 'vitest';
import { calculateFrequency } from './frequency';

describe('calculateFrequency', () => {
  it('should return 0 when count is 0', () => {
    expect(calculateFrequency(0, 30)).toBe(0);
    expect(calculateFrequency(0, 90)).toBe(0);
    expect(calculateFrequency(0, 365)).toBe(0);
  });

  it('should return 0 when timeSpanDays is 0', () => {
    expect(calculateFrequency(1, 0)).toBe(0);
    expect(calculateFrequency(10, 0)).toBe(0);
  });

  it('should return ~0.15 for 1 interaction in 30 days (1/month)', () => {
    const score = calculateFrequency(1, 30);
    // log10(2) / 2 ≈ 0.15
    expect(score).toBeGreaterThan(0.12);
    expect(score).toBeLessThan(0.18);
  });

  it('should return ~0.35 for 4 interactions in 30 days (4/month)', () => {
    const score = calculateFrequency(4, 30);
    // log10(5) / 2 ≈ 0.35
    expect(score).toBeGreaterThan(0.32);
    expect(score).toBeLessThan(0.38);
  });

  it('should return ~0.74 for 30 interactions in 30 days (30/month)', () => {
    const score = calculateFrequency(30, 30);
    // log10(31) / 2 ≈ 0.74
    expect(score).toBeGreaterThan(0.71);
    expect(score).toBeLessThan(0.77);
  });

  it('should return ~1.0 for 100 interactions in 30 days (100/month)', () => {
    const score = calculateFrequency(100, 30);
    // log10(101) / 2 ≈ 1.0
    expect(score).toBeGreaterThan(0.98);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('should always return a value >= 0', () => {
    expect(calculateFrequency(0, 30)).toBeGreaterThanOrEqual(0);
    expect(calculateFrequency(1, 365)).toBeGreaterThanOrEqual(0);
  });

  it('should always return a value <= 1', () => {
    // Even with very high frequency
    expect(calculateFrequency(1000, 30)).toBeLessThanOrEqual(1);
    expect(calculateFrequency(10000, 30)).toBeLessThanOrEqual(1);
  });

  it('should throw error when count is negative', () => {
    expect(() => calculateFrequency(-1, 30)).toThrow('count must be non-negative');
    expect(() => calculateFrequency(-10, 30)).toThrow('count must be non-negative');
  });

  it('should throw error when timeSpanDays is negative', () => {
    expect(() => calculateFrequency(10, -1)).toThrow('timeSpanDays must be non-negative');
    expect(() => calculateFrequency(10, -30)).toThrow('timeSpanDays must be non-negative');
  });
});
