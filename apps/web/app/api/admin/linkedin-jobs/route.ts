/**
 * Admin API to check and manage LinkedIn archive jobs
 * GET /api/admin/linkedin-jobs - List all jobs
 * POST /api/admin/linkedin-jobs - Reset stuck jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const jobs = await prisma.ingestJob.findMany({
      where: { sourceName: 'linkedin_archive' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        progress: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        error: true,
        logs: true,
        fileMetadata: true,
      },
    });

    const now = Date.now();
    const jobsWithInfo = jobs.map(job => {
      const createdAgo = Math.round((now - job.createdAt.getTime()) / 1000 / 60);
      const isStuck = (job.status === 'queued' || job.status === 'running') &&
                     !job.completedAt &&
                     createdAgo > 10; // Stuck for more than 10 minutes

      const fileMetadata = job.fileMetadata as any;

      return {
        id: job.id,
        status: job.status,
        progress: job.progress,
        fileName: fileMetadata?.fileName || 'unknown',
        createdAgo: `${createdAgo} minutes ago`,
        isStuck,
        error: job.error,
        lastLog: job.logs?.substring(0, 200),
      };
    });

    const stuckCount = jobsWithInfo.filter(j => j.isStuck).length;

    return NextResponse.json({
      total: jobs.length,
      stuckCount,
      jobs: jobsWithInfo,
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, jobId } = await request.json();

    if (action === 'reset') {
      // Reset a specific job or all stuck jobs
      if (jobId) {
        await prisma.ingestJob.update({
          where: { id: jobId },
          data: {
            status: 'queued',
            startedAt: null,
            error: null,
            logs: 'Reset by admin',
          },
        });
        return NextResponse.json({ message: `Job ${jobId} reset to queued` });
      } else {
        // Reset all stuck jobs (queued/running for >10 min)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const result = await prisma.ingestJob.updateMany({
          where: {
            sourceName: 'linkedin_archive',
            status: { in: ['queued', 'running'] },
            createdAt: { lt: tenMinutesAgo },
            completedAt: null,
          },
          data: {
            status: 'queued',
            startedAt: null,
            error: null,
            logs: 'Reset by admin - stuck job',
          },
        });
        return NextResponse.json({ message: `Reset ${result.count} stuck jobs` });
      }
    }

    if (action === 'cancel') {
      if (!jobId) {
        return NextResponse.json({ error: 'jobId required for cancel action' }, { status: 400 });
      }
      await prisma.ingestJob.update({
        where: { id: jobId },
        data: {
          status: 'cancelled',
          completedAt: new Date(),
          error: 'Cancelled by admin',
        },
      });
      return NextResponse.json({ message: `Job ${jobId} cancelled` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error managing jobs:', error);
    return NextResponse.json(
      { error: 'Failed to manage jobs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
