/**
 * Path search API
 * GET /api/people/:id/paths?target=targetId&maxHops=3&minStrength=0.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { createGraphService } from '@/lib/graph-service';
import { z } from 'zod';

const searchSchema = z.object({
  target: z.string().uuid(),
  maxHops: z.coerce.number().int().min(1).max(5).optional(),
  minStrength: z.coerce.number().min(0).max(1).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const validated = searchSchema.parse({
      target: searchParams.get('target'),
      maxHops: searchParams.get('maxHops'),
      minStrength: searchParams.get('minStrength'),
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
