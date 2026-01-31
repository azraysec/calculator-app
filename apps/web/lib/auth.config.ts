import type { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

/**
 * Edge-compatible NextAuth.js configuration
 *
 * This configuration file is used by the Next.js middleware which runs
 * in the Edge Runtime. It does NOT include the Prisma adapter because
 * Prisma Client cannot run in Edge Runtime without special configuration.
 *
 * The full configuration with Prisma adapter is in auth.ts and is used
 * by API routes and server components (which run in Node.js runtime).
 *
 * This split configuration pattern is the recommended approach for
 * NextAuth v5 with Prisma:
 * - auth.config.ts: Edge-compatible config for middleware
 * - auth.ts: Full config with database adapter for API routes
 *
 * IMPORTANT: We use JWT strategy here because the middleware cannot access
 * the database to validate session tokens. The auth.ts uses database strategy
 * for full session management. The middleware only does basic route protection.
 */
export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,

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

  pages: {
    signIn: "/login",
    error: "/auth/error",
  },

  // Use JWT for middleware session checks (Edge runtime compatible)
  // The full auth.ts uses database strategy with PrismaAdapter
  session: {
    strategy: "jwt",
  },

  callbacks: {
    /**
     * Authorized callback for middleware
     * Returns true if the user is allowed to access the route
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      // Public routes that don't require authentication
      const publicRoutes = [
        '/login',
        '/api/auth',
        '/api/health',
      ];

      const isPublicRoute = publicRoutes.some((route) =>
        pathname.startsWith(route)
      );

      // Allow public routes
      if (isPublicRoute) {
        return true;
      }

      // Require authentication for all other routes
      return isLoggedIn;
    },
  },
};
