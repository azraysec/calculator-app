// Scoring exports
export { LinkedInRelationshipScorer } from './linkedin-scorer';
export type { ScoringFactors, ScoringResult } from './linkedin-scorer';

// Base scoring utilities
export {
  DEFAULT_WEIGHTS,
  calculateStrength,
  calculateRecencyFactor,
  calculateFrequencyFactor,
  calculateMutualityFactor,
  calculateChannelsFactor,
  calculateStrengthFactors,
} from './base-scorer';
