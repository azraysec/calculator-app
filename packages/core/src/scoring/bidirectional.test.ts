/**
 * Bidirectional Score Calculation Tests
 *
 * Tests the balance scoring based on sent/received message counts.
 */

import { describe, it, expect } from 'vitest';
import { calculateBidirectional } from './bidirectional';

describe('calculateBidirectional', () => {
  it('should return 0 when both sent and received are 0', () => {
    expect(calculateBidirectional(0, 0)).toBe(0);
  });

  it('should return < 0.3 when sent=10, received=0 (one-way outbound)', () => {
    const score = calculateBidirectional(10, 0);
    expect(score).toBeLessThan(0.3);
    expect(score).toBeGreaterThan(0);
  });

  it('should return < 0.3 when sent=0, received=10 (one-way inbound)', () => {
    const score = calculateBidirectional(0, 10);
    expect(score).toBeLessThan(0.3);
    expect(score).toBeGreaterThan(0);
  });

  it('should return > 0.9 when sent=10, received=10 (balanced)', () => {
    const score = calculateBidirectional(10, 10);
    expect(score).toBeGreaterThan(0.9);
  });

  it('should return ~0.5-0.7 when sent=10, received=5 (2:1 ratio)', () => {
    const score = calculateBidirectional(10, 5);
    // ratio = 5/10 = 0.5
    expect(score).toBeGreaterThanOrEqual(0.5);
    expect(score).toBeLessThanOrEqual(0.7);
  });

  it('should return > 0.9 when sent=100, received=100 (high volume balanced)', () => {
    const score = calculateBidirectional(100, 100);
    expect(score).toBeGreaterThan(0.9);
  });

  it('should always return a value >= 0', () => {
    expect(calculateBidirectional(0, 0)).toBeGreaterThanOrEqual(0);
    expect(calculateBidirectional(1, 0)).toBeGreaterThanOrEqual(0);
    expect(calculateBidirectional(0, 1)).toBeGreaterThanOrEqual(0);
    expect(calculateBidirectional(100, 1)).toBeGreaterThanOrEqual(0);
  });

  it('should always return a value <= 1', () => {
    expect(calculateBidirectional(100, 100)).toBeLessThanOrEqual(1);
    expect(calculateBidirectional(1000, 1000)).toBeLessThanOrEqual(1);
    expect(calculateBidirectional(10000, 10000)).toBeLessThanOrEqual(1);
  });

  it('should throw error when sent is negative', () => {
    expect(() => calculateBidirectional(-1, 10)).toThrow('sent must be non-negative');
    expect(() => calculateBidirectional(-10, 10)).toThrow('sent must be non-negative');
  });

  it('should throw error when received is negative', () => {
    expect(() => calculateBidirectional(10, -1)).toThrow('received must be non-negative');
    expect(() => calculateBidirectional(10, -10)).toThrow('received must be non-negative');
  });
});
