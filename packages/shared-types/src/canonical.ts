/**
 * Canonical Data Models
 *
 * These types represent the normalized, system-wide data structures
 * that all adapters must transform their source-specific data into.
 * This ensures consistency across different data sources.
 */

export interface CanonicalContact {
  sourceId: string;
  sourceName: string;
  names: string[];
  emails: string[];
  phones: string[];
  socialHandles: Record<string, string>; // platform -> handle
  title?: string;
  organizationName?: string;
  metadata: Record<string, unknown>; // Flexible source-specific data
}

export interface CanonicalOrganization {
  sourceId: string;
  sourceName: string;
  name: string;
  domain?: string;
  metadata: Record<string, unknown>;
}

export interface CanonicalInteraction {
  sourceId: string;
  sourceName: string;
  timestamp: Date;
  participants: string[]; // email addresses
  channel: 'email' | 'message' | 'meeting' | 'call' | 'other';
  direction?: '1-way' | '2-way';
  metadata: Record<string, unknown>;
}
