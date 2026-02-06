import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@wig/db";
import { authConfig } from "./auth.config";
import { handleGoogleSignIn } from "./auth-handlers";

/**
 * NextAuth.js configuration for authentication
 *
 * This is the FULL configuration with Prisma adapter, used by:
 * - API routes (Node.js runtime)
 * - Server components (Node.js runtime)
 * - Server actions (Node.js runtime)
 *
 * For Edge Runtime (middleware), use auth.config.ts which does NOT
 * include the Prisma adapter.
 *
 * Provides:
 * - Google OAuth for user authentication
 * - Gmail API access via refresh tokens
 * - User session management
 * - Prisma database integration
 */
const fullAuthConfig = {
  ...authConfig,
  adapter: PrismaAdapter(prisma),

  callbacks: {
    /**
     * signIn callback - runs BEFORE user is created by adapter
     * DO NOT create/upsert users here - it conflicts with PrismaAdapter
     * Just validate and return true to allow sign-in
     */
    async signIn() {
      return true;
    },

    /**
     * JWT callback - add user ID to token
     * With JWT strategy, this is called on every request
     */
    async jwt({ token, user, account }: { token: any; user?: any; account?: any }) {
      // On first sign-in, user and account are available
      if (user) {
        token.id = user.id;
      }
      // Store tokens in JWT for later use
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },

    /**
     * Session callback - expose user ID to client
     */
    async session({ session, token }: { session: any; token: any }) {
      if (session.user && token.id) {
        session.user.id = token.id;
      }
      return session;
    },
  },

  /**
   * Events fire AFTER the adapter operations complete
   */
  events: {
    /**
     * Store OAuth tokens in User model for Gmail API access
     * Also create/update DataSourceConnection for UI status tracking
     */
    async signIn({ user, account }: { user: any; account: any }) {
      console.log("[Auth Event] signIn triggered", {
        provider: account?.provider,
        userId: user?.id,
        hasAccessToken: !!account?.access_token,
        hasRefreshToken: !!account?.refresh_token,
        tokenType: account?.token_type,
      });

      if (account?.provider === "google" && user?.id) {
        try {
          const result = await handleGoogleSignIn(user.id, account, prisma);
          console.log("[Auth Event] handleGoogleSignIn result:", result);
        } catch (error) {
          console.error("Failed to store OAuth tokens:", error);
        }
      }
    },
  },

  // Use JWT strategy - simpler and doesn't require database session lookups
  session: {
    strategy: "jwt" as const,
  },

  debug: process.env.NODE_ENV === "development",
};

/**
 * NextAuth.js instance with helpers
 * Use auth() in server components and API routes to get session
 *
 * Note: This uses the FULL configuration with Prisma adapter.
 * The middleware uses a separate instance with the edge-compatible config.
 */
// eslint-disable-next-line
const nextAuth: any = NextAuth(fullAuthConfig);

export const handlers = nextAuth.handlers;
export const auth = nextAuth.auth;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
