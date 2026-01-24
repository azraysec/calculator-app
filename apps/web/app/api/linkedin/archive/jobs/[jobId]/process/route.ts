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
  request: NextRequest,
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

    // Update job status to running
    await prisma.ingestJob.update({
      where: { id: jobId },
      data: {
        status: 'running',
        startedAt: new Date(),
        progress: 0,
      },
    });

    // Process archive asynchronously
    // For now, we'll do a simple simulation
    // In production, this would trigger a background job (Inngest, queue, etc.)
    processArchiveAsync(jobId).catch((error) => {
      console.error('Archive processing failed:', error);
      prisma.ingestJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          error: error instanceof Error ? error.message : 'Processing failed',
        },
      });
    });

    return NextResponse.json({
      jobId,
      status: 'running',
      message: 'Processing started',
    });
  } catch (error) {
    console.error('Start job processing error:', error);
    return NextResponse.json(
      {
        error: 'Failed to start processing',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Process archive asynchronously
 * This is a placeholder - will be replaced with actual parser in Task #5
 */
async function processArchiveAsync(jobId: string) {
  try {
    // Simulate processing steps
    const steps = [
      { name: 'Extracting archive', progress: 20 },
      { name: 'Parsing Connections.csv', progress: 40 },
      { name: 'Parsing messages.csv', progress: 60 },
      { name: 'Creating evidence events', progress: 80 },
      { name: 'Updating relationship scores', progress: 90 },
      { name: 'Finalizing', progress: 100 },
    ];

    for (const step of steps) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate work

      await prisma.ingestJob.update({
        where: { id: jobId },
        data: {
          progress: step.progress,
          logs: `${step.name}...`,
        },
      });
    }

    // Complete job
    await prisma.ingestJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        progress: 100,
        resultMetadata: {
          connectionsProcessed: 0, // Placeholder - will be real counts
          messagesProcessed: 0,
          evidenceEventsCreated: 0,
          newPersonsAdded: 0,
        },
      },
    });
  } catch (error) {
    throw error;
  }
}
