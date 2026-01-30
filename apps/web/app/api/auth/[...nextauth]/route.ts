import { handlers } from "@/lib/auth";

/**
 * NextAuth.js route handler
 * Handles all authentication routes:
 * - GET/POST /api/auth/signin
 * - GET/POST /api/auth/signout
 * - GET/POST /api/auth/callback/google
 * - GET /api/auth/session
 */
export const { GET, POST } = handlers;
