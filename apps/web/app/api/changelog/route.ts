/**
 * Changelog API
 * GET /api/changelog - Fetch all changelog entries
 * POST /api/changelog - Create new changelog entry
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@wig/db';

export async function GET() {
  try {
    const entries = await prisma.changelogEntry.findMany({
      orderBy: [
        { status: 'asc' }, // In Progress first, then Done
        { priority: 'asc' }, // Critical first
        { dateAdded: 'desc' }, // Newest first
      ],
    });

    // Transform to match frontend Requirement interface
    const transformed = entries.map((entry) => ({
      id: entry.entryId,
      requirement: entry.requirement,
      priority: entry.priority.charAt(0).toUpperCase() + entry.priority.slice(1) as 'Critical' | 'High' | 'Medium' | 'Low',
      status: formatStatus(entry.status),
      category: entry.category,
      notes: entry.notes || undefined,
      dateAdded: entry.dateAdded.toISOString().split('T')[0],
      dateStarted: entry.dateStarted ? entry.dateStarted.toISOString().split('T')[0] : undefined,
      dateCompleted: entry.dateCompleted ? entry.dateCompleted.toISOString().split('T')[0] : undefined,
      version: entry.version || undefined,
      githubIssueNumber: entry.githubIssueNumber || undefined,
      githubIssueUrl: entry.githubIssueUrl || undefined,
    }));

    return NextResponse.json({ entries: transformed });
  } catch (error) {
    console.error('Error fetching changelog:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      entryId,
      requirement,
      priority,
      status,
      category,
      notes,
      dateAdded,
      dateStarted,
      dateCompleted,
      version,
      githubIssueNumber,
      githubIssueUrl,
    } = body;

    // Validate required fields
    if (!entryId || !requirement || !priority || !status || !category || !dateAdded) {
      return NextResponse.json(
        { error: 'Missing required fields: entryId, requirement, priority, status, category, dateAdded' },
        { status: 400 }
      );
    }

    // Normalize enums to lowercase for Prisma
    const normalizedPriority = priority.toLowerCase() as 'critical' | 'high' | 'medium' | 'low';
    const normalizedStatus = formatStatusForDb(status);

    // Create changelog entry
    const entry = await prisma.changelogEntry.create({
      data: {
        entryId,
        requirement,
        priority: normalizedPriority,
        status: normalizedStatus,
        category,
        notes: notes || null,
        dateAdded: new Date(dateAdded),
        dateStarted: dateStarted ? new Date(dateStarted) : null,
        dateCompleted: dateCompleted ? new Date(dateCompleted) : null,
        version: version || null,
        githubIssueNumber: githubIssueNumber || null,
        githubIssueUrl: githubIssueUrl || null,
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error('Error creating changelog entry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions to map between frontend and database status formats
function formatStatus(dbStatus: string): 'Planned' | 'In Progress' | 'In Review' | 'Done' | 'Blocked' | 'On Hold' {
  switch (dbStatus) {
    case 'planned':
      return 'Planned';
    case 'in_progress':
      return 'In Progress';
    case 'in_review':
      return 'In Review';
    case 'done':
      return 'Done';
    case 'blocked':
      return 'Blocked';
    case 'on_hold':
      return 'On Hold';
    default:
      return 'Planned';
  }
}

function formatStatusForDb(frontendStatus: string): 'planned' | 'in_progress' | 'in_review' | 'done' | 'blocked' | 'on_hold' {
  switch (frontendStatus) {
    case 'Planned':
      return 'planned';
    case 'In Progress':
      return 'in_progress';
    case 'In Review':
      return 'in_review';
    case 'Done':
      return 'done';
    case 'Blocked':
      return 'blocked';
    case 'On Hold':
      return 'on_hold';
    default:
      return 'planned';
  }
}
