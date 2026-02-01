/**
 * LinkedIn Archive Upload History API
 * GET /api/linkedin/archive/history
 *
 * Returns history of LinkedIn archive uploads for the authenticated user
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth-helpers';

export const GET = withAuth(async (_request: Request, { userId }) => {
  try {
    // Filter by userId for multi-tenant isolation
    const jobs = await prisma.ingestJob.findMany({
      where: {
        userId,
        sourceName: 'linkedin_archive',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
      select: {
        id: true,
        userId: true,
        status: true,
        progress: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        error: true,
        fileMetadata: true,
        resultMetadata: true,
      },
    });

    const history = jobs.map(job => {
      const fileMetadata = job.fileMetadata as any;
      const resultMetadata = job.resultMetadata as any;

      const duration = job.startedAt && job.completedAt
        ? (new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000
        : null;

      return {
        id: job.id,
        status: job.status,
        uploadedAt: job.createdAt,
        completedAt: job.completedAt,
        duration: duration ? `${duration.toFixed(1)}s` : null,
        fileName: fileMetadata?.fileName || 'Unknown',
        fileSize: fileMetadata?.fileSize
          ? `${(fileMetadata.fileSize / 1024 / 1024).toFixed(2)} MB`
          : 'Unknown',
        stats: {
          connectionsProcessed: resultMetadata?.connectionsProcessed || 0,
          newConnectionsAdded: resultMetadata?.newConnectionsAdded || 0,
          existingConnectionsUpdated: resultMetadata?.existingConnectionsUpdated || 0,
          messagesProcessed: resultMetadata?.messagesProcessed || 0,
          newMessagesAdded: resultMetadata?.newMessagesAdded || 0,
          newPersonsAdded: resultMetadata?.newPersonsAdded || 0,
          evidenceEventsCreated: resultMetadata?.evidenceEventsCreated || 0,
          edgesRescored: resultMetadata?.edgesRescored || 0,
        },
        errors: resultMetadata?.errors || [],
        error: job.error,
      };
    });

    // Calculate aggregate statistics
    const aggregate = {
      totalUploads: jobs.length,
      successful: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      totalConnections: history.reduce((sum, h) => sum + h.stats.connectionsProcessed, 0),
      totalMessages: history.reduce((sum, h) => sum + h.stats.messagesProcessed, 0),
      totalNewPersons: history.reduce((sum, h) => sum + h.stats.newPersonsAdded, 0),
    };

    return NextResponse.json({
      history,
      aggregate,
    });
  } catch (error) {
    console.error('Error fetching upload history:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch upload history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
