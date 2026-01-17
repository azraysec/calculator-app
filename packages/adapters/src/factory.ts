/**
 * Adapter factory for creating and managing adapters
 */

import type { AdapterFactory, AdapterConfig, SourceAdapter } from '@wig/shared-types';
import { MockAdapter, generateMockData } from './mock-adapter';

export class AdapterFactoryImpl implements AdapterFactory {
  private adapters: Map<string, SourceAdapter> = new Map();

  async create(config: AdapterConfig): Promise<SourceAdapter> {
    // Check if already created
    const existing = this.adapters.get(config.sourceName);
    if (existing) return existing;

    // Create based on source name
    let adapter: SourceAdapter;

    switch (config.sourceName) {
      case 'mock':
        adapter = new MockAdapter(generateMockData());
        break;

      // TODO: Add Gmail adapter
      // case 'gmail':
      //   adapter = new GmailAdapter(config);
      //   break;

      // TODO: Add HubSpot adapter
      // case 'hubspot':
      //   adapter = new HubSpotAdapter(config);
      //   break;

      default:
        throw new Error(`Unsupported adapter: ${config.sourceName}`);
    }

    // Validate connection
    const validation = await adapter.validateConnection();
    if (!validation.valid) {
      throw new Error(`Failed to validate ${config.sourceName}: ${validation.error}`);
    }

    this.adapters.set(config.sourceName, adapter);
    return adapter;
  }

  supports(sourceName: string): boolean {
    return ['mock'].includes(sourceName);
    // TODO: Add more as implemented
    // return ['mock', 'gmail', 'hubspot', 'csv'].includes(sourceName);
  }

  /**
   * Get an already-created adapter
   */
  get(sourceName: string): SourceAdapter | undefined {
    return this.adapters.get(sourceName);
  }

  /**
   * Remove an adapter from the cache
   */
  remove(sourceName: string): boolean {
    return this.adapters.delete(sourceName);
  }

  /**
   * Clear all adapters
   */
  clear(): void {
    this.adapters.clear();
  }
}
