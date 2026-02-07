/**
 * Admin API to retry stuck Gmail sync jobs
 * POST /api/admin/gmail-jobs/retry - Reset stuck jobs and trigger new sync
 * POST /api/admin/gmail-jobs/retry?userId=xxx - Trigger sync for specific user
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { inngest } from '@/lib/event-bus';

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const specificUserId = url.searchParams.get('userId');

    // If specific user requested, just create a job for them
    if (specificUserId) {
      const user = await prisma.user.findUnique({
        where: { id: specificUserId },
        select: { googleRefreshToken: true, email: true },
      });

      if (!user?.googleRefreshToken) {
        return NextResponse.json({ error: 'User not found or Gmail not connected' }, { status: 400 });
      }

      // Cancel any existing queued/running jobs for this user
      await prisma.ingestJob.updateMany({
        where: {
          userId: specificUserId,
          sourceName: 'gmail',
          status: { in: ['queued', 'running'] },
        },
        data: {
          status: 'cancelled',
          completedAt: new Date(),
          error: 'Cancelled by admin to create new job',
        },
      });

      // Create new job
      const job = await prisma.ingestJob.create({
        data: {
          userId: specificUserId,
          sourceName: 'gmail',
          status: 'queued',
          progress: 0,
          logs: 'Manual sync triggered by admin...',
        },
      });

      // Send Inngest event
      const eventResult = await inngest.send({
        name: 'gmail.sync.start',
        data: {
          jobId: job.id,
          userId: specificUserId,
          fullSync: false,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Created new sync job for ${user.email}`,
        jobId: job.id,
        inngestEventId: eventResult.ids[0],
      });
    }

    // Otherwise, find and retry stuck jobs (queued or running for more than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const stuckJobs = await prisma.ingestJob.findMany({
      where: {
        sourceName: 'gmail',
        status: { in: ['queued', 'running'] },
        createdAt: { lt: oneHourAgo },
      },
    });

    // Mark them as failed
    const failedIds = [];
    for (const job of stuckJobs) {
      await prisma.ingestJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          error: 'Job timed out after 1 hour - marked as failed by admin',
          completedAt: new Date(),
        },
      });
      failedIds.push(job.id);
    }

    // Get unique users who had stuck jobs
    const userIds = [...new Set(stuckJobs.map((j) => j.userId).filter(Boolean))];

    // Create new jobs and trigger Inngest for each user
    const newJobs = [];
    for (const userId of userIds) {
      if (!userId) continue;

      // Check user has Gmail connected
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { googleRefreshToken: true, email: true },
      });

      if (!user?.googleRefreshToken) {
        continue;
      }

      // Create new job
      const job = await prisma.ingestJob.create({
        data: {
          userId,
          sourceName: 'gmail',
          status: 'queued',
          progress: 0,
          logs: 'Retry sync queued...',
        },
      });

      // Send Inngest event
      try {
        await inngest.send({
          name: 'gmail.sync.start',
          data: {
            jobId: job.id,
            userId,
            fullSync: false,
          },
        });

        newJobs.push({
          id: job.id,
          userId,
          userEmail: user.email,
        });
      } catch (inngestError) {
        // Mark job as failed if Inngest fails
        await prisma.ingestJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            error: `Inngest error: ${inngestError instanceof Error ? inngestError.message : 'Unknown'}`,
          },
        });
      }
    }

    return NextResponse.json({
      message: `Reset ${failedIds.length} stuck jobs, created ${newJobs.length} new sync jobs`,
      stuckJobsReset: failedIds,
      newJobsCreated: newJobs,
    });
  } catch (error) {
    console.error('Error retrying Gmail jobs:', error);
    return NextResponse.json(
      {
        error: 'Failed to retry Gmail jobs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
