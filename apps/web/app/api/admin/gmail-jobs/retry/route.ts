/**
 * Admin API to retry stuck Gmail sync jobs
 * POST /api/admin/gmail-jobs/retry - Reset stuck jobs and trigger new sync
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { inngest } from '@/lib/event-bus';

export async function POST() {
  try {
    // Find stuck jobs (queued or running for more than 1 hour)
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
