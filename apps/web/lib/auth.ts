import NextAuth, { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@wig/db";

/**
 * NextAuth.js configuration for authentication
 *
 * Provides:
 * - Google OAuth for user authentication
 * - Gmail API access via refresh tokens
 * - User session management
 * - Prisma database integration
 */
export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request offline access to get refresh token
          access_type: "offline",
          prompt: "consent",
          // Gmail API scopes
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.readonly",
          ].join(" "),
        },
      },
    }),
  ],

  callbacks: {
    /**
     * Store OAuth tokens in User model for API access
     */
    async signIn({ account, profile }) {
      if (account?.provider === "google" && account.refresh_token && profile?.email) {
        // Update user with Google OAuth tokens
        await prisma.user.update({
          where: { email: profile.email },
          data: {
            googleRefreshToken: account.refresh_token,
            googleAccessToken: account.access_token ?? null,
            tokenExpiresAt: account.expires_at
              ? new Date(account.expires_at * 1000)
              : null,
          },
        });
      }
      return true;
    },

    /**
     * Add user ID to session for API route authorization
     */
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },

    /**
     * Add user ID to JWT token
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },

  pages: {
    signIn: "/login",
    error: "/auth/error",
  },

  session: {
    strategy: "database",
  },

  debug: process.env.NODE_ENV === "development",
};

/**
 * NextAuth.js instance with helpers
 * Use auth() in server components and API routes to get session
 */
// eslint-disable-next-line
const nextAuth: any = NextAuth(authConfig);

export const handlers = nextAuth.handlers;
export const auth = nextAuth.auth;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
