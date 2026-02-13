/**
 * Bidirectional Score Calculation
 *
 * Calculates a score based on how balanced communication is between two parties.
 * Two-way communication indicates a stronger relationship than one-way.
 *
 * Score interpretation:
 * - 0 = no communication
 * - <0.3 = one-way communication
 * - 0.5-0.7 = imbalanced (2:1 ratio)
 * - >0.9 = balanced communication
 */

/**
 * Calculate bidirectional score based on sent and received message counts.
 *
 * @param sent - Number of messages/interactions sent
 * @param received - Number of messages/interactions received
 * @returns Score between 0 and 1 (higher = more balanced)
 * @throws Error if sent is negative
 * @throws Error if received is negative
 */
export function calculateBidirectional(sent: number, received: number): number {
  // Validate inputs
  if (sent < 0) {
    throw new Error('sent must be non-negative');
  }
  if (received < 0) {
    throw new Error('received must be non-negative');
  }

  // No communication at all
  if (sent === 0 && received === 0) {
    return 0;
  }

  // One-way communication (only sent or only received)
  if (sent === 0 || received === 0) {
    // Give a low score for one-way communication
    // Higher volume gets slightly higher score (up to 0.25)
    const volume = Math.max(sent, received);
    const volumeFactor = Math.min(1, Math.log10(volume + 1) / 2);
    return 0.1 + volumeFactor * 0.15; // Range: 0.1 - 0.25
  }

  // Calculate balance ratio (0.0 to 0.5)
  const total = sent + received;
  const ratio = Math.min(sent, received) / Math.max(sent, received);

  // Calculate volume factor to reward high-volume balanced communication
  // Higher volumes get a slight boost
  const volumeBoost = Math.min(0.1, Math.log10(total + 1) / 20);

  // Base score from ratio (perfect balance = 1.0)
  const baseScore = ratio;

  // Final score: ratio + volume boost
  const result = baseScore + volumeBoost;

  // Clamp to [0, 1] range
  return Math.max(0, Math.min(1, result));
}
