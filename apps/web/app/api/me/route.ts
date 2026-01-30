/**
 * Current User API
 * GET /api/me - Returns the current authenticated user's data
 *
 * Includes:
 * - User ID and email
 * - Gmail connection status
 * - Last sync timestamps
 * - Associated person record (if linked)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@wig/db';
import { withAuth } from '@/lib/auth-helpers';

export const GET = withAuth(async (_request, { userId }) => {
  try {
    // Fetch authenticated user with their person record
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        person: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      // User identity
      id: user.id,
      email: user.email,
      name: user.name,

      // Gmail connection status
      googleRefreshToken: !!user.googleRefreshToken, // Boolean flag, don't expose actual token
      lastGmailSyncAt: user.lastGmailSyncAt,

      // Associated person record (if exists)
      person: user.person
        ? {
            id: user.person.id,
            names: user.person.names,
            emails: user.person.emails,
            title: user.person.title,
            organization: user.person.organization,
          }
        : null,
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
