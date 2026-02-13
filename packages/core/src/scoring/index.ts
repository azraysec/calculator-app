// Scoring exports (legacy)
export { LinkedInRelationshipScorer } from './linkedin-scorer';
export type { ScoringFactors as LegacyScoringFactors, ScoringResult as LegacyScoringResult } from './linkedin-scorer';

// Base scoring utilities (legacy)
export {
  DEFAULT_WEIGHTS as LEGACY_DEFAULT_WEIGHTS,
  calculateStrength,
  calculateRecencyFactor,
  calculateFrequencyFactor,
  calculateMutualityFactor,
  calculateChannelsFactor,
  calculateStrengthFactors,
} from './base-scorer';

// =============================================================================
// New Scoring Module (Phase 2)
// =============================================================================

// Individual scoring functions
export { calculateRecency } from './recency';
export { calculateFrequency } from './frequency';
export { calculateBidirectional } from './bidirectional';
export { calculateChannelDiversity } from './channel-diversity';

// Composite scoring
export {
  calculateComposite,
  DEFAULT_WEIGHTS,
} from './composite';
export type { ScoringFactors, ScoringWeights } from './composite';

// Score Calculator service
export { ScoreCalculator } from './score-calculator';
export type { ScoringInput, ScoringResult } from './score-calculator';
