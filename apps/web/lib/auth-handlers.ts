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
  // First, get existing user data to preserve refresh token if not provided
  const existingUser = await db.user.findUnique({
    where: { id: userId },
    select: { googleRefreshToken: true },
  });

  // Only update refresh token if a new one was provided
  // Google only sends refresh_token on first authorization, not subsequent logins
  const refreshTokenToStore = account.refresh_token ?? existingUser?.googleRefreshToken ?? null;

  // Store tokens for Gmail API access
  await db.user.update({
    where: { id: userId },
    data: {
      googleRefreshToken: refreshTokenToStore,
      googleAccessToken: account.access_token ?? null,
      tokenExpiresAt: account.expires_at
        ? new Date(account.expires_at * 1000)
        : null,
    },
  });

  // Connection is CONNECTED if we have a refresh token (new or existing)
  const hasRefreshToken = !!refreshTokenToStore;

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
