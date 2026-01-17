/**
 * Rate limiting for action brokers
 */

export interface RateLimitConfig {
  maxPerMinute: number;
  maxPerHour: number;
}

export interface RateLimitState {
  minuteCount: number;
  hourCount: number;
  minuteReset: number; // timestamp
  hourReset: number; // timestamp
}

export class RateLimiter {
  private states: Map<string, RateLimitState> = new Map();

  constructor(private config: RateLimitConfig) {}

  /**
   * Check if action is allowed within rate limits
   */
  async checkLimit(key: string): Promise<{ allowed: boolean; reason?: string }> {
    const now = Date.now();
    let state = this.states.get(key);

    if (!state) {
      state = {
        minuteCount: 0,
        hourCount: 0,
        minuteReset: now + 60 * 1000,
        hourReset: now + 60 * 60 * 1000,
      };
      this.states.set(key, state);
    }

    // Reset minute counter if expired
    if (now >= state.minuteReset) {
      state.minuteCount = 0;
      state.minuteReset = now + 60 * 1000;
    }

    // Reset hour counter if expired
    if (now >= state.hourReset) {
      state.hourCount = 0;
      state.hourReset = now + 60 * 60 * 1000;
    }

    // Check minute limit
    if (state.minuteCount >= this.config.maxPerMinute) {
      const resetIn = Math.ceil((state.minuteReset - now) / 1000);
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${this.config.maxPerMinute}/minute. Reset in ${resetIn}s`,
      };
    }

    // Check hour limit
    if (state.hourCount >= this.config.maxPerHour) {
      const resetIn = Math.ceil((state.hourReset - now) / 60000);
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${this.config.maxPerHour}/hour. Reset in ${resetIn}m`,
      };
    }

    return { allowed: true };
  }

  /**
   * Record an action (call after successful execution)
   */
  async recordAction(key: string): Promise<void> {
    const state = this.states.get(key);
    if (state) {
      state.minuteCount++;
      state.hourCount++;
    }
  }

  /**
   * Get current rate limit status
   */
  getStatus(key: string): {
    minuteRemaining: number;
    hourRemaining: number;
  } {
    const state = this.states.get(key);
    if (!state) {
      return {
        minuteRemaining: this.config.maxPerMinute,
        hourRemaining: this.config.maxPerHour,
      };
    }

    const now = Date.now();

    // Reset if expired
    const minuteCount = now >= state.minuteReset ? 0 : state.minuteCount;
    const hourCount = now >= state.hourReset ? 0 : state.hourCount;

    return {
      minuteRemaining: Math.max(0, this.config.maxPerMinute - minuteCount),
      hourRemaining: Math.max(0, this.config.maxPerHour - hourCount),
    };
  }

  /**
   * Clear rate limit state for a key
   */
  reset(key: string): void {
    this.states.delete(key);
  }

  /**
   * Clear all rate limit state
   */
  resetAll(): void {
    this.states.clear();
  }
}
