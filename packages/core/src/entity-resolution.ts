/**
 * Entity resolution logic for detecting and merging duplicate people/organizations
 */

import type { Person, EntityResolutionMatch } from '@wig/shared-types';

export type MatchMethod = 'email' | 'phone' | 'name_company' | 'social_handle';
export type MatchRecommendation = 'auto_merge' | 'review_queue' | 'reject';

/**
 * Calculate similarity between two strings (Levenshtein distance normalized)
 */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (a.length === 0 || b.length === 0) return 0;

  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();

  if (aLower === bLower) return 1.0;

  // Levenshtein distance
  const matrix: number[][] = [];

  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= aLower.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      if (bLower.charAt(i - 1) === aLower.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  const distance = matrix[bLower.length][aLower.length];
  const maxLength = Math.max(aLower.length, bLower.length);

  return 1 - distance / maxLength;
}

/**
 * Check if two people match via exact email
 */
export function matchByEmail(person1: Person, person2: Person): EntityResolutionMatch | null {
  const commonEmails = person1.emails.filter((e) => person2.emails.includes(e));

  if (commonEmails.length === 0) return null;

  return {
    targetPersonId: person1.id,
    candidatePersonId: person2.id,
    matchScore: 1.0,
    matchMethod: 'email',
    evidence: commonEmails.map((email) => ({
      field: 'email',
      targetValue: email,
      candidateValue: email,
      similarity: 1.0,
    })),
    recommendation: 'auto_merge',
  };
}

/**
 * Check if two people match via exact phone
 */
export function matchByPhone(person1: Person, person2: Person): EntityResolutionMatch | null {
  const commonPhones = person1.phones.filter((p) => person2.phones.includes(p));

  if (commonPhones.length === 0) return null;

  return {
    targetPersonId: person1.id,
    candidatePersonId: person2.id,
    matchScore: 1.0,
    matchMethod: 'phone',
    evidence: commonPhones.map((phone) => ({
      field: 'phone',
      targetValue: phone,
      candidateValue: phone,
      similarity: 1.0,
    })),
    recommendation: 'auto_merge',
  };
}

/**
 * Check if two people match via social handle
 */
export function matchBySocialHandle(
  person1: Person,
  person2: Person
): EntityResolutionMatch | null {
  if (!person1.socialHandles || !person2.socialHandles) return null;

  const commonPlatforms = Object.keys(person1.socialHandles).filter(
    (platform) =>
      person2.socialHandles &&
      person1.socialHandles![platform] === person2.socialHandles[platform]
  );

  if (commonPlatforms.length === 0) return null;

  return {
    targetPersonId: person1.id,
    candidatePersonId: person2.id,
    matchScore: 0.95,
    matchMethod: 'social_handle',
    evidence: commonPlatforms.map((platform) => ({
      field: `socialHandle.${platform}`,
      targetValue: person1.socialHandles![platform],
      candidateValue: person2.socialHandles![platform],
      similarity: 1.0,
    })),
    recommendation: 'auto_merge',
  };
}

/**
 * Check if two people match via name + company similarity
 */
export function matchByNameAndCompany(
  person1: Person,
  person2: Person
): EntityResolutionMatch | null {
  // Compare all name combinations
  let bestNameSimilarity = 0;
  let bestNamePair: [string, string] = ['', ''];

  for (const name1 of person1.names) {
    for (const name2 of person2.names) {
      const sim = stringSimilarity(name1, name2);
      if (sim > bestNameSimilarity) {
        bestNameSimilarity = sim;
        bestNamePair = [name1, name2];
      }
    }
  }

  // Need strong name match (>= 0.85)
  if (bestNameSimilarity < 0.85) return null;

  // Check if both have organization info
  const org1 = person1.metadata?.organizationName as string | undefined;
  const org2 = person2.metadata?.organizationName as string | undefined;

  if (!org1 || !org2) {
    // No organization info - name match alone not enough
    if (bestNameSimilarity >= 0.95) {
      return {
        targetPersonId: person1.id,
        candidatePersonId: person2.id,
        matchScore: bestNameSimilarity,
        matchMethod: 'name_company',
        evidence: [
          {
            field: 'name',
            targetValue: bestNamePair[0],
            candidateValue: bestNamePair[1],
            similarity: bestNameSimilarity,
          },
        ],
        recommendation: 'review_queue',
      };
    }
    return null;
  }

  const orgSimilarity = stringSimilarity(org1, org2);

  // Need strong org match too (>= 0.8)
  if (orgSimilarity < 0.8) return null;

  const matchScore = (bestNameSimilarity + orgSimilarity) / 2;
  const recommendation: MatchRecommendation =
    matchScore >= 0.95 ? 'auto_merge' : matchScore >= 0.88 ? 'review_queue' : 'reject';

  return {
    targetPersonId: person1.id,
    candidatePersonId: person2.id,
    matchScore,
    matchMethod: 'name_company',
    evidence: [
      {
        field: 'name',
        targetValue: bestNamePair[0],
        candidateValue: bestNamePair[1],
        similarity: bestNameSimilarity,
      },
      {
        field: 'organization',
        targetValue: org1,
        candidateValue: org2,
        similarity: orgSimilarity,
      },
    ],
    recommendation,
  };
}

/**
 * Find all potential matches for a person using layered approach
 */
export function findMatches(
  target: Person,
  candidates: Person[]
): EntityResolutionMatch[] {
  const matches: EntityResolutionMatch[] = [];

  for (const candidate of candidates) {
    if (target.id === candidate.id) continue;
    if (candidate.deletedAt) continue;

    // Layer 1: Exact email match (highest confidence)
    const emailMatch = matchByEmail(target, candidate);
    if (emailMatch) {
      matches.push(emailMatch);
      continue; // Skip other checks for this candidate
    }

    // Layer 2: Exact phone match (high confidence)
    const phoneMatch = matchByPhone(target, candidate);
    if (phoneMatch) {
      matches.push(phoneMatch);
      continue;
    }

    // Layer 3: Social handle match (high confidence)
    const socialMatch = matchBySocialHandle(target, candidate);
    if (socialMatch) {
      matches.push(socialMatch);
      continue;
    }

    // Layer 4: Name + company match (medium confidence)
    const nameCompanyMatch = matchByNameAndCompany(target, candidate);
    if (nameCompanyMatch) {
      matches.push(nameCompanyMatch);
    }
  }

  // Sort by match score descending
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Generate merge explanation for audit trail
 */
export function generateMergeExplanation(match: EntityResolutionMatch): string {
  const methodDescriptions: Record<MatchMethod, string> = {
    email: 'Exact email address match',
    phone: 'Exact phone number match',
    social_handle: 'Social media profile match',
    name_company: 'Name and organization similarity',
  };

  const evidence = match.evidence.map((e) => `${e.field}: ${(e.similarity * 100).toFixed(0)}%`).join(', ');

  return `${methodDescriptions[match.matchMethod]}. Confidence: ${(match.matchScore * 100).toFixed(0)}%. Evidence: ${evidence}`;
}
