/**
 * Cron Job for LinkedIn Archive Processing
 * Runs every minute to check for pending jobs and process them
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LinkedInArchiveParser } from '@wig/adapters';
import { LinkedInRelationshipScorer } from '@wig/core';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export const maxDuration = 300; // 5 minutes max

export async function GET() {
  console.log('[Cron] Checking for pending LinkedIn jobs...');

  // Find oldest pending job (queued or stuck in running state for >5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const job = await prisma.ingestJob.findFirst({
    where: {
      sourceName: 'linkedin_archive',
      status: { in: ['queued', 'running'] },
      completedAt: null,
      OR: [
        { status: 'queued' }, // Process all queued jobs immediately
        { status: 'running', startedAt: { lt: fiveMinutesAgo } }, // Only process running jobs stuck for >5 min
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!job) {
    console.log('[Cron] No pending jobs found');
    return NextResponse.json({ message: 'No pending jobs' });
  }

  console.log(`[Cron] Processing job: ${job.id} (status: ${job.status})`);

  let tempFilePath: string | null = null;

  try {
    // Reset job to running state (in case it was stuck)
    await prisma.ingestJob.update({
      where: { id: job.id },
      data: {
        status: 'running',
        startedAt: new Date(),
        logs: '[Cron] Starting processing...',
      },
    });

    // Step 1: Get blob URL
    const fileMetadata = job.fileMetadata as any;
    const blobUrl = fileMetadata?.blobUrl;

    if (!blobUrl) {
      throw new Error('Blob URL not found in job metadata');
    }

    await prisma.ingestJob.update({
      where: { id: job.id },
      data: { progress: 5, logs: 'Downloading file from storage...' },
    });

    // Step 2: Download from blob
    console.log(`[Cron] Downloading from blob: ${blobUrl}`);
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Step 3: Save to temp file
    tempFilePath = join(tmpdir(), `linkedin-archive-${job.id}.zip`);
    await writeFile(tempFilePath, buffer);
    console.log(`[Cron] File downloaded to: ${tempFilePath}`);

    await prisma.ingestJob.update({
      where: { id: job.id },
      data: { progress: 10, logs: 'File downloaded, starting extraction...' },
    });

    // Step 4: Parse archive
    console.log(`[Cron] Starting parse`);
    const parser = new LinkedInArchiveParser(
      prisma,
      job.userId,
      (progress) => {
        prisma.ingestJob.update({
          where: { id: job.id },
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
    console.log(`[Cron] Parse complete:`, {
      connections: result.connectionsProcessed,
      messages: result.messagesProcessed,
      errors: result.errors.length,
    });

    // Step 5: Re-score relationships
    await prisma.ingestJob.update({
      where: { id: job.id },
      data: { progress: 85, logs: 'Scoring relationship strengths...' },
    });

    const scorer = new LinkedInRelationshipScorer(prisma);
    const rescoredCount = await scorer.rescorePersonEdges(job.userId);
    console.log(`[Cron] Rescored ${rescoredCount} edges`);

    // Step 6: Complete job
    await prisma.ingestJob.update({
      where: { id: job.id },
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

    console.log(`[Cron] Job ${job.id} completed successfully`);

    // Clean up temp file
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
        console.log(`[Cron] Temp file cleaned up`);
      } catch (unlinkError) {
        console.error('Failed to delete temp file:', unlinkError);
      }
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      result: {
        connectionsProcessed: result.connectionsProcessed,
        messagesProcessed: result.messagesProcessed,
        edgesRescored: rescoredCount,
      },
    });
  } catch (error) {
    console.error(`[Cron] Processing error:`, error);

    // Clean up temp file on error
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch (unlinkError) {
        console.error('Failed to delete temp file on error:', unlinkError);
      }
    }

    // Update job to failed state
    await prisma.ingestJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        error: error instanceof Error ? error.message : 'Processing failed',
        logs: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
    });

    return NextResponse.json(
      {
        error: 'Processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
