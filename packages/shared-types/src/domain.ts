/**
 * Core domain types for WIG system
 */

export type Cursor = string;

export interface CanonicalContact {
  sourceId: string;
  sourceName: string;
  names: string[];
  emails: string[];
  phones: string[];
  socialHandles?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    [key: string]: string | undefined;
  };
  title?: string;
  organizationName?: string;
  organizationDomain?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CanonicalOrganization {
  sourceId: string;
  sourceName: string;
  name: string;
  domain?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type InteractionChannel = 'email' | 'message' | 'meeting' | 'call' | 'other';

export type InteractionDirection = 'inbound' | 'outbound' | 'bidirectional';

export interface CanonicalInteraction {
  sourceId: string;
  sourceName: string;
  timestamp: Date;
  participants: string[]; // emails or identifiers
  channel: InteractionChannel;
  direction?: InteractionDirection;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type RelationshipType =
  | 'knows'
  | 'connected_to'
  | 'interacted_with'
  | 'worked_at'
  | 'advised'
  | 'invested_in';

export interface RelationshipStrengthFactors {
  recency: number; // 0-1, how recent the last interaction
  frequency: number; // 0-1, based on interaction count
  mutuality: number; // 0-1, bidirectional = 1.0
  channels: number; // 0-1, multiple channels = higher
}

export interface Edge {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  relationshipType: RelationshipType;
  strength: number; // 0-1
  strengthFactors?: RelationshipStrengthFactors;
  sources: string[];
  channels: string[];
  firstSeenAt: Date;
  lastSeenAt: Date;
  interactionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Person {
  id: string;
  names: string[];
  emails: string[];
  phones: string[];
  socialHandles?: Record<string, string>;
  title?: string;
  organizationId?: string;
  mergeExplanation?: string;
  previousIds: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Path {
  nodes: Person[];
  edges: Edge[];
  score: number;
  explanation: string;
}

export interface PathRankingFactors {
  introducerRelationshipStrength: number;
  downstreamRelationshipStrength: number;
  pathLengthPenalty: number;
  recencyScore: number;
  evidenceQuality: number;
}
