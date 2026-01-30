/**
 * Debug endpoint for LinkedIn message processing
 * GET /api/debug/linkedin - Check status of LinkedIn jobs and evidence
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get recent LinkedIn jobs
    const recentJobs = await prisma.ingestJob.findMany({
      where: { sourceName: 'linkedin_archive' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        status: true,
        progress: true,
        resultMetadata: true,
        error: true,
        logs: true,
        createdAt: true,
        completedAt: true,
      },
    });

    // Count evidence events
    const evidenceCount = await prisma.evidenceEvent.count();

    // Count evidence by type
    const evidenceByType = await prisma.evidenceEvent.groupBy({
      by: ['type'],
      _count: { id: true },
    });

    // Count conversations and messages
    const conversationCount = await prisma.conversation.count();
    const messageCount = await prisma.message.count();

    // Get sample evidence events
    const sampleEvidence = await prisma.evidenceEvent.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10,
      select: {
        id: true,
        type: true,
        source: true,
        timestamp: true,
        subjectPersonId: true,
        objectPersonId: true,
      },
    });

    return NextResponse.json({
      recentJobs: recentJobs.map((job) => ({
        id: job.id,
        status: job.status,
        progress: job.progress,
        result: job.resultMetadata as any,
        error: job.error,
        logs: job.logs,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      })),
      evidenceCounts: {
        total: evidenceCount,
        byType: evidenceByType.map((g) => ({
          type: g.type,
          count: g._count.id,
        })),
      },
      conversationCount,
      messageCount,
      sampleEvidence,
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
