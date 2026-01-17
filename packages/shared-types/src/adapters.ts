/**
 * Adapter Interfaces
 *
 * These interfaces define the contract for all data source adapters.
 * Adapters transform source-specific data into canonical formats.
 */

import type { CanonicalContact, CanonicalOrganization, CanonicalInteraction } from './canonical';

export type Cursor = string;

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
}

export interface SourceAdapter {
  sourceName: string;
  capabilities(): Promise<AdapterCapabilities>;
  listContacts(params: SyncParams): Promise<PaginatedResult<CanonicalContact>>;
  listOrganizations?(params: SyncParams): Promise<PaginatedResult<CanonicalOrganization>>;
  listInteractions(params: SyncParams): Promise<PaginatedResult<CanonicalInteraction>>;
}
