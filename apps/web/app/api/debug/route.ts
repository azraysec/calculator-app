/**
 * Debug API endpoint
 * Check database connection and data
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const peopleCount = await prisma.person.count();
    const edgesCount = await prisma.edge.count();

    const allPeople = await prisma.person.findMany({
      select: { id: true, names: true, deletedAt: true },
      take: 10,
    });

    const meUser = await prisma.person.findUnique({
      where: { id: 'me' },
      select: { id: true, names: true, emails: true, deletedAt: true },
    });

    return NextResponse.json({
      database_url: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      counts: {
        people: peopleCount,
        edges: edgesCount,
      },
      meUser,
      allPeople,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Database query failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
