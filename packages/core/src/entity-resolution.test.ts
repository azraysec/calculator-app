/**
 * Unit tests for entity resolution logic
 */

import { describe, it, expect } from 'vitest';
import {
  stringSimilarity,
  matchByEmail,
  matchByPhone,
  matchBySocialHandle,
  matchByNameAndCompany,
  findMatches,
  generateMergeExplanation,
} from './entity-resolution';
import type { Person, EntityResolutionMatch } from '@wig/shared-types';

// Helper to create mock person
function createPerson(overrides: Partial<Person> = {}): Person {
  return {
    id: `person-${Math.random().toString(36).substring(7)}`,
    names: ['Test Person'],
    emails: [],
    phones: [],
    previousIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('stringSimilarity', () => {
  it('should return 1.0 for identical strings', () => {
    expect(stringSimilarity('hello', 'hello')).toBe(1.0);
  });

  it('should return 1.0 for case-insensitive matches', () => {
    expect(stringSimilarity('Hello', 'hello')).toBe(1.0);
    expect(stringSimilarity('HELLO', 'hello')).toBe(1.0);
  });

  it('should return 1.0 for matches with whitespace differences', () => {
    expect(stringSimilarity(' hello ', 'hello')).toBe(1.0);
  });

  it('should return 0 for empty strings', () => {
    expect(stringSimilarity('', 'hello')).toBe(0);
    expect(stringSimilarity('hello', '')).toBe(0);
  });

  it('should return value between 0 and 1 for similar strings', () => {
    const similarity = stringSimilarity('hello', 'helo');
    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(1);
  });

  it('should return higher similarity for more similar strings', () => {
    const sim1 = stringSimilarity('hello', 'helo'); // 1 deletion
    const sim2 = stringSimilarity('hello', 'help'); // 2 changes
    expect(sim1).toBeGreaterThan(sim2);
  });

  it('should handle completely different strings', () => {
    const similarity = stringSimilarity('abc', 'xyz');
    expect(similarity).toBeLessThan(0.5);
  });
});

describe('matchByEmail', () => {
  it('should return null when no common emails', () => {
    const person1 = createPerson({ emails: ['alice@example.com'] });
    const person2 = createPerson({ emails: ['bob@example.com'] });

    const result = matchByEmail(person1, person2);

    expect(result).toBeNull();
  });

  it('should return match when emails overlap', () => {
    const person1 = createPerson({
      id: 'p1',
      emails: ['alice@example.com', 'shared@example.com'],
    });
    const person2 = createPerson({
      id: 'p2',
      emails: ['bob@example.com', 'shared@example.com'],
    });

    const result = matchByEmail(person1, person2);

    expect(result).not.toBeNull();
    expect(result!.matchScore).toBe(1.0);
    expect(result!.matchMethod).toBe('email');
    expect(result!.recommendation).toBe('auto_merge');
    expect(result!.evidence).toHaveLength(1);
    expect(result!.evidence[0].targetValue).toBe('shared@example.com');
  });

  it('should include all common emails in evidence', () => {
    const person1 = createPerson({
      emails: ['shared1@example.com', 'shared2@example.com'],
    });
    const person2 = createPerson({
      emails: ['shared1@example.com', 'shared2@example.com', 'other@example.com'],
    });

    const result = matchByEmail(person1, person2);

    expect(result!.evidence).toHaveLength(2);
  });
});

describe('matchByPhone', () => {
  it('should return null when no common phones', () => {
    const person1 = createPerson({ phones: ['111-111-1111'] });
    const person2 = createPerson({ phones: ['222-222-2222'] });

    const result = matchByPhone(person1, person2);

    expect(result).toBeNull();
  });

  it('should return match when phones overlap', () => {
    const person1 = createPerson({ id: 'p1', phones: ['111-111-1111'] });
    const person2 = createPerson({ id: 'p2', phones: ['111-111-1111'] });

    const result = matchByPhone(person1, person2);

    expect(result).not.toBeNull();
    expect(result!.matchScore).toBe(1.0);
    expect(result!.matchMethod).toBe('phone');
    expect(result!.recommendation).toBe('auto_merge');
  });
});

describe('matchBySocialHandle', () => {
  it('should return null when no social handles', () => {
    const person1 = createPerson({});
    const person2 = createPerson({});

    const result = matchBySocialHandle(person1, person2);

    expect(result).toBeNull();
  });

  it('should return null when no matching handles', () => {
    const person1 = createPerson({ socialHandles: { twitter: '@alice' } });
    const person2 = createPerson({ socialHandles: { twitter: '@bob' } });

    const result = matchBySocialHandle(person1, person2);

    expect(result).toBeNull();
  });

  it('should return match when social handles match', () => {
    const person1 = createPerson({
      id: 'p1',
      socialHandles: { linkedin: 'alice-smith', twitter: '@alice' },
    });
    const person2 = createPerson({
      id: 'p2',
      socialHandles: { linkedin: 'alice-smith', github: 'alicedev' },
    });

    const result = matchBySocialHandle(person1, person2);

    expect(result).not.toBeNull();
    expect(result!.matchScore).toBe(0.95);
    expect(result!.matchMethod).toBe('social_handle');
    expect(result!.evidence[0].field).toBe('socialHandle.linkedin');
  });
});

describe('matchByNameAndCompany', () => {
  it('should return null for dissimilar names', () => {
    const person1 = createPerson({ names: ['Alice Smith'] });
    const person2 = createPerson({ names: ['Bob Johnson'] });

    const result = matchByNameAndCompany(person1, person2);

    expect(result).toBeNull();
  });

  it('should return null for similar names without organization', () => {
    const person1 = createPerson({ names: ['Alice Smith'] });
    const person2 = createPerson({ names: ['Alice Smyth'] }); // Similar but not 95%

    const result = matchByNameAndCompany(person1, person2);

    // Similar names (~0.91) but no org, so null unless >= 0.95
    expect(result).toBeNull();
  });

  it('should return review match for very similar names without organization', () => {
    const person1 = createPerson({ names: ['Alice Smith'] });
    const person2 = createPerson({ names: ['Alice Smith'] }); // Identical

    const result = matchByNameAndCompany(person1, person2);

    expect(result).not.toBeNull();
    expect(result!.recommendation).toBe('review_queue');
  });

  it('should return auto_merge for matching name and company', () => {
    const person1 = createPerson({
      names: ['Alice Smith'],
      metadata: { organizationName: 'Acme Inc' },
    });
    const person2 = createPerson({
      names: ['Alice Smith'],
      metadata: { organizationName: 'Acme Inc' },
    });

    const result = matchByNameAndCompany(person1, person2);

    expect(result).not.toBeNull();
    expect(result!.matchScore).toBe(1.0);
    expect(result!.recommendation).toBe('auto_merge');
    expect(result!.evidence).toHaveLength(2);
  });

  it('should handle multiple names', () => {
    const person1 = createPerson({
      names: ['A. Smith', 'Alice Smith'],
      metadata: { organizationName: 'Acme' },
    });
    const person2 = createPerson({
      names: ['Alice S.', 'Alice Smith'],
      metadata: { organizationName: 'Acme' },
    });

    const result = matchByNameAndCompany(person1, person2);

    expect(result).not.toBeNull();
    expect(result!.matchScore).toBeGreaterThan(0.9);
  });
});

describe('findMatches', () => {
  it('should return empty array for no candidates', () => {
    const target = createPerson({ emails: ['alice@example.com'] });

    const matches = findMatches(target, []);

    expect(matches).toEqual([]);
  });

  it('should skip self matches', () => {
    const target = createPerson({ id: 'p1', emails: ['alice@example.com'] });

    const matches = findMatches(target, [target]);

    expect(matches).toEqual([]);
  });

  it('should skip deleted candidates', () => {
    const target = createPerson({ emails: ['shared@example.com'] });
    const deletedCandidate = createPerson({
      emails: ['shared@example.com'],
      deletedAt: new Date(),
    });

    const matches = findMatches(target, [deletedCandidate]);

    expect(matches).toEqual([]);
  });

  it('should prioritize email matches over other methods', () => {
    const target = createPerson({
      emails: ['shared@example.com'],
      phones: ['111-111-1111'],
      names: ['Alice Smith'],
    });
    const candidate = createPerson({
      emails: ['shared@example.com'],
      phones: ['111-111-1111'],
      names: ['Alice Smith'],
    });

    const matches = findMatches(target, [candidate]);

    expect(matches).toHaveLength(1);
    expect(matches[0].matchMethod).toBe('email');
  });

  it('should find phone match if no email match', () => {
    const target = createPerson({
      emails: ['alice@example.com'],
      phones: ['111-111-1111'],
    });
    const candidate = createPerson({
      emails: ['bob@example.com'],
      phones: ['111-111-1111'],
    });

    const matches = findMatches(target, [candidate]);

    expect(matches).toHaveLength(1);
    expect(matches[0].matchMethod).toBe('phone');
  });

  it('should sort matches by score descending', () => {
    const target = createPerson({
      emails: [],
      names: ['Alice Smith'],
      metadata: { organizationName: 'Acme' },
    });
    const candidate1 = createPerson({
      names: ['Alice Smith'],
      metadata: { organizationName: 'Acme' },
    }); // Perfect match
    const candidate2 = createPerson({
      names: ['Alice Smyth'],
      metadata: { organizationName: 'Acme Inc' },
    }); // Close match

    const matches = findMatches(target, [candidate2, candidate1]); // Add in wrong order

    if (matches.length >= 2) {
      expect(matches[0].matchScore).toBeGreaterThanOrEqual(matches[1].matchScore);
    }
  });
});

describe('generateMergeExplanation', () => {
  it('should generate explanation for email match', () => {
    const match: EntityResolutionMatch = {
      targetPersonId: 'p1',
      candidatePersonId: 'p2',
      matchScore: 1.0,
      matchMethod: 'email',
      evidence: [
        {
          field: 'email',
          targetValue: 'shared@example.com',
          candidateValue: 'shared@example.com',
          similarity: 1.0,
        },
      ],
      recommendation: 'auto_merge',
    };

    const explanation = generateMergeExplanation(match);

    expect(explanation).toContain('Exact email address match');
    expect(explanation).toContain('100%');
    expect(explanation).toContain('email: 100%');
  });

  it('should generate explanation for name_company match', () => {
    const match: EntityResolutionMatch = {
      targetPersonId: 'p1',
      candidatePersonId: 'p2',
      matchScore: 0.92,
      matchMethod: 'name_company',
      evidence: [
        { field: 'name', targetValue: 'Alice', candidateValue: 'Alice', similarity: 1.0 },
        { field: 'organization', targetValue: 'Acme', candidateValue: 'Acme Inc', similarity: 0.84 },
      ],
      recommendation: 'review_queue',
    };

    const explanation = generateMergeExplanation(match);

    expect(explanation).toContain('Name and organization similarity');
    expect(explanation).toContain('92%');
    expect(explanation).toContain('name: 100%');
    expect(explanation).toContain('organization: 84%');
  });

  it('should generate explanation for social handle match', () => {
    const match: EntityResolutionMatch = {
      targetPersonId: 'p1',
      candidatePersonId: 'p2',
      matchScore: 0.95,
      matchMethod: 'social_handle',
      evidence: [
        {
          field: 'socialHandle.linkedin',
          targetValue: 'alice-smith',
          candidateValue: 'alice-smith',
          similarity: 1.0,
        },
      ],
      recommendation: 'auto_merge',
    };

    const explanation = generateMergeExplanation(match);

    expect(explanation).toContain('Social media profile match');
    expect(explanation).toContain('95%');
  });
});
