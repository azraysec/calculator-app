/**
 * Vercel Queue Consumer for LinkedIn Archive Processing
 * Processes LinkedIn archives without serverless timeout limits
 */

import { handleCallback } from '@vercel/queue';
import { prisma } from '@/lib/prisma';
import { LinkedInArchiveParser } from '@wig/adapters';
import { LinkedInRelationshipScorer } from '@wig/core';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export const maxDuration = 300; // 5 minutes max

export const POST = handleCallback({
  'linkedin-process': {
    'default': async (message: { jobId: string }) => {
      const { jobId } = message;

      if (!jobId) {
        throw new Error('Missing jobId');
      }

      console.log(`[Queue Consumer] Processing job: ${jobId}`);

      let tempFilePath: string | null = null;

      try {
      // Step 1: Get job and blob URL
      const job = await prisma.ingestJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error('Job not found');
      }

      const fileMetadata = job.fileMetadata as any;
      const blobUrl = fileMetadata?.blobUrl;

      if (!blobUrl) {
        throw new Error('Blob URL not found in job metadata');
      }

      await prisma.ingestJob.update({
        where: { id: jobId },
        data: { progress: 5, logs: 'Downloading file from storage...' },
      });

      // Step 2: Download from blob
      console.log(`[Queue Consumer] Downloading from blob: ${blobUrl}`);
      const response = await fetch(blobUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Step 3: Save to temp file
      tempFilePath = join(tmpdir(), `linkedin-archive-${jobId}.zip`);
      await writeFile(tempFilePath, buffer);
      console.log(`[Queue Consumer] File downloaded to: ${tempFilePath}`);

      await prisma.ingestJob.update({
        where: { id: jobId },
        data: { progress: 10, logs: 'File downloaded, starting extraction...' },
      });

      // Step 4: Parse archive
      console.log(`[Queue Consumer] Starting parse`);
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
      console.log(`[Queue Consumer] Parse complete:`, {
        connections: result.connectionsProcessed,
        messages: result.messagesProcessed,
        errors: result.errors.length,
      });

      // Step 5: Re-score relationships
      await prisma.ingestJob.update({
        where: { id: jobId },
        data: { progress: 85, logs: 'Scoring relationship strengths...' },
      });

      const scorer = new LinkedInRelationshipScorer(prisma);
      const rescoredCount = await scorer.rescorePersonEdges(job.userId);
      console.log(`[Queue Consumer] Rescored ${rescoredCount} edges`);

      // Step 6: Complete job
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

      console.log(`[Queue Consumer] Job ${jobId} completed successfully`);

      // Clean up temp file
      if (tempFilePath) {
        try {
          await unlink(tempFilePath);
          console.log(`[Queue Consumer] Temp file cleaned up`);
        } catch (unlinkError) {
          console.error('Failed to delete temp file:', unlinkError);
        }
      }
    } catch (error) {
      console.error(`[Queue Consumer] Processing error:`, error);

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
        where: { id: jobId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          error: error instanceof Error ? error.message : 'Processing failed',
          logs: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      });

      throw error;
    }
    },
  },
});
