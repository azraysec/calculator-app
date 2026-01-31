# Architecture Decision Record: Prisma Edge Runtime Split Configuration

**Date:** 2026-01-31
**Status:** APPROVED
**Author:** Steve (Manager Agent) running on Claude Opus 4.5
**Model:** claude-opus-4-5-20251101

## Context

The application was experiencing the following error when running E2E tests and in certain production scenarios:

```
Error: PrismaClient is not configured to run in Edge Runtime
(Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes,
Next.js (App Router) Edge Route Handlers or Next.js Middleware).
```

### Root Cause Analysis

1. **Next.js Middleware runs in Edge Runtime** by default
2. **middleware.ts** imported `auth` from `@/lib/auth`
3. **auth.ts** used `PrismaAdapter(prisma)` which imports Prisma Client
4. **Prisma Client cannot run in Edge Runtime** without special configuration (Prisma Accelerate or Prisma Edge)
5. The middleware was transitively importing Prisma, causing the Edge Runtime error

## Decision

Implement the **Split Auth Configuration Pattern** recommended by NextAuth v5 for Prisma compatibility:

### Pattern Overview

Create two separate auth configuration files:

1. **auth.config.ts** - Edge-compatible configuration (NO Prisma)
   - Used by middleware (Edge Runtime)
   - Contains providers, pages, and `authorized` callback
   - Does NOT include PrismaAdapter

2. **auth.ts** - Full configuration WITH Prisma adapter
   - Used by API routes (Node.js Runtime)
   - Used by Server Components (Node.js Runtime)
   - Includes PrismaAdapter and database-dependent callbacks

### Files Changed

**New File: `apps/web/lib/auth.config.ts`**
```typescript
import type { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,
  providers: [GoogleProvider({...})],
  pages: { signIn: "/login", error: "/auth/error" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      // Edge-compatible auth check
      const isLoggedIn = !!auth?.user;
      // ... public route logic
      return isLoggedIn;
    },
  },
};
```

**Modified: `apps/web/lib/auth.ts`**
```typescript
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@wig/db";
import { authConfig } from "./auth.config";

const fullAuthConfig = {
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    ...authConfig.callbacks,
    signIn: async ({ account, profile }) => { /* Prisma operations */ },
    session: async ({ session, user }) => { /* Add user.id */ },
    jwt: async ({ token, user }) => { /* Add token.id */ },
  },
  session: { strategy: "database" },
};

export const { handlers, auth, signIn, signOut } = NextAuth(fullAuthConfig);
```

**Modified: `apps/web/middleware.ts`**
```typescript
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config'; // Edge-compatible!

// Create edge-compatible auth instance (no Prisma adapter)
const { auth } = NextAuth(authConfig);

const authMiddleware = auth(async (request) => {
  // ... middleware logic
}) as unknown;

export default authMiddleware as any;
```

## Consequences

### Positive

1. **Edge Runtime compatibility** - Middleware runs without Prisma errors
2. **Production stability** - No more Edge Runtime crashes
3. **Standard pattern** - Follows NextAuth v5 best practices
4. **Maintainable** - Clear separation of concerns

### Negative

1. **Two auth files** - Slight increase in complexity
2. **Config duplication** - Providers defined in auth.config.ts, extended in auth.ts
3. **Type assertions** - Required `as unknown as any` for middleware export

### Neutral

1. **No change to API routes** - They continue using full auth from auth.ts
2. **No change to Server Components** - They continue using full auth
3. **Middleware auth behavior** - Uses JWT validation instead of database lookup (acceptable for auth check)

## Alternatives Considered

### 1. Prisma Edge (via Prisma Accelerate)
- Requires paid service
- Adds network hop latency
- Unnecessary for our use case

### 2. Disable Middleware Auth
- Security risk
- Inconsistent UX
- Not recommended

### 3. Custom JWT-only Strategy
- Would require significant refactoring
- Lose database session benefits
- More complex to maintain

## Verification

The fix was verified by:

1. TypeScript compilation passes
2. Static page generation completes (28 pages)
3. No more Edge Runtime Prisma errors in build logs
4. Middleware correctly redirects unauthenticated users

Note: Final build fails on Windows due to symlink permission issues with `output: 'standalone'` - this is a Windows-specific environment issue, not a code issue.

## References

- [NextAuth v5 Documentation - Edge Compatibility](https://authjs.dev/guides/edge-compatibility)
- [Prisma Edge Runtime Limitations](https://www.prisma.io/docs/orm/reference/client-reference#edge-runtimes)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
