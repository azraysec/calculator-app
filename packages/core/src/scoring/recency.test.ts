/**
 * Recency Score Calculation Tests
 *
 * Tests the exponential decay scoring based on last interaction date.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateRecency } from './recency';

describe('calculateRecency', () => {
  // Mock Date.now() for deterministic tests
  const mockNow = new Date('2026-02-14T12:00:00.000Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return 0 when lastInteraction is null', () => {
    expect(calculateRecency(null)).toBe(0);
  });

  it('should return > 0.99 when lastInteraction is today', () => {
    const today = new Date('2026-02-14T10:00:00.000Z');
    const score = calculateRecency(today);
    expect(score).toBeGreaterThan(0.99);
  });

  it('should return > 0.99 when lastInteraction is 1 day ago', () => {
    const yesterday = new Date('2026-02-13T12:00:00.000Z');
    const score = calculateRecency(yesterday);
    // e^(-1/180) ≈ 0.9944
    expect(score).toBeGreaterThan(0.99);
  });

  it('should return approximately 0.85 when lastInteraction is 30 days ago', () => {
    const thirtyDaysAgo = new Date('2026-01-15T12:00:00.000Z');
    const score = calculateRecency(thirtyDaysAgo);
    // e^(-30/180) ≈ 0.846
    expect(score).toBeGreaterThan(0.82);
    expect(score).toBeLessThan(0.88);
  });

  it('should return approximately 0.61 when lastInteraction is 90 days ago', () => {
    const ninetyDaysAgo = new Date('2025-11-16T12:00:00.000Z');
    const score = calculateRecency(ninetyDaysAgo);
    // e^(-90/180) ≈ 0.606
    expect(score).toBeGreaterThan(0.58);
    expect(score).toBeLessThan(0.65);
  });

  it('should return approximately 0.37 when lastInteraction is 180 days ago', () => {
    const halfYear = new Date('2025-08-18T12:00:00.000Z');
    const score = calculateRecency(halfYear);
    // e^(-180/180) = e^(-1) ≈ 0.368
    expect(score).toBeGreaterThan(0.34);
    expect(score).toBeLessThan(0.40);
  });

  it('should return approximately 0.13 when lastInteraction is 365 days ago', () => {
    const oneYearAgo = new Date('2025-02-14T12:00:00.000Z');
    const score = calculateRecency(oneYearAgo);
    // e^(-365/180) ≈ 0.131
    expect(score).toBeGreaterThan(0.10);
    expect(score).toBeLessThan(0.16);
  });

  it('should return < 0.02 when lastInteraction is 730 days ago', () => {
    const twoYearsAgo = new Date('2024-02-14T12:00:00.000Z');
    const score = calculateRecency(twoYearsAgo);
    // e^(-730/180) ≈ 0.017
    expect(score).toBeLessThan(0.02);
  });

  it('should always return a value >= 0', () => {
    // Test with very old date
    const veryOld = new Date('2000-01-01T00:00:00.000Z');
    const score = calculateRecency(veryOld);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('should always return a value <= 1', () => {
    // Test with today
    const today = new Date('2026-02-14T12:00:00.000Z');
    const score = calculateRecency(today);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('should return 1 when lastInteraction is in the future (clamp)', () => {
    const future = new Date('2026-03-01T12:00:00.000Z');
    const score = calculateRecency(future);
    expect(score).toBe(1);
  });
});
