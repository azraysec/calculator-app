/**
 * Auth handlers - Testable authentication logic
 *
 * This module contains the core authentication handling logic,
 * extracted from auth.ts for better testability.
 */

/**
 * Handle Google OAuth sign-in: store tokens and create DataSourceConnection
 *
 * @param userId - The authenticated user's ID
 * @param account - OAuth account data from Google
 * @param db - Prisma client (injectable for testing)
 */
export async function handleGoogleSignIn(
  userId: string,
  account: {
    access_token?: string | null;
    refresh_token?: string | null;
    expires_at?: number | null;
  },
  db: {
    user: {
      update: (args: any) => Promise<any>;
      findUnique: (args: any) => Promise<any>;
    };
    dataSourceConnection: {
      upsert: (args: any) => Promise<any>;
    };
  }
) {
  // Store tokens for Gmail API access
  await db.user.update({
    where: { id: userId },
    data: {
      googleRefreshToken: account.refresh_token ?? null,
      googleAccessToken: account.access_token ?? null,
      tokenExpiresAt: account.expires_at
        ? new Date(account.expires_at * 1000)
        : null,
    },
  });

  // Check if user has stored refresh token (from current or previous login)
  const updatedUser = await db.user.findUnique({
    where: { id: userId },
    select: { googleRefreshToken: true },
  });

  // Connection is CONNECTED if we have a refresh token (current or previously stored)
  const hasRefreshToken = !!(account.refresh_token || updatedUser?.googleRefreshToken);

  // Create/update DataSourceConnection for Gmail status tracking
  await db.dataSourceConnection.upsert({
    where: {
      userId_sourceType: {
        userId,
        sourceType: "EMAIL",
      },
    },
    update: {
      connectionStatus: hasRefreshToken ? "CONNECTED" : "DISCONNECTED",
      updatedAt: new Date(),
    },
    create: {
      userId,
      sourceType: "EMAIL",
      connectionStatus: hasRefreshToken ? "CONNECTED" : "DISCONNECTED",
      privacyLevel: "PRIVATE",
    },
  });

  return { hasRefreshToken };
}
