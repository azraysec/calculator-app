/**
 * Channel Diversity Score Calculation Tests
 *
 * Tests the diversity scoring based on communication channels used.
 */

import { describe, it, expect } from 'vitest';
import { calculateChannelDiversity } from './channel-diversity';

describe('calculateChannelDiversity', () => {
  it('should return 0 when channels array is empty', () => {
    expect(calculateChannelDiversity([])).toBe(0);
  });

  it('should return 0.25 for ["email"] (1 channel)', () => {
    expect(calculateChannelDiversity(['email'])).toBe(0.25);
  });

  it('should return 0.5 for ["email", "linkedin"] (2 channels)', () => {
    expect(calculateChannelDiversity(['email', 'linkedin'])).toBe(0.5);
  });

  it('should return 0.75 for ["email", "linkedin", "phone"] (3 channels)', () => {
    expect(calculateChannelDiversity(['email', 'linkedin', 'phone'])).toBe(0.75);
  });

  it('should return 1.0 for ["email", "linkedin", "phone", "slack"] (4 channels)', () => {
    expect(calculateChannelDiversity(['email', 'linkedin', 'phone', 'slack'])).toBe(1.0);
  });

  it('should return 1.0 for 5+ channels (capped)', () => {
    expect(calculateChannelDiversity(['email', 'linkedin', 'phone', 'slack', 'zoom'])).toBe(1.0);
    expect(calculateChannelDiversity(['a', 'b', 'c', 'd', 'e', 'f'])).toBe(1.0);
  });

  it('should deduplicate channels: ["email", "email"] = 1 channel', () => {
    expect(calculateChannelDiversity(['email', 'email'])).toBe(0.25);
    expect(calculateChannelDiversity(['email', 'email', 'email'])).toBe(0.25);
  });

  it('should be case insensitive: ["Email", "EMAIL"] = 1 channel', () => {
    expect(calculateChannelDiversity(['Email', 'EMAIL'])).toBe(0.25);
    expect(calculateChannelDiversity(['Email', 'email', 'EMAIL'])).toBe(0.25);
    expect(calculateChannelDiversity(['LinkedIn', 'LINKEDIN', 'linkedIn'])).toBe(0.25);
  });

  it('should always return a value >= 0', () => {
    expect(calculateChannelDiversity([])).toBeGreaterThanOrEqual(0);
  });

  it('should always return a value <= 1', () => {
    expect(calculateChannelDiversity(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'])).toBeLessThanOrEqual(1);
  });
});
