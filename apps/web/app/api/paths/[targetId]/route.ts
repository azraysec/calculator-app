/**
 * Warm Intro Paths API
 * GET /api/paths/[targetId]?maxHops=3&maxPaths=5
 *
 * Finds warm introduction paths from the authenticated user's "me" node
 * to the specified target person.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Pathfinder } from '@wig/core';

// UUID v4 validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const GET = withAuth(async (request: Request, { userId, params }) => {
  try {
    // Extract targetId from params
    const { targetId } = await params;

    // Validate targetId is valid UUID format
    if (!targetId || !UUID_REGEX.test(targetId)) {
      return NextResponse.json(
        { error: 'Invalid targetId format', message: 'targetId must be a valid UUID' },
        { status: 400 }
      );
    }

    // Verify target person exists and belongs to this user
    const targetPerson = await prisma.person.findFirst({
      where: {
        id: targetId,
        userId: userId,
      },
    });

    if (!targetPerson) {
      return NextResponse.json(
        { error: 'Not found', message: 'Target person not found' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const maxHopsParam = searchParams.get('maxHops');
    const maxPathsParam = searchParams.get('maxPaths');

    const maxHops = maxHopsParam ? parseInt(maxHopsParam, 10) : 3;
    const maxPaths = maxPathsParam ? parseInt(maxPathsParam, 10) : 5;

    // Validate numeric parameters
    if (isNaN(maxHops) || maxHops < 1 || maxHops > 10) {
      return NextResponse.json(
        { error: 'Invalid parameter', message: 'maxHops must be between 1 and 10' },
        { status: 400 }
      );
    }

    if (isNaN(maxPaths) || maxPaths < 1 || maxPaths > 20) {
      return NextResponse.json(
        { error: 'Invalid parameter', message: 'maxPaths must be between 1 and 20' },
        { status: 400 }
      );
    }

    // Instantiate Pathfinder and find paths
    const pathfinder = new Pathfinder(prisma);
    const paths = await pathfinder.findWarmIntroPaths(userId, targetId, {
      maxHops,
      maxPaths,
    });

    return NextResponse.json({ paths });
  } catch (error) {
    console.error('Path finding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
