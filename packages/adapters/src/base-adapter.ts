/**
 * Base adapter class with common functionality
 */

import type { SourceAdapter, AdapterCapabilities, PaginatedResult, ListParams } from '@wig/shared-types';

export abstract class BaseAdapter implements SourceAdapter {
  abstract readonly sourceName: string;

  abstract capabilities(): Promise<AdapterCapabilities>;
  abstract listContacts(params: ListParams): Promise<PaginatedResult<any>>;
  abstract listInteractions(params: ListParams): Promise<PaginatedResult<any>>;
  abstract validateConnection(): Promise<{ valid: boolean; error?: string }>;

  /**
   * Common pagination helper
   */
  protected paginate<T>(
    items: T[],
    cursor: string | undefined,
    limit: number = 100
  ): PaginatedResult<T> {
    const startIndex = cursor ? parseInt(cursor, 10) : 0;
    const endIndex = startIndex + limit;
    const pageItems = items.slice(startIndex, endIndex);
    const hasMore = endIndex < items.length;
    const nextCursor = hasMore ? endIndex.toString() : undefined;

    return {
      items: pageItems,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Common error handling
   */
  protected handleError(error: unknown): never {
    if (error instanceof Error) {
      throw new Error(`${this.sourceName} adapter error: ${error.message}`);
    }
    throw new Error(`${this.sourceName} adapter error: ${String(error)}`);
  }
}
