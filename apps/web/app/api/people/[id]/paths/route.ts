/**
 * Path search API
 * GET /api/people/:id/paths?target=targetId&maxHops=3&minStrength=0.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { createGraphService } from '@/lib/graph-service';
import { z } from 'zod';

const searchSchema = z.object({
  target: z.string().uuid(),
  maxHops: z.number().int().min(1).max(5).optional().default(3),
  minStrength: z.number().min(0).max(1).optional().default(0.3),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const graphService = createGraphService();
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
}
