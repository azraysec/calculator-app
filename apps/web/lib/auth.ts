import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@wig/db";
import { authConfig } from "./auth.config";

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
    ...authConfig.callbacks,
    /**
     * signIn callback - runs BEFORE user is created by adapter
     * DO NOT create/upsert users here - it conflicts with PrismaAdapter
     * Just validate and return true to allow sign-in
     */
    async signIn() {
      // Allow all Google sign-ins
      // Token storage happens in events.signIn AFTER user exists
      return true;
    },

    /**
     * Add user ID to session for API route authorization
     */
    async session({ session, user }: { session: any; user: any }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },

    /**
     * Add user ID to JWT token
     */
    async jwt({ token, user }: { token: any; user?: any }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },

  /**
   * Events fire AFTER the adapter operations complete
   * Safe to update user here because they definitely exist
   */
  events: {
    /**
     * Store OAuth tokens in User model for Gmail API access
     * This runs AFTER PrismaAdapter creates/links the user
     */
    async signIn({ user, account }: { user: any; account: any }) {
      if (account?.provider === "google" && account.refresh_token && user?.id) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              googleRefreshToken: account.refresh_token,
              googleAccessToken: account.access_token ?? null,
              tokenExpiresAt: account.expires_at
                ? new Date(account.expires_at * 1000)
                : null,
            },
          });
        } catch (error) {
          // Log but don't fail sign-in if token storage fails
          console.error("Failed to store OAuth tokens:", error);
        }
      }
    },
  },

  session: {
    strategy: "database" as const,
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
