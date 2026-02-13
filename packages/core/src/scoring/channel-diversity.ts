/**
 * Channel Diversity Score Calculation
 *
 * Calculates a score based on how many different communication channels
 * are used in a relationship. More channels indicates a stronger relationship.
 *
 * Score interpretation:
 * - 0 = no channels
 * - 0.25 = 1 channel (e.g., just email)
 * - 0.5 = 2 channels (e.g., email + LinkedIn)
 * - 0.75 = 3 channels (e.g., email + LinkedIn + phone)
 * - 1.0 = 4+ channels
 */

/**
 * Calculate channel diversity score based on communication channels used.
 *
 * @param channels - Array of channel names (e.g., ['email', 'linkedin', 'phone'])
 * @returns Score between 0 and 1 (higher = more diverse)
 */
export function calculateChannelDiversity(channels: string[]): number {
  // No channels
  if (!channels || channels.length === 0) {
    return 0;
  }

  // Deduplicate and normalize to lowercase
  const uniqueChannels = new Set(
    channels.map((channel) => channel.toLowerCase().trim())
  );

  const count = uniqueChannels.size;

  // Scale: 1=0.25, 2=0.5, 3=0.75, 4+=1.0
  if (count === 0) return 0;
  if (count === 1) return 0.25;
  if (count === 2) return 0.5;
  if (count === 3) return 0.75;
  return 1.0;
}
