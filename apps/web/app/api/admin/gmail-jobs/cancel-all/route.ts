/**
 * Admin API to cancel all running/queued Gmail sync jobs
 * POST /api/admin/gmail-jobs/cancel-all
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const result = await prisma.ingestJob.updateMany({
      where: {
        sourceName: 'gmail',
        status: { in: ['queued', 'running'] },
      },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
        error: 'Cancelled by admin - clearing stuck jobs',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Cancelled ${result.count} Gmail sync jobs`,
      count: result.count,
    });
  } catch (error) {
    console.error('Error cancelling jobs:', error);
    return NextResponse.json(
      {
        error: 'Failed to cancel jobs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
