/**
 * Tests for LinkedIn Profile Fetch API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    person: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock LinkedIn adapter
vi.mock('@wig/adapters', () => ({
  createLinkedInAdapter: vi.fn(),
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLinkedInAdapter } from '@wig/adapters';

describe('LinkedIn Profile API', () => {
  const mockUserId = 'user-123';

  const mockAdapter = {
    validateConnection: vi.fn(),
    fetchProfileByVanityName: vi.fn(),
  };

  const createRequest = (body: any) => {
    return new Request('http://localhost/api/linkedin/profile', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
    } as any);
    vi.mocked(createLinkedInAdapter).mockReturnValue(mockAdapter as any);
  });

  describe('POST /api/linkedin/profile', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await POST(createRequest({ vanityName: 'johndoe' }));

      expect(response.status).toBe(401);
    });

    it('should return 400 when neither url nor vanityName provided', async () => {
      const response = await POST(createRequest({}));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
    });

    it('should return existing person if found', async () => {
      const existingPerson = {
        id: 'person-123',
        names: ['John Doe'],
        socialHandles: { linkedin: 'johndoe' },
        organization: null,
      };

      vi.mocked(prisma.person.findFirst).mockResolvedValue(existingPerson as any);

      const response = await POST(createRequest({ vanityName: 'johndoe' }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.exists).toBe(true);
      expect(data.person.id).toBe('person-123');
    });

    it('should filter by userId when searching existing person', async () => {
      vi.mocked(prisma.person.findFirst).mockResolvedValue(null);
      mockAdapter.validateConnection.mockResolvedValue({ valid: false, error: 'Not configured' });

      await POST(createRequest({ vanityName: 'johndoe' }));

      expect(prisma.person.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
          }),
        })
      );
    });

    it('should return 503 when LinkedIn API not configured', async () => {
      vi.mocked(prisma.person.findFirst).mockResolvedValue(null);
      mockAdapter.validateConnection.mockResolvedValue({
        valid: false,
        error: 'Missing credentials',
      });

      const response = await POST(createRequest({ vanityName: 'johndoe' }));
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('LinkedIn API not configured');
      expect(data.configRequired).toBe(true);
    });

    it('should return 404 when profile not found on LinkedIn', async () => {
      vi.mocked(prisma.person.findFirst).mockResolvedValue(null);
      mockAdapter.validateConnection.mockResolvedValue({ valid: true });
      mockAdapter.fetchProfileByVanityName.mockResolvedValue(null);

      const response = await POST(createRequest({ vanityName: 'nonexistent' }));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('LinkedIn profile not found');
    });

    it('should return fetched profile', async () => {
      vi.mocked(prisma.person.findFirst).mockResolvedValue(null);
      mockAdapter.validateConnection.mockResolvedValue({ valid: true });
      mockAdapter.fetchProfileByVanityName.mockResolvedValue({
        firstName: 'John',
        lastName: 'Doe',
        headline: 'Software Engineer',
      });

      const response = await POST(createRequest({ vanityName: 'johndoe' }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.exists).toBe(false);
      expect(data.profile.firstName).toBe('John');
    });

    it('should extract vanity name from LinkedIn URL', async () => {
      vi.mocked(prisma.person.findFirst).mockResolvedValue(null);
      mockAdapter.validateConnection.mockResolvedValue({ valid: false, error: 'Not configured' });

      await POST(createRequest({ url: 'https://www.linkedin.com/in/johndoe' }));

      expect(prisma.person.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            socialHandles: expect.objectContaining({
              string_contains: 'johndoe',
            }),
          }),
        })
      );
    });

    it('should return 400 for invalid LinkedIn URL', async () => {
      const response = await POST(createRequest({ url: 'https://example.com/notlinkedin' }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Could not extract vanity name from LinkedIn URL');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.person.findFirst).mockRejectedValue(new Error('Database error'));

      const response = await POST(createRequest({ vanityName: 'johndoe' }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch LinkedIn profile');
    });
  });
});
