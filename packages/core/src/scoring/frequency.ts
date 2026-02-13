/**
 * Frequency Score Calculation
 *
 * Calculates a score based on how frequently interactions occur.
 * Uses logarithmic scaling to prevent high-volume relationships
 * from dominating the score.
 *
 * Score interpretation:
 * - 0 = no interactions
 * - ~0.15 = 1 interaction per month
 * - ~0.35 = 4 interactions per month
 * - ~0.74 = 30 interactions per month
 * - ~1.0 = 100+ interactions per month
 */

/**
 * Calculate frequency score based on interaction count and time span.
 *
 * @param count - Total number of interactions
 * @param timeSpanDays - Number of days over which interactions occurred
 * @returns Score between 0 and 1 (higher = more frequent)
 * @throws Error if count is negative
 * @throws Error if timeSpanDays is negative
 */
export function calculateFrequency(count: number, timeSpanDays: number): number {
  // Validate inputs
  if (count < 0) {
    throw new Error('count must be non-negative');
  }
  if (timeSpanDays < 0) {
    throw new Error('timeSpanDays must be non-negative');
  }

  // No interactions
  if (count === 0) {
    return 0;
  }

  // Zero time span (edge case - interactions on same day)
  if (timeSpanDays === 0) {
    return 0;
  }

  // Calculate interactions per month (30 days)
  const perMonth = (count / timeSpanDays) * 30;

  // Logarithmic scale: log10(perMonth + 1) / 2
  // This gives us:
  // - 1/month: log10(2) / 2 ≈ 0.15
  // - 4/month: log10(5) / 2 ≈ 0.35
  // - 30/month: log10(31) / 2 ≈ 0.74
  // - 100/month: log10(101) / 2 ≈ 1.0
  const result = Math.log10(perMonth + 1) / 2;

  // Clamp to [0, 1] range
  return Math.max(0, Math.min(1, result));
}
