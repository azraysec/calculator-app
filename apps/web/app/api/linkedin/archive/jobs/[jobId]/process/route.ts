/**
 * LinkedIn Archive Job Processing API
 * POST /api/linkedin/archive/jobs/:jobId/process
 *
 * Triggers async processing of uploaded LinkedIn archive
 * Extracts ZIP, parses CSV files, creates evidence events
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    // Get job record
    const job = await prisma.ingestJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    if (job.status !== 'queued') {
      return NextResponse.json(
        { error: `Job is already ${job.status}` },
        { status: 400 }
      );
    }

    // Update job status to running - cron job will pick it up
    await prisma.ingestJob.update({
      where: { id: jobId },
      data: {
        status: 'running',
        startedAt: new Date(),
        progress: 0,
        logs: 'Job queued for processing...',
      },
    });

    return NextResponse.json({
      jobId,
      status: 'running',
      message: 'Processing will start within 1 minute via cron job',
    });
  } catch (error) {
    console.error('Start job processing error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');

    // Update job to failed state
    try {
      await prisma.ingestJob.update({
        where: { id: (await params).jobId },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      });
    } catch (updateError) {
      console.error('Failed to update job status:', updateError);
    }

    return NextResponse.json(
      {
        error: 'Failed to start processing',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
