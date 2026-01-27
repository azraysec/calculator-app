/**
 * Admin API to cleanup invalid LinkedIn archive jobs
 * POST /api/admin/linkedin-jobs/cleanup
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    // Find all queued/running jobs
    const jobs = await prisma.ingestJob.findMany({
      where: {
        sourceName: 'linkedin_archive',
        status: { in: ['queued', 'running'] },
      },
    });

    let cancelledCount = 0;
    let validCount = 0;
    const results = [];

    for (const job of jobs) {
      const fileMetadata = job.fileMetadata as any;
      const blobUrl = fileMetadata?.blobUrl;

      if (!blobUrl) {
        await prisma.ingestJob.update({
          where: { id: job.id },
          data: {
            status: 'cancelled',
            completedAt: new Date(),
            error: 'Invalid job - no blob URL (from old system)',
          },
        });
        cancelledCount++;
        results.push({
          id: job.id,
          action: 'cancelled',
          reason: 'no blob URL',
          createdAt: job.createdAt,
        });
      } else {
        validCount++;
        results.push({
          id: job.id,
          action: 'kept',
          reason: 'has blob URL',
          createdAt: job.createdAt,
        });
      }
    }

    return NextResponse.json({
      message: `Cleaned up ${cancelledCount} invalid jobs, ${validCount} valid jobs remaining`,
      cancelledCount,
      validCount,
      results,
    });
  } catch (error) {
    console.error('Error cleaning up jobs:', error);
    return NextResponse.json(
      {
        error: 'Failed to cleanup jobs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
