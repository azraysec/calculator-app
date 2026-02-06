/**
 * Vitest setup file
 * Mocks are defined here to ensure they're applied before any imports
 */
import { vi } from 'vitest';

// Mock next-auth's auth function
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock next/server
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: ResponseInit) => {
      const response = new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...init?.headers,
        },
      });
      return response;
    },
  },
  NextRequest: class NextRequest extends Request {},
}));
