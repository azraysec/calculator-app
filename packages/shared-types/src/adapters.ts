/**
 * Adapter Interfaces
 *
 * These interfaces define the contract for all data source adapters.
 * Adapters transform source-specific data into canonical formats.
 */

import type { CanonicalContact, CanonicalOrganization, CanonicalInteraction, Cursor } from './domain';

export interface AdapterCapabilities {
  contacts: boolean;
  organizations: boolean;
  interactions: boolean;
}

export interface SyncParams {
  cursor?: Cursor;
  since?: Date;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: Cursor;
  hasMore: boolean;
}

export interface SourceAdapter {
  sourceName: string;
  capabilities(): Promise<AdapterCapabilities>;
  listContacts(params: SyncParams): Promise<PaginatedResult<CanonicalContact>>;
  listOrganizations?(params: SyncParams): Promise<PaginatedResult<CanonicalOrganization>>;
  listInteractions(params: SyncParams): Promise<PaginatedResult<CanonicalInteraction>>;
  validateConnection(): Promise<{ valid: boolean; error?: string }>;
}

export interface AdapterConfig {
  sourceName: string;
  credentials: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export interface AdapterFactory {
  create(config: AdapterConfig): Promise<SourceAdapter>;
  supports(sourceName: string): boolean;
}

// Export ListParams as alias for SyncParams for compatibility
export type ListParams = SyncParams;
