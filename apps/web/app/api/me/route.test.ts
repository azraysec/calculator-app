/**
 * Unit Tests for Current User (Me) API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from './route';

// Mock Prisma
vi.mock('@wig/db', () => ({
  prisma: {
    person: {
      findFirst: vi.fn(),
    },
  },
}));

describe('Current User API (/api/me)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return current user when found', async () => {
    const { prisma } = await import('@wig/db');

    const mockUser = {
      id: 'user-123',
      names: ['Test User'],
      emails: ['test@example.com'],
      title: 'Software Engineer',
      organization: {
        id: 'org-123',
        name: 'Test Company',
      },
      metadata: { isMe: true },
      deletedAt: null,
    };

    (prisma.person.findFirst as any).mockResolvedValue(mockUser);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      id: 'user-123',
      names: ['Test User'],
      emails: ['test@example.com'],
      title: 'Software Engineer',
      organization: {
        id: 'org-123',
        name: 'Test Company',
      },
    });
  });

  it('should return 404 when no user found', async () => {
    const { prisma } = await import('@wig/db');

    (prisma.person.findFirst as any).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Current user not found. Upload LinkedIn archive to create your profile.');
  });

  it('should query for user with isMe flag', async () => {
    const { prisma } = await import('@wig/db');

    (prisma.person.findFirst as any).mockResolvedValue({
      id: 'user-123',
      names: ['Test User'],
      emails: ['test@example.com'],
      metadata: { isMe: true },
      deletedAt: null,
    });

    await GET();

    expect(prisma.person.findFirst).toHaveBeenCalledWith({
      where: {
        metadata: {
          path: ['isMe'],
          equals: true,
        },
        deletedAt: null,
      },
      include: {
        organization: true,
      },
    });
  });

  it('should handle database errors gracefully', async () => {
    const { prisma } = await import('@wig/db');

    (prisma.person.findFirst as any).mockRejectedValue(new Error('Database error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('should not return deleted users', async () => {
    const { prisma } = await import('@wig/db');

    (prisma.person.findFirst as any).mockResolvedValue(null);

    await GET();

    expect(prisma.person.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
        }),
      })
    );
  });

  it('should include organization data', async () => {
    const { prisma } = await import('@wig/db');

    (prisma.person.findFirst as any).mockResolvedValue({
      id: 'user-123',
      names: ['Test User'],
      emails: ['test@example.com'],
      organization: {
        id: 'org-123',
        name: 'Test Company',
      },
      metadata: { isMe: true },
      deletedAt: null,
    });

    await GET();

    expect(prisma.person.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          organization: true,
        },
      })
    );
  });
});
