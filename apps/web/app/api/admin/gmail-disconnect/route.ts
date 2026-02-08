/**
 * Admin API to disconnect Gmail (clear invalid tokens)
 * POST /api/admin/gmail-disconnect?userId=xxx
 *
 * Use this when tokens are invalid (invalid_grant) but UI still shows "Connected"
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (userId) {
      // Clear tokens for specific user
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: null,
          googleRefreshToken: null,
          lastGmailSyncAt: null,
        },
        select: { id: true, email: true },
      });

      return NextResponse.json({
        success: true,
        message: `Cleared Gmail tokens for ${user.email}`,
        userId: user.id,
      });
    } else {
      // Clear tokens for all users with invalid tokens
      // First, let's find users with Gmail tokens
      const usersWithTokens = await prisma.user.findMany({
        where: { googleRefreshToken: { not: null } },
        select: { id: true, email: true, googleRefreshToken: true },
      });

      const results = [];
      for (const user of usersWithTokens) {
        // Test if token is valid
        try {
          const { createGmailAdapter } = await import('@wig/adapters');
          const adapter = createGmailAdapter({
            refreshToken: user.googleRefreshToken!,
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          });

          const validation = await adapter.validateConnection();

          if (!validation.valid) {
            // Token is invalid, clear it
            await prisma.user.update({
              where: { id: user.id },
              data: {
                googleAccessToken: null,
                googleRefreshToken: null,
              },
            });
            results.push({ email: user.email, action: 'cleared', reason: validation.error });
          } else {
            results.push({ email: user.email, action: 'kept', reason: 'token is valid' });
          }
        } catch (error) {
          results.push({ email: user.email, action: 'error', reason: String(error) });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Processed ${usersWithTokens.length} users`,
        results,
      });
    }
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    return NextResponse.json(
      {
        error: 'Failed to disconnect Gmail',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
