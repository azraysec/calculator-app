/**
 * Gmail Sync API
 * POST /api/gmail/sync - Start a full Gmail sync
 * GET /api/gmail/sync - Get current sync status
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@wig/db';
import { inngest } from '@/lib/event-bus';

/**
 * Start a new Gmail sync job
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if user has Gmail connected
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleRefreshToken: true,
        email: true,
      },
    });

    if (!user?.googleRefreshToken) {
      return NextResponse.json(
        { error: 'Gmail not connected. Please connect Gmail first.' },
        { status: 400 }
      );
    }

    // Check if there's already a running sync job
    const existingJob = await prisma.ingestJob.findFirst({
      where: {
        userId,
        sourceName: 'gmail',
        status: { in: ['queued', 'running'] },
      },
    });

    if (existingJob) {
      return NextResponse.json({
        success: true,
        message: 'Sync already in progress',
        job: {
          id: existingJob.id,
          status: existingJob.status,
          progress: existingJob.progress,
          logs: existingJob.logs,
        },
      });
    }

    // Parse request body for options
    let fullSync = false;
    try {
      const body = await request.json();
      fullSync = body?.fullSync === true;
    } catch {
      // No body or invalid JSON - use defaults
    }

    // Create new ingest job
    const job = await prisma.ingestJob.create({
      data: {
        userId,
        sourceName: 'gmail',
        status: 'queued',
        progress: 0,
        logs: 'Sync queued, starting soon...',
      },
    });

    // Trigger Inngest function
    try {
      console.log('[Gmail Sync API] Sending event to Inngest:', { jobId: job.id, userId, fullSync });
      const eventResult = await inngest.send({
        name: 'gmail.sync.start',
        data: {
          jobId: job.id,
          userId,
          fullSync,
        },
      });
      console.log('[Gmail Sync API] Inngest event sent:', eventResult);
    } catch (inngestError) {
      console.error('[Gmail Sync API] Failed to send Inngest event:', inngestError);
      // Update job to failed state
      await prisma.ingestJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          error: `Failed to queue sync: ${inngestError instanceof Error ? inngestError.message : 'Unknown error'}`,
        },
      });
      throw inngestError;
    }

    return NextResponse.json({
      success: true,
      message: fullSync ? 'Full Gmail sync started' : 'Gmail sync started',
      job: {
        id: job.id,
        status: job.status,
        progress: job.progress,
      },
    });
  } catch (error) {
    console.error('[Gmail Sync API] Error starting sync:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start sync' },
      { status: 500 }
    );
  }
}

/**
 * Get current sync status
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get the most recent Gmail sync job
    const job = await prisma.ingestJob.findFirst({
      where: {
        userId,
        sourceName: 'gmail',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!job) {
      return NextResponse.json({
        syncing: false,
        lastSync: null,
        job: null,
      });
    }

    const isSyncing = job.status === 'queued' || job.status === 'running';

    return NextResponse.json({
      syncing: isSyncing,
      lastSync: job.completedAt,
      job: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        logs: job.logs,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        error: job.error,
        result: job.resultMetadata,
      },
    });
  } catch (error) {
    console.error('[Gmail Sync API] Error getting status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
