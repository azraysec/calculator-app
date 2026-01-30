/**
 * LinkedIn Archive Job Processing API
 * POST /api/linkedin/archive/jobs/:jobId/process
 *
 * Processes uploaded LinkedIn archive inline with 5-minute timeout
 * Extracts ZIP, parses CSV files, creates evidence events
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LinkedInArchiveParser } from '@wig/adapters';
import { LinkedInRelationshipScorer } from '@wig/core';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export const maxDuration = 300; // 5 minutes max

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  let tempFilePath: string | null = null;

  try {
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
        logs: 'Starting processing...',
      },
    });

    // Get blob URL
    const fileMetadata = job.fileMetadata as any;
    const blobUrl = fileMetadata?.blobUrl;

    if (!blobUrl) {
      throw new Error('Blob URL not found in job metadata');
    }

    await prisma.ingestJob.update({
      where: { id: jobId },
      data: { progress: 5, logs: 'Downloading file from storage...' },
    });

    // Download from blob
    console.log(`[Process] Downloading from blob: ${blobUrl}`);
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to temp file
    tempFilePath = join(tmpdir(), `linkedin-archive-${jobId}.zip`);
    await writeFile(tempFilePath, buffer);
    console.log(`[Process] File downloaded to: ${tempFilePath}`);

    await prisma.ingestJob.update({
      where: { id: jobId },
      data: { progress: 10, logs: 'File downloaded, starting extraction...' },
    });

    // Parse archive
    console.log(`[Process] Starting parse`);

    if (!job.userId) {
      throw new Error('IngestJob missing userId - cannot process');
    }

    const parser = new LinkedInArchiveParser(
      prisma,
      job.userId,
      (progress) => {
        prisma.ingestJob.update({
          where: { id: jobId },
          data: {
            progress: 10 + (progress.progress * 0.7), // 10-80%
            logs: progress.message,
          },
        }).catch((err) => {
          console.error('Failed to update progress:', err);
        });
      }
    );

    const result = await parser.parseArchive(tempFilePath);
    console.log(`[Process] Parse complete:`, {
      connections: result.connectionsProcessed,
      messages: result.messagesProcessed,
      errors: result.errors.length,
    });

    // Re-score relationships
    await prisma.ingestJob.update({
      where: { id: jobId },
      data: { progress: 85, logs: 'Scoring relationship strengths...' },
    });

    const scorer = new LinkedInRelationshipScorer(prisma);
    const rescoredCount = await scorer.rescorePersonEdges(job.userId);
    console.log(`[Process] Rescored ${rescoredCount} edges`);

    // Complete job
    await prisma.ingestJob.update({
      where: { id: jobId },
      data: {
        status: result.errors.length > 0 ? 'completed' : 'completed',
        completedAt: new Date(),
        progress: 100,
        resultMetadata: {
          connectionsProcessed: result.connectionsProcessed,
          messagesProcessed: result.messagesProcessed,
          evidenceEventsCreated: result.evidenceEventsCreated,
          newPersonsAdded: result.newPersonsAdded,
          edgesRescored: rescoredCount,
          errors: result.errors,
        },
        logs: result.errors.length > 0
          ? `Completed with ${result.errors.length} errors`
          : 'Completed successfully',
      },
    });

    console.log(`[Process] Job ${jobId} completed successfully`);

    // Clean up temp file
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
        console.log(`[Process] Temp file cleaned up`);
      } catch (unlinkError) {
        console.error('Failed to delete temp file:', unlinkError);
      }
    }

    return NextResponse.json({
      jobId,
      status: 'completed',
      message: 'Processing completed successfully',
      result: {
        connectionsProcessed: result.connectionsProcessed,
        messagesProcessed: result.messagesProcessed,
        edgesRescored: rescoredCount,
      },
    });
  } catch (error) {
    console.error('[Process] Processing error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');

    // Clean up temp file on error
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch (unlinkError) {
        console.error('Failed to delete temp file on error:', unlinkError);
      }
    }

    // Update job to failed state
    try {
      await prisma.ingestJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
          logs: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      });
    } catch (updateError) {
      console.error('Failed to update job status:', updateError);
    }

    return NextResponse.json(
      {
        error: 'Processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
