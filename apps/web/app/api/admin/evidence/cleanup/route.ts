/**
 * Admin API to cleanup duplicate evidence events
 * POST /api/admin/evidence/cleanup - Deduplicate evidence events
 * GET /api/admin/evidence/cleanup - Preview duplicates without deleting
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface DuplicateGroup {
  userId: string;
  subjectPersonId: string;
  objectPersonId: string | null;
  type: string;
  source: string;
  timestamp: Date;
  count: number;
  ids: string[];
}

/**
 * Find duplicate evidence events
 */
async function findDuplicates(): Promise<DuplicateGroup[]> {
  // Find all evidence events grouped by deduplication key
  const evidence = await prisma.evidenceEvent.findMany({
    select: {
      id: true,
      userId: true,
      subjectPersonId: true,
      objectPersonId: true,
      type: true,
      source: true,
      timestamp: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc', // Keep oldest one
    },
  });

  // Group by deduplication key
  const groups = new Map<string, DuplicateGroup>();

  for (const event of evidence) {
    const key = [
      event.userId,
      event.subjectPersonId,
      event.objectPersonId || 'null',
      event.type,
      event.source,
      event.timestamp.toISOString(),
    ].join('|');

    if (groups.has(key)) {
      const group = groups.get(key)!;
      group.count++;
      group.ids.push(event.id);
    } else {
      groups.set(key, {
        userId: event.userId,
        subjectPersonId: event.subjectPersonId,
        objectPersonId: event.objectPersonId,
        type: event.type,
        source: event.source,
        timestamp: event.timestamp,
        count: 1,
        ids: [event.id],
      });
    }
  }

  // Return only groups with duplicates (count > 1)
  return Array.from(groups.values()).filter((g) => g.count > 1);
}

/**
 * GET - Preview duplicates without deleting
 */
export async function GET() {
  try {
    const duplicates = await findDuplicates();

    const totalDuplicates = duplicates.reduce((sum, g) => sum + g.count - 1, 0);
    const totalGroups = duplicates.length;

    return NextResponse.json({
      message: `Found ${totalDuplicates} duplicate evidence events across ${totalGroups} groups`,
      totalDuplicates,
      totalGroups,
      groups: duplicates.slice(0, 50).map((g) => ({
        type: g.type,
        source: g.source,
        count: g.count,
        duplicatesToRemove: g.count - 1,
        sampleIds: g.ids.slice(0, 3),
      })),
    });
  } catch (error) {
    console.error('Error finding duplicates:', error);
    return NextResponse.json(
      {
        error: 'Failed to find duplicates',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Delete duplicate evidence events (keeps oldest)
 */
export async function POST() {
  try {
    const duplicates = await findDuplicates();

    if (duplicates.length === 0) {
      return NextResponse.json({
        message: 'No duplicate evidence events found',
        deletedCount: 0,
      });
    }

    // Collect IDs to delete (all but the first/oldest in each group)
    const idsToDelete: string[] = [];
    for (const group of duplicates) {
      // Keep the first one (oldest), delete the rest
      idsToDelete.push(...group.ids.slice(1));
    }

    // Delete in batches
    const batchSize = 100;
    let totalDeleted = 0;

    for (let i = 0; i < idsToDelete.length; i += batchSize) {
      const batch = idsToDelete.slice(i, i + batchSize);
      const result = await prisma.evidenceEvent.deleteMany({
        where: {
          id: { in: batch },
        },
      });
      totalDeleted += result.count;
    }

    return NextResponse.json({
      message: `Successfully deleted ${totalDeleted} duplicate evidence events`,
      deletedCount: totalDeleted,
      groupsCleaned: duplicates.length,
    });
  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    return NextResponse.json(
      {
        error: 'Failed to cleanup duplicates',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
