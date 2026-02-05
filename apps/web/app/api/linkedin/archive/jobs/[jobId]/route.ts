/**
 * LinkedIn Archive Job Status API
 * GET /api/linkedin/archive/jobs/:jobId
 *
 * Returns job status, progress, and results
 * SECURITY: Requires authentication and verifies job ownership
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth-helpers';

export const GET = withAuth(async (
  _request: Request,
  { userId, params }
) => {
  try {
    const { jobId } = await params;

    // CRITICAL: Filter by userId for multi-tenant isolation
    const job = await prisma.ingestJob.findFirst({
      where: {
        id: jobId,
        userId, // Only return jobs belonging to authenticated user
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      fileMetadata: job.fileMetadata,
      resultMetadata: job.resultMetadata,
      logs: job.logs,
    });
  } catch (error) {
    console.error('Get job status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get job status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
