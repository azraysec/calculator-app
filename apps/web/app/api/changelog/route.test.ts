import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from './route';
import { NextRequest } from 'next/server';

// Mock @wig/db
vi.mock('@wig/db', () => ({
  prisma: {
    changelogEntry: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('Changelog API', () => {
  describe('GET /api/changelog', () => {
    it('should return all changelog entries with proper formatting', async () => {
      const { prisma } = await import('@wig/db');

      const mockEntries = [
        {
          id: 'uuid-1',
          entryId: 'REQ-001',
          requirement: 'Test requirement',
          priority: 'high',
          status: 'done',
          category: 'Feature',
          notes: 'Test notes',
          dateAdded: new Date('2026-01-20'),
          dateStarted: new Date('2026-01-20'),
          dateCompleted: new Date('2026-01-20'),
          version: '1.0.0',
          githubIssueNumber: 5,
          githubIssueUrl: 'https://github.com/test/repo/issues/5',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'uuid-2',
          entryId: 'BUG-001',
          requirement: 'Fix bug',
          priority: 'critical',
          status: 'in_progress',
          category: 'Bug Fix',
          notes: null,
          dateAdded: new Date('2026-01-21'),
          dateStarted: new Date('2026-01-21'),
          dateCompleted: null,
          version: null,
          githubIssueNumber: null,
          githubIssueUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.changelogEntry.findMany as any).mockResolvedValue(mockEntries);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entries).toHaveLength(2);

      // First entry
      expect(data.entries[0]).toMatchObject({
        id: 'REQ-001',
        requirement: 'Test requirement',
        priority: 'High',
        status: 'Done',
        category: 'Feature',
        notes: 'Test notes',
        dateAdded: '2026-01-20',
        dateStarted: '2026-01-20',
        dateCompleted: '2026-01-20',
        version: '1.0.0',
        githubIssueNumber: 5,
        githubIssueUrl: 'https://github.com/test/repo/issues/5',
      });

      // Second entry
      expect(data.entries[1]).toMatchObject({
        id: 'BUG-001',
        requirement: 'Fix bug',
        priority: 'Critical',
        status: 'In Progress',
        category: 'Bug Fix',
        dateAdded: '2026-01-21',
        dateStarted: '2026-01-21',
      });
      expect(data.entries[1].dateCompleted).toBeUndefined();
      expect(data.entries[1].version).toBeUndefined();
    });

    it('should handle database errors', async () => {
      const { prisma } = await import('@wig/db');
      (prisma.changelogEntry.findMany as any).mockRejectedValue(new Error('Database error'));

      const response = await GET();
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('should return empty array when no entries exist', async () => {
      const { prisma } = await import('@wig/db');
      (prisma.changelogEntry.findMany as any).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entries).toEqual([]);
    });
  });

  describe('POST /api/changelog', () => {
    it('should create a new changelog entry', async () => {
      const { prisma } = await import('@wig/db');

      const requestBody = {
        entryId: 'REQ-032',
        requirement: 'New feature',
        priority: 'High',
        status: 'In Progress',
        category: 'Feature',
        notes: 'Feature notes',
        dateAdded: '2026-01-30',
        dateStarted: '2026-01-30',
        dateCompleted: null,
        version: null,
        githubIssueNumber: 10,
        githubIssueUrl: 'https://github.com/test/repo/issues/10',
      };

      const mockCreatedEntry = {
        id: 'uuid-new',
        entryId: 'REQ-032',
        requirement: 'New feature',
        priority: 'high',
        status: 'in_progress',
        category: 'Feature',
        notes: 'Feature notes',
        dateAdded: new Date('2026-01-30'),
        dateStarted: new Date('2026-01-30'),
        dateCompleted: null,
        version: null,
        githubIssueNumber: 10,
        githubIssueUrl: 'https://github.com/test/repo/issues/10',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.changelogEntry.create as any).mockResolvedValue(mockCreatedEntry);

      const request = new NextRequest('http://localhost:3000/api/changelog', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.entry).toBeDefined();
      expect(data.entry.entryId).toBe('REQ-032');
    });

    it('should return 400 when missing required fields', async () => {
      const requestBody = {
        entryId: 'REQ-032',
        requirement: 'New feature',
        // Missing priority, status, category, dateAdded
      };

      const request = new NextRequest('http://localhost:3000/api/changelog', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('Missing required fields');
    });

    it('should normalize status and priority to lowercase for database', async () => {
      const { prisma } = await import('@wig/db');

      const requestBody = {
        entryId: 'TASK-100',
        requirement: 'Test task',
        priority: 'Critical',
        status: 'In Progress',
        category: 'Enhancement',
        dateAdded: '2026-01-30',
      };

      (prisma.changelogEntry.create as any).mockResolvedValue({
        id: 'uuid',
        ...requestBody,
        priority: 'critical',
        status: 'in_progress',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest('http://localhost:3000/api/changelog', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      // Verify the create call normalized the enums
      expect((prisma.changelogEntry.create as any)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priority: 'critical',
            status: 'in_progress',
          }),
        })
      );
    });

    it('should handle database errors', async () => {
      const { prisma } = await import('@wig/db');
      (prisma.changelogEntry.create as any).mockRejectedValue(new Error('Database error'));

      const requestBody = {
        entryId: 'REQ-999',
        requirement: 'Test',
        priority: 'High',
        status: 'Planned',
        category: 'Feature',
        dateAdded: '2026-01-30',
      };

      const request = new NextRequest('http://localhost:3000/api/changelog', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('should handle optional fields correctly', async () => {
      const { prisma } = await import('@wig/db');

      const requestBody = {
        entryId: 'BUG-100',
        requirement: 'Bug fix',
        priority: 'Medium',
        status: 'Planned',
        category: 'Bug Fix',
        dateAdded: '2026-01-30',
        // No notes, dateStarted, dateCompleted, version, githubIssueNumber, githubIssueUrl
      };

      const mockCreatedEntry = {
        id: 'uuid',
        ...requestBody,
        priority: 'medium',
        status: 'planned',
        notes: null,
        dateStarted: null,
        dateCompleted: null,
        version: null,
        githubIssueNumber: null,
        githubIssueUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.changelogEntry.create as any).mockResolvedValue(mockCreatedEntry);

      const request = new NextRequest('http://localhost:3000/api/changelog', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      // Verify nulls were passed for optional fields
      expect((prisma.changelogEntry.create as any)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: null,
            dateStarted: null,
            dateCompleted: null,
            version: null,
            githubIssueNumber: null,
            githubIssueUrl: null,
          }),
        })
      );
    });
  });
});
