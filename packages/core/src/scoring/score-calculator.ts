/**
 * Score Calculator Service
 *
 * High-level service that orchestrates all scoring functions to produce
 * a complete relationship score with factor breakdown and confidence.
 */

import { calculateRecency } from './recency';
import { calculateFrequency } from './frequency';
import { calculateBidirectional } from './bidirectional';
import { calculateChannelDiversity } from './channel-diversity';
import { calculateComposite, ScoringFactors, ScoringWeights, DEFAULT_WEIGHTS } from './composite';

/**
 * Input data for score calculation
 */
export interface ScoringInput {
  /** Array of interaction timestamps */
  interactions: Date[];
  /** Array of communication channel names */
  channels: string[];
  /** Date of most recent interaction (can be derived from interactions) */
  lastInteraction: Date | null;
  /** Date of first interaction (can be derived from interactions) */
  firstInteraction: Date | null;
  /** Number of messages/interactions sent (for bidirectional scoring) */
  sentCount?: number;
  /** Number of messages/interactions received (for bidirectional scoring) */
  receivedCount?: number;
}

/**
 * Result of score calculation
 */
export interface ScoringResult {
  /** Overall composite score (0-1) */
  score: number;
  /** Individual factor scores */
  factors: ScoringFactors;
  /** Confidence in the score based on data completeness (0-1) */
  confidence: number;
}

/**
 * Score Calculator for computing relationship strength.
 *
 * Orchestrates all individual scoring functions and calculates confidence.
 */
export class ScoreCalculator {
  private weights: ScoringWeights;

  /**
   * Create a new ScoreCalculator.
   *
   * @param weights - Optional custom weights for composite scoring
   */
  constructor(weights: ScoringWeights = DEFAULT_WEIGHTS) {
    this.weights = weights;
  }

  /**
   * Calculate complete relationship score from input data.
   *
   * @param input - Scoring input data
   * @returns Complete scoring result with factors and confidence
   */
  calculate(input: ScoringInput): ScoringResult {
    // Handle empty input
    if (
      input.interactions.length === 0 &&
      input.channels.length === 0 &&
      !input.lastInteraction
    ) {
      return {
        score: 0,
        factors: {
          recency: 0,
          frequency: 0,
          bidirectional: 0,
          channelDiversity: 0,
        },
        confidence: 0,
      };
    }

    // Calculate individual factors
    const recencyScore = calculateRecency(input.lastInteraction);

    // Calculate frequency from interactions array
    let frequencyScore = 0;
    if (input.firstInteraction && input.lastInteraction && input.interactions.length > 0) {
      const timeSpanDays = Math.max(
        1,
        (input.lastInteraction.getTime() - input.firstInteraction.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      frequencyScore = calculateFrequency(input.interactions.length, timeSpanDays);
    }

    // Calculate bidirectional from sent/received counts
    const sentCount = input.sentCount ?? 0;
    const receivedCount = input.receivedCount ?? 0;
    const bidirectionalScore = calculateBidirectional(sentCount, receivedCount);

    // Calculate channel diversity
    const channelDiversityScore = calculateChannelDiversity(input.channels);

    const factors: ScoringFactors = {
      recency: recencyScore,
      frequency: frequencyScore,
      bidirectional: bidirectionalScore,
      channelDiversity: channelDiversityScore,
    };

    // Calculate composite score
    const score = calculateComposite(factors, this.weights);

    // Calculate confidence based on data completeness
    const confidence = this.calculateConfidence(input);

    return {
      score,
      factors,
      confidence,
    };
  }

  /**
   * Calculate confidence score based on data completeness.
   *
   * Factors that increase confidence:
   * - Having interaction timestamps
   * - Having sent/received counts
   * - Having multiple channels
   * - Having recent interactions
   */
  private calculateConfidence(input: ScoringInput): number {
    let confidenceFactors = 0;
    let totalFactors = 4;

    // Has interaction data?
    if (input.interactions.length > 0) {
      confidenceFactors += 1;
    }

    // Has sent/received data?
    if ((input.sentCount ?? 0) > 0 || (input.receivedCount ?? 0) > 0) {
      confidenceFactors += 1;
    }

    // Has channel data?
    if (input.channels.length > 0) {
      confidenceFactors += 1;
    }

    // Has recent interaction?
    if (input.lastInteraction) {
      const daysSinceLastInteraction =
        (Date.now() - input.lastInteraction.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastInteraction < 365) {
        confidenceFactors += 1;
      }
    }

    // Scale confidence based on interaction volume
    const baseConfidence = confidenceFactors / totalFactors;

    // Boost confidence with more interactions (up to 20% boost)
    const interactionBoost = Math.min(0.2, input.interactions.length / 100);

    return Math.min(1, baseConfidence + interactionBoost);
  }
}
