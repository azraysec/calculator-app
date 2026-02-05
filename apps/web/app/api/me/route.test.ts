/**
 * Unit Tests for Current User (Me) API
 *
 * The /api/me route uses withAuth and returns the authenticated user's data
 * including their linked person record.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from './route';
import { auth } from '@/lib/auth';

// auth is already mocked in test-setup.ts

// Mock @wig/db
vi.mock('@wig/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Current User API (/api/me)', () => {
  const userId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return current user when found', async () => {
    const { prisma } = await import('@wig/db');

    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as any);

    const mockUser = {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
      googleRefreshToken: 'refresh-token',
      lastGmailSyncAt: new Date('2026-01-15'),
      person: {
        id: 'person-123',
        names: ['Test User'],
        emails: ['test@example.com'],
        title: 'Software Engineer',
        organization: {
          id: 'org-123',
          name: 'Test Company',
        },
      },
    };

    (prisma.user.findUnique as any).mockResolvedValue(mockUser);

    const request = new Request('http://localhost/api/me');
    const response = await GET(request, {});
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(userId);
    expect(data.email).toBe('test@example.com');
    expect(data.name).toBe('Test User');
    expect(data.googleRefreshToken).toBe(true); // Should be boolean, not actual token
    expect(data.person.id).toBe('person-123');
    expect(data.person.names).toEqual(['Test User']);
  });

  it('should return 404 when no user found', async () => {
    const { prisma } = await import('@wig/db');

    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as any);
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const request = new Request('http://localhost/api/me');
    const response = await GET(request, {});
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User not found');
  });

  it('should query user by authenticated userId', async () => {
    const { prisma } = await import('@wig/db');

    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as any);
    (prisma.user.findUnique as any).mockResolvedValue({
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
      googleRefreshToken: null,
      lastGmailSyncAt: null,
      person: null,
    });

    const request = new Request('http://localhost/api/me');
    await GET(request, {});

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: userId },
      include: {
        person: {
          include: {
            organization: true,
          },
        },
      },
    });
  });

  it('should handle database errors gracefully', async () => {
    const { prisma } = await import('@wig/db');

    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as any);
    (prisma.user.findUnique as any).mockRejectedValue(new Error('Database error'));

    const request = new Request('http://localhost/api/me');
    const response = await GET(request, {});
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('should return 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = new Request('http://localhost/api/me');
    const response = await GET(request, {});

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return user without person if not linked', async () => {
    const { prisma } = await import('@wig/db');

    vi.mocked(auth).mockResolvedValue({ user: { id: userId } } as any);

    const mockUser = {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
      googleRefreshToken: null,
      lastGmailSyncAt: null,
      person: null, // No linked person
    };

    (prisma.user.findUnique as any).mockResolvedValue(mockUser);

    const request = new Request('http://localhost/api/me');
    const response = await GET(request, {});
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.person).toBeNull();
    expect(data.googleRefreshToken).toBe(false);
  });
});
