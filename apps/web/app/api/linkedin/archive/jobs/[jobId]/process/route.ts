/**
 * LinkedIn Archive Job Processing API
 * POST /api/linkedin/archive/jobs/:jobId/process
 *
 * Triggers async processing of uploaded LinkedIn archive
 * Extracts ZIP, parses CSV files, creates evidence events
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LinkedInArchiveParser } from '@wig/adapters';

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
 * Process archive asynchronously using LinkedInArchiveParser
 */
async function processArchiveAsync(jobId: string) {
  try {
    // Get job to retrieve file path
    const job = await prisma.ingestJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error('Job not found');
    }

    const fileMetadata = job.fileMetadata as any;
    const filePath = fileMetadata?.storagePath;

    if (!filePath) {
      throw new Error('File path not found in job metadata');
    }

    // Create parser with progress callback
    const parser = new LinkedInArchiveParser(
      prisma,
      job.userId,
      (progress) => {
        // Update job progress
        prisma.ingestJob.update({
          where: { id: jobId },
          data: {
            progress: progress.progress,
            logs: progress.message,
          },
        }).catch((err) => {
          console.error('Failed to update progress:', err);
        });
      }
    );

    // Parse the archive
    const result = await parser.parseArchive(filePath);

    // Complete job with results
    await prisma.ingestJob.update({
      where: { id: jobId },
      data: {
        status: result.errors.length > 0 ? 'completed' : 'completed', // Always complete, but log errors
        completedAt: new Date(),
        progress: 100,
        resultMetadata: {
          connectionsProcessed: result.connectionsProcessed,
          messagesProcessed: result.messagesProcessed,
          evidenceEventsCreated: result.evidenceEventsCreated,
          newPersonsAdded: result.newPersonsAdded,
          errors: result.errors,
        },
        logs: result.errors.length > 0
          ? `Completed with ${result.errors.length} errors`
          : 'Completed successfully',
      },
    });
  } catch (error) {
    throw error;
  }
}
