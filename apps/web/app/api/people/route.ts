/**
 * People search API
 * GET /api/people?q=query
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const searchSchema = z.object({
  q: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const validated = searchSchema.parse({
      q: searchParams.get('q'),
    });

    const query = validated.q.toLowerCase();

    // Search by name, email, or title
    const people = await prisma.person.findMany({
      where: {
        deletedAt: null,
        OR: [
          {
            names: {
              hasSome: [query],
            },
          },
          {
            emails: {
              hasSome: [query],
            },
          },
          {
            title: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        organization: true,
      },
      take: 10, // Limit results
    });

    return NextResponse.json(people);
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
}
