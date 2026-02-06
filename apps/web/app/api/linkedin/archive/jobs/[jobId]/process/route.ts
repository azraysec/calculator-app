/**
 * LinkedIn Archive Job Processing API
 * POST /api/linkedin/archive/jobs/:jobId/process
 *
 * Processes uploaded LinkedIn archive inline with 5-minute timeout
 * Extracts ZIP, parses CSV files, creates evidence events
 * SECURITY: Requires authentication and verifies job ownership
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LinkedInArchiveParser } from '@wig/adapters';
import { LinkedInRelationshipScorer } from '@wig/core';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { withAuth } from '@/lib/auth-helpers';

export const maxDuration = 300; // 5 minutes max

export const POST = withAuth(async (
  _request: Request,
  { userId, params }
) => {
  const { jobId } = await params;
  let tempFilePath: string | null = null;

  try {
    // CRITICAL: Filter by userId for multi-tenant isolation
    const job = await prisma.ingestJob.findFirst({
      where: {
        id: jobId,
        userId, // Only allow processing jobs belonging to authenticated user
      },
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

    // Parse archive - use authenticated userId (already verified via job ownership)
    console.log(`[Process] Starting parse for user: ${userId}`);

    const parser = new LinkedInArchiveParser(
      prisma,
      userId,
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
    const rescoredCount = await scorer.rescorePersonEdges(userId);
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

    // Update DataSourceConnection to show LinkedIn as connected
    await prisma.dataSourceConnection.upsert({
      where: {
        userId_sourceType: {
          userId,
          sourceType: 'LINKEDIN',
        },
      },
      update: {
        connectionStatus: 'CONNECTED',
        lastSyncedAt: new Date(),
        metadata: {
          lastImport: {
            jobId,
            connectionsProcessed: result.connectionsProcessed,
            messagesProcessed: result.messagesProcessed,
            completedAt: new Date().toISOString(),
          },
        },
      },
      create: {
        userId,
        sourceType: 'LINKEDIN',
        connectionStatus: 'CONNECTED',
        privacyLevel: 'PRIVATE',
        lastSyncedAt: new Date(),
        metadata: {
          lastImport: {
            jobId,
            connectionsProcessed: result.connectionsProcessed,
            messagesProcessed: result.messagesProcessed,
            completedAt: new Date().toISOString(),
          },
        },
      },
    });
    console.log(`[Process] DataSourceConnection updated for LinkedIn`);

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
      },
      { status: 500 }
    );
  }
});
