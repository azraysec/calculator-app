/**
 * Recency Score Calculation
 *
 * Calculates a score based on how recently an interaction occurred.
 * Uses exponential decay with a 180-day time constant.
 *
 * Score interpretation:
 * - 1.0 = interaction today
 * - ~0.85 = 30 days ago
 * - ~0.61 = 90 days ago
 * - ~0.37 = 180 days ago
 * - ~0.13 = 365 days ago
 */

/**
 * Calculate recency score based on last interaction date.
 *
 * @param lastInteraction - Date of last interaction, or null if never interacted
 * @returns Score between 0 and 1 (higher = more recent)
 */
export function calculateRecency(lastInteraction: Date | null): number {
  // No interaction history
  if (lastInteraction === null) {
    return 0;
  }

  const now = Date.now();
  const lastInteractionTime = lastInteraction.getTime();
  const daysSince = (now - lastInteractionTime) / (1000 * 60 * 60 * 24);

  // Future dates get clamped to 1
  if (daysSince < 0) {
    return 1;
  }

  // Exponential decay with time constant of 180 days
  // At 180 days, score = e^(-1) ≈ 0.368
  const timeConstant = 180;
  const result = Math.exp(-daysSince / timeConstant);

  // Clamp to [0, 1] range
  return Math.max(0, Math.min(1, result));
}
