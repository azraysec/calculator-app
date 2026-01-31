/**
 * Path search API
 * GET /api/people/:id/paths?target=targetId&maxHops=3&minStrength=0.3
 */

import { NextResponse } from 'next/server';
import { createGraphService } from '@/lib/graph-service';
import { z } from 'zod';
import { withAuth } from '@/lib/auth-helpers';

const searchSchema = z.object({
  target: z.string().uuid(),
  maxHops: z.number().int().min(1).max(5).optional().default(3),
  minStrength: z.number().min(0).max(1).optional().default(0.3),
});

export const GET = withAuth(async (
  request: Request,
  { userId, params }
) => {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // Parse query parameters with defaults
    const maxHops = searchParams.get('maxHops');
    const minStrength = searchParams.get('minStrength');

    const validated = searchSchema.parse({
      target: searchParams.get('target'),
      maxHops: maxHops ? parseInt(maxHops, 10) : undefined,
      minStrength: minStrength ? parseFloat(minStrength) : undefined,
    });

    // CRITICAL: Pass userId for multi-tenant isolation
    const graphService = createGraphService(userId);
    const result = await graphService.findPaths(id, validated.target, {
      maxHops: validated.maxHops,
      minStrength: validated.minStrength,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Path search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
