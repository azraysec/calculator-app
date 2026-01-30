import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * Get the authenticated user's ID from the session
 *
 * Returns the user ID if authenticated, otherwise throws a 401 error.
 * Use this in API routes to ensure user is authenticated.
 */
export async function getAuthenticatedUserId(): Promise<string> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  return session.user.id;
}

/**
 * Create a standardized unauthorized response
 */
export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Unauthorized', message: 'Authentication required' },
    { status: 401 }
  );
}

/**
 * Create a standardized forbidden response
 */
export function forbiddenResponse(message = 'Forbidden') {
  return NextResponse.json(
    { error: 'Forbidden', message },
    { status: 403 }
  );
}

/**
 * Wrapper for API routes that require authentication
 *
 * Usage:
 * ```typescript
 * export const GET = withAuth(async (request, { userId }) => {
 *   // userId is guaranteed to be available
 *   const data = await prisma.someModel.findMany({
 *     where: { userId }
 *   });
 *   return NextResponse.json(data);
 * });
 * ```
 */
export function withAuth<T extends any[]>(
  handler: (request: Request, context: { userId: string; params?: any }) => Promise<NextResponse>
) {
  return async (request: Request, ...args: T) => {
    try {
      const userId = await getAuthenticatedUserId();

      // Extract params if provided
      const params = args[0] as any;

      return await handler(request, { userId, params });
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        return unauthorizedResponse();
      }
      throw error;
    }
  };
}
