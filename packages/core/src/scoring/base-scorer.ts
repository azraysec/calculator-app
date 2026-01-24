/**
 * Relationship strength scoring logic
 */

import type { RelationshipStrengthFactors, ScoringWeights } from '@wig/shared-types';

export const DEFAULT_WEIGHTS: ScoringWeights = {
  recency: 0.35,
  frequency: 0.30,
  mutuality: 0.20,
  channels: 0.15,
};

/**
 * Calculate relationship strength from multiple factors
 * Returns a score between 0 and 1
 */
export function calculateStrength(
  factors: RelationshipStrengthFactors,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  const score =
    factors.recency * weights.recency +
    factors.frequency * weights.frequency +
    factors.mutuality * weights.mutuality +
    factors.channels * weights.channels;

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate recency factor based on last interaction date
 * More recent = higher score (exponential decay)
 */
export function calculateRecencyFactor(lastInteractionDate: Date): number {
  const now = Date.now();
  const lastInteraction = lastInteractionDate.getTime();
  const daysSince = (now - lastInteraction) / (1000 * 60 * 60 * 24);

  // Exponential decay with half-life of 90 days
  const halfLife = 90;
  return Math.exp(-(daysSince / halfLife) * Math.LN2);
}

/**
 * Calculate frequency factor based on interaction count and timespan
 * More frequent interactions = higher score
 */
export function calculateFrequencyFactor(
  interactionCount: number,
  firstSeenDate: Date,
  lastSeenDate: Date
): number {
  if (interactionCount === 0) return 0;

  const daysBetween =
    (lastSeenDate.getTime() - firstSeenDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysBetween <= 0) return interactionCount > 0 ? 0.5 : 0;

  // Interactions per month
  const interactionsPerMonth = (interactionCount / daysBetween) * 30;

  // Logarithmic scale: 1 per month = 0.3, 4 per month = 0.6, 10+ per month = ~1.0
  return Math.min(1, Math.log10(interactionsPerMonth + 1) / Math.log10(11));
}

/**
 * Calculate mutuality factor based on bidirectional communication
 * Two-way communication = 1.0, one-way = lower score
 */
export function calculateMutualityFactor(
  sentCount: number,
  receivedCount: number
): number {
  if (sentCount === 0 && receivedCount === 0) return 0;
  if (sentCount === 0 || receivedCount === 0) return 0.3; // One-way

  const total = sentCount + receivedCount;
  const ratio = Math.min(sentCount, receivedCount) / total;

  // Perfect balance (50/50) = 1.0, one-sided = lower
  return ratio * 2;
}

/**
 * Calculate channels factor based on diversity of communication channels
 * More channels = stronger relationship
 */
export function calculateChannelsFactor(channels: string[]): number {
  const uniqueChannels = new Set(channels);
  const count = uniqueChannels.size;

  // 1 channel = 0.4, 2 channels = 0.7, 3+ channels = 1.0
  if (count === 0) return 0;
  if (count === 1) return 0.4;
  if (count === 2) return 0.7;
  return 1.0;
}

/**
 * Calculate all strength factors for an edge
 */
export function calculateStrengthFactors(params: {
  firstSeenAt: Date;
  lastSeenAt: Date;
  interactionCount: number;
  sentCount: number;
  receivedCount: number;
  channels: string[];
}): RelationshipStrengthFactors {
  return {
    recency: calculateRecencyFactor(params.lastSeenAt),
    frequency: calculateFrequencyFactor(
      params.interactionCount,
      params.firstSeenAt,
      params.lastSeenAt
    ),
    mutuality: calculateMutualityFactor(params.sentCount, params.receivedCount),
    channels: calculateChannelsFactor(params.channels),
  };
}
