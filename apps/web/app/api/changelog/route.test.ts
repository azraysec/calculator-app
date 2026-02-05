/**
 * Tests for Changelog API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';

// Mock Prisma
vi.mock('@wig/db', () => ({
  prisma: {
    changelogEntry: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from '@wig/db';

describe('Changelog API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/changelog', () => {
    it('should return transformed changelog entries', async () => {
      const mockEntries = [
        {
          entryId: 'entry-1',
          requirement: 'Add feature X',
          priority: 'high',
          status: 'in_progress',
          category: 'Feature',
          notes: 'Some notes',
          dateAdded: new Date('2024-01-01'),
          dateStarted: new Date('2024-01-05'),
          dateCompleted: null,
          version: '1.0.0',
          githubIssueNumber: 123,
          githubIssueUrl: 'https://github.com/org/repo/issues/123',
          sourceType: 'github_issue',
          sourceDetails: 'From issue #123',
        },
      ];

      vi.mocked(prisma.changelogEntry.findMany).mockResolvedValue(mockEntries as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entries).toHaveLength(1);
      expect(data.entries[0].id).toBe('entry-1');
      expect(data.entries[0].priority).toBe('High');
      expect(data.entries[0].status).toBe('In Progress');
    });

    it('should handle all status types', async () => {
      const statuses = ['planned', 'in_progress', 'in_review', 'done', 'blocked', 'on_hold', 'unknown'];
      const mockEntries = statuses.map((status, i) => ({
        entryId: `entry-${i}`,
        requirement: `Task ${i}`,
        priority: 'medium',
        status,
        category: 'Feature',
        notes: null,
        dateAdded: new Date(),
        dateStarted: null,
        dateCompleted: null,
        version: null,
        githubIssueNumber: null,
        githubIssueUrl: null,
        sourceType: 'internal',
        sourceDetails: null,
      }));

      vi.mocked(prisma.changelogEntry.findMany).mockResolvedValue(mockEntries as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entries).toHaveLength(7);
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.changelogEntry.findMany).mockRejectedValue(new Error('DB error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('POST /api/changelog', () => {
    const createRequest = (body: any) => {
      return new Request('http://localhost/api/changelog', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });
    };

    it('should create a new changelog entry', async () => {
      vi.mocked(prisma.changelogEntry.create).mockResolvedValue({} as any);

      const response = await POST(createRequest({
        entryId: 'entry-new',
        requirement: 'New feature',
        priority: 'Critical',
        status: 'Planned',
        category: 'Feature',
        dateAdded: '2024-01-01',
      }));

      expect(response.status).toBe(201);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await POST(createRequest({
        entryId: 'entry-1',
      }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.changelogEntry.create).mockRejectedValue(new Error('DB error'));

      const response = await POST(createRequest({
        entryId: 'entry-1',
        requirement: 'Task',
        priority: 'Low',
        status: 'Planned',
        category: 'Bug',
        dateAdded: '2024-01-01',
      }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should convert In Progress status correctly', async () => {
      vi.mocked(prisma.changelogEntry.create).mockResolvedValue({} as any);

      const response = await POST(createRequest({
        entryId: 'entry-progress',
        requirement: 'In progress task',
        priority: 'High',
        status: 'In Progress',
        category: 'Feature',
        dateAdded: '2024-01-01',
      }));

      expect(response.status).toBe(201);
      expect(prisma.changelogEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'in_progress',
          }),
        })
      );
    });

    it('should convert In Review status correctly', async () => {
      vi.mocked(prisma.changelogEntry.create).mockResolvedValue({} as any);

      const response = await POST(createRequest({
        entryId: 'entry-review',
        requirement: 'Review task',
        priority: 'Medium',
        status: 'In Review',
        category: 'Feature',
        dateAdded: '2024-01-01',
      }));

      expect(response.status).toBe(201);
      expect(prisma.changelogEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'in_review',
          }),
        })
      );
    });

    it('should convert Done status correctly', async () => {
      vi.mocked(prisma.changelogEntry.create).mockResolvedValue({} as any);

      const response = await POST(createRequest({
        entryId: 'entry-done',
        requirement: 'Completed task',
        priority: 'Low',
        status: 'Done',
        category: 'Bug',
        dateAdded: '2024-01-01',
      }));

      expect(response.status).toBe(201);
      expect(prisma.changelogEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'done',
          }),
        })
      );
    });

    it('should convert Blocked status correctly', async () => {
      vi.mocked(prisma.changelogEntry.create).mockResolvedValue({} as any);

      const response = await POST(createRequest({
        entryId: 'entry-blocked',
        requirement: 'Blocked task',
        priority: 'Critical',
        status: 'Blocked',
        category: 'Feature',
        dateAdded: '2024-01-01',
      }));

      expect(response.status).toBe(201);
      expect(prisma.changelogEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'blocked',
          }),
        })
      );
    });

    it('should convert On Hold status correctly', async () => {
      vi.mocked(prisma.changelogEntry.create).mockResolvedValue({} as any);

      const response = await POST(createRequest({
        entryId: 'entry-hold',
        requirement: 'On hold task',
        priority: 'Low',
        status: 'On Hold',
        category: 'Feature',
        dateAdded: '2024-01-01',
      }));

      expect(response.status).toBe(201);
      expect(prisma.changelogEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'on_hold',
          }),
        })
      );
    });

    it('should default unknown status to planned', async () => {
      vi.mocked(prisma.changelogEntry.create).mockResolvedValue({} as any);

      const response = await POST(createRequest({
        entryId: 'entry-unknown',
        requirement: 'Unknown status task',
        priority: 'Low',
        status: 'Some Unknown Status',
        category: 'Feature',
        dateAdded: '2024-01-01',
      }));

      expect(response.status).toBe(201);
      expect(prisma.changelogEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'planned',
          }),
        })
      );
    });
  });
});
