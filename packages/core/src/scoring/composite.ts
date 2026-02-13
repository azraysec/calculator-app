/**
 * Composite Score Calculation
 *
 * Combines all individual scoring factors into a single overall score
 * using configurable weights.
 *
 * Default weights:
 * - Recency: 30%
 * - Frequency: 25%
 * - Bidirectional: 25%
 * - Channel Diversity: 20%
 */

/**
 * Individual scoring factors (all normalized to 0-1 range)
 */
export interface ScoringFactors {
  recency: number;
  frequency: number;
  bidirectional: number;
  channelDiversity: number;
}

/**
 * Weights for each scoring factor (must sum to 1.0)
 */
export interface ScoringWeights {
  recency: number;
  frequency: number;
  bidirectional: number;
  channelDiversity: number;
}

/**
 * Default weights for composite score calculation
 */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  recency: 0.3,
  frequency: 0.25,
  bidirectional: 0.25,
  channelDiversity: 0.2,
};

/**
 * Calculate composite score from individual factors using weighted sum.
 *
 * @param factors - Individual scoring factors (all 0-1)
 * @param weights - Optional custom weights (must sum to 1.0)
 * @returns Composite score between 0 and 1
 * @throws Error if weights do not sum to 1.0
 */
export function calculateComposite(
  factors: ScoringFactors,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  // Validate weights sum to 1.0 (with small tolerance for floating point)
  const weightSum =
    weights.recency +
    weights.frequency +
    weights.bidirectional +
    weights.channelDiversity;

  if (Math.abs(weightSum - 1.0) > 0.001) {
    throw new Error(
      `Weights must sum to 1.0, but got ${weightSum.toFixed(4)}`
    );
  }

  // Calculate weighted sum
  const result =
    factors.recency * weights.recency +
    factors.frequency * weights.frequency +
    factors.bidirectional * weights.bidirectional +
    factors.channelDiversity * weights.channelDiversity;

  // Clamp to [0, 1] range
  return Math.max(0, Math.min(1, result));
}
