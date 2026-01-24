/**
 * Graph-related types for pathfinding and scoring
 */

import type { Person, Path, PathRankingFactors } from './domain';

export interface PathfindingOptions {
  maxHops?: number; // default 3
  minStrength?: number; // minimum edge strength to consider (0-1)
  maxResults?: number; // default 3
  preferences?: {
    avoidCategories?: string[]; // e.g., ["investors", "competitors"]
    preferGeography?: string[]; // e.g., ["Israel", "US"]
    preferChannels?: string[]; // e.g., ["email", "linkedin"]
  };
}

export interface PathfindingResult {
  paths: Path[];
  targetPerson: Person;
  searchMetadata: {
    nodesExplored: number;
    edgesEvaluated: number;
    duration: number;
  };
}

export interface PathExplanation {
  path: Path;
  factors: PathRankingFactors;
  reasoning: string;
  recommendedIntroducer: {
    personId: string;
    name: string;
    rationale: string;
  };
  suggestedChannel: string;
}

export interface GraphStats {
  totalPeople: number;
  totalOrganizations: number;
  totalEdges: number;
  averageConnections: number;
  strongConnections: number; // strength >= 0.7
  recentInteractions: number; // last 30 days
  dataSources: Array<{
    name: string;
    contactCount: number;
    interactionCount: number;
    lastSync?: Date;
  }>;
}

export interface EntityResolutionMatch {
  targetPersonId: string;
  candidatePersonId: string;
  matchScore: number; // 0-1
  matchMethod: 'email' | 'phone' | 'name_company' | 'social_handle';
  evidence: Array<{
    field: string;
    targetValue: string;
    candidateValue: string;
    similarity: number;
  }>;
  recommendation: 'auto_merge' | 'review_queue' | 'reject';
}

export interface ScoringWeights {
  recency: number; // default 0.35
  frequency: number; // default 0.30
  mutuality: number; // default 0.20
  channels: number; // default 0.15
}

export interface GraphService {
  /**
   * Find warm intro paths from current user to target person
   */
  findPaths(
    fromPersonId: string,
    toPersonId: string,
    options?: PathfindingOptions
  ): Promise<PathfindingResult>;

  /**
   * Calculate relationship strength between two people
   */
  calculateStrength(
    fromPersonId: string,
    toPersonId: string,
    weights?: ScoringWeights
  ): Promise<number>;

  /**
   * Get detailed explanation for a path
   */
  explainPath(path: Path): Promise<PathExplanation>;

  /**
   * Get graph statistics
   */
  getStats(): Promise<GraphStats>;

  /**
   * Find potential duplicate people
   */
  findDuplicates(personId: string): Promise<EntityResolutionMatch[]>;
}
