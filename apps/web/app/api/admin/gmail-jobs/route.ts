/**
 * Admin API to view Gmail sync jobs
 * GET /api/admin/gmail-jobs - List all Gmail sync jobs
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const jobs = await prisma.ingestJob.findMany({
      where: {
        sourceName: 'gmail',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
      include: {
        user: {
          select: {
            email: true,
            googleRefreshToken: true,
          },
        },
      },
    });

    return NextResponse.json({
      count: jobs.length,
      jobs: jobs.map((job) => ({
        id: job.id,
        userId: job.userId,
        userEmail: job.user?.email,
        hasRefreshToken: !!job.user?.googleRefreshToken,
        status: job.status,
        progress: job.progress,
        logs: job.logs,
        error: job.error,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        resultMetadata: job.resultMetadata,
      })),
    });
  } catch (error) {
    console.error('Error fetching Gmail jobs:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch Gmail jobs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
