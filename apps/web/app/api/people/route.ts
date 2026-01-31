/**
 * People search API
 * GET /api/people?q=query
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { withAuth } from '@/lib/auth-helpers';

const searchSchema = z.object({
  q: z.string().min(1),
});

// Calculate Levenshtein distance for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
      }
    }
  }

  return dp[m][n];
}

// Calculate similarity score (0-1, where 1 is exact match)
function calculateSimilarity(query: string, name: string): number {
  const distance = levenshteinDistance(query.toLowerCase(), name.toLowerCase());
  const maxLength = Math.max(query.length, name.length);
  return 1 - distance / maxLength;
}

export const GET = withAuth(async (request: Request, { userId }) => {
  try {
    const { searchParams } = new URL(request.url);
    const validated = searchSchema.parse({
      q: searchParams.get('q'),
    });

    const query = validated.q.toLowerCase();

    // First, get all people and filter for partial name matches
    // Prisma doesn't support partial matching in array fields, so we fetch and filter
    // CRITICAL: Filter by userId for multi-tenant isolation
    const allPeople = await prisma.person.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        organization: true,
      },
    });

    // Filter for exact or partial matches in names, emails, or title
    let people = allPeople.filter((person) => {
      // Check if any name contains the query (case-insensitive partial match)
      const nameMatch = (person.names as string[]).some((name) =>
        name.toLowerCase().includes(query)
      );

      // Check if any email contains the query
      const emailMatch = (person.emails as string[]).some((email) =>
        email.toLowerCase().includes(query)
      );

      // Check if title contains the query
      const titleMatch = person.title?.toLowerCase().includes(query);

      return nameMatch || emailMatch || titleMatch;
    }).slice(0, 10);

    // Track whether fuzzy matching was used
    let usedFuzzyMatch = false;

    // If no partial matches, try fuzzy matching
    if (people.length === 0) {
      usedFuzzyMatch = true;

      // Calculate similarity scores for each person
      const scoredPeople = allPeople.map((person) => {
        const nameScores = (person.names as string[]).map((name) =>
          calculateSimilarity(query, name)
        );
        const maxNameScore = Math.max(...nameScores);

        const emailScores = (person.emails as string[]).map((email) =>
          calculateSimilarity(query, email.split('@')[0]) // Match against username part
        );
        const maxEmailScore = emailScores.length > 0 ? Math.max(...emailScores) : 0;

        const titleScore = person.title
          ? calculateSimilarity(query, person.title)
          : 0;

        const maxScore = Math.max(maxNameScore, maxEmailScore, titleScore);

        return {
          person,
          score: maxScore,
        };
      });

      // Filter by similarity threshold (0.5 = 50% similar) and sort by score
      const threshold = 0.5;
      people = scoredPeople
        .filter(({ score }) => score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(({ person }) => person);
    }

    return NextResponse.json({
      results: people,
      metadata: {
        usedFuzzyMatch,
        query,
        count: people.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('People search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
