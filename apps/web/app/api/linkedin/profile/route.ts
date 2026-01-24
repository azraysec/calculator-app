/**
 * LinkedIn Profile Fetch API
 * POST /api/linkedin/profile
 *
 * Fetches a LinkedIn profile by URL or vanity name
 * Requires LinkedIn API credentials to be configured
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createLinkedInAdapter } from '@wig/adapters';
import { prisma } from '@/lib/prisma';

const requestSchema = z.object({
  url: z.string().url().optional(),
  vanityName: z.string().optional(),
}).refine(
  (data) => data.url || data.vanityName,
  { message: 'Either url or vanityName must be provided' }
);

/**
 * Extract vanity name from LinkedIn URL
 */
function extractVanityName(url: string): string | null {
  const pattern = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(in|pub)\/([\w-]+)/i;
  const match = url.match(pattern);
  return match ? match[2] : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = requestSchema.parse(body);

    // Extract vanity name from URL if provided
    const vanityName = validated.vanityName ||
      (validated.url ? extractVanityName(validated.url) : null);

    if (!vanityName) {
      return NextResponse.json(
        { error: 'Could not extract vanity name from LinkedIn URL' },
        { status: 400 }
      );
    }

    // Check if person already exists in database
    const existing = await prisma.person.findFirst({
      where: {
        deletedAt: null,
        socialHandles: {
          path: ['linkedin'],
          string_contains: vanityName,
        },
      },
      include: {
        organization: true,
      },
    });

    if (existing) {
      return NextResponse.json({
        exists: true,
        person: existing,
      });
    }

    // Create LinkedIn adapter
    const adapter = createLinkedInAdapter();

    // Validate connection first
    const connectionStatus = await adapter.validateConnection();
    if (!connectionStatus.valid) {
      return NextResponse.json(
        {
          error: 'LinkedIn API not configured',
          details: connectionStatus.error,
          configRequired: true,
          instructions: [
            'Register your app at https://www.linkedin.com/developers/',
            'Set environment variables:',
            '  - LINKEDIN_CLIENT_ID',
            '  - LINKEDIN_CLIENT_SECRET',
            '  - LINKEDIN_ACCESS_TOKEN',
          ],
        },
        { status: 503 }
      );
    }

    // Fetch profile from LinkedIn
    const profile = await adapter.fetchProfileByVanityName(vanityName);

    if (!profile) {
      return NextResponse.json(
        { error: 'LinkedIn profile not found' },
        { status: 404 }
      );
    }

    // Optionally: Auto-create person in database
    // For now, just return the profile data
    return NextResponse.json({
      exists: false,
      profile,
      message: 'Profile fetched from LinkedIn. Use this data to add them to your network.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('LinkedIn profile fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch LinkedIn profile',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
