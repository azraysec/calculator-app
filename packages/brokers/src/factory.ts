/**
 * Broker factory for creating and managing action brokers
 */

import type { BrokerFactory, BrokerConfig, ActionBroker } from '@wig/shared-types';
import { ManualBroker } from './manual-broker';
import { RateLimiter } from './rate-limiter';

export class BrokerFactoryImpl implements BrokerFactory {
  private brokers: Map<string, ActionBroker> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();

  async create(config: BrokerConfig): Promise<ActionBroker> {
    // Check if already created
    const cacheKey = `${config.channel}-${config.options?.draftOnly ? 'draft' : 'send'}`;
    const existing = this.brokers.get(cacheKey);
    if (existing) return existing;

    // Create rate limiter if needed
    if (config.options?.rateLimit) {
      this.rateLimiters.set(
        cacheKey,
        new RateLimiter({
          maxPerMinute: config.options.rateLimit.maxPerMinute,
          maxPerHour: config.options.rateLimit.maxPerHour,
        })
      );
    }

    // Create based on channel
    let broker: ActionBroker;

    switch (config.channel) {
      case 'manual':
        broker = new ManualBroker();
        break;

      // TODO: Add email broker
      // case 'email':
      //   broker = new EmailBroker(config);
      //   break;

      // TODO: Add HubSpot broker
      // case 'hubspot':
      //   broker = new HubSpotBroker(config);
      //   break;

      default:
        throw new Error(`Unsupported broker channel: ${config.channel}`);
    }

    // Validate connection
    const validation = await broker.validateConnection();
    if (!validation.valid) {
      throw new Error(`Failed to validate ${config.channel}: ${validation.error}`);
    }

    this.brokers.set(cacheKey, broker);
    return broker;
  }

  supports(channel: string): boolean {
    return ['manual'].includes(channel);
    // TODO: Add more as implemented
    // return ['manual', 'email', 'hubspot', 'linkedin'].includes(channel);
  }

  /**
   * Get an already-created broker
   */
  get(channel: string): ActionBroker | undefined {
    return this.brokers.get(channel);
  }

  /**
   * Get rate limiter for a broker
   */
  getRateLimiter(channel: string): RateLimiter | undefined {
    return this.rateLimiters.get(channel);
  }

  /**
   * Remove a broker from the cache
   */
  remove(channel: string): boolean {
    this.rateLimiters.delete(channel);
    return this.brokers.delete(channel);
  }

  /**
   * Clear all brokers
   */
  clear(): void {
    this.rateLimiters.clear();
    this.brokers.clear();
  }
}
