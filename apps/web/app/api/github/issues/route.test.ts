import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock execAsync function
const mockExecAsync = vi.fn();

vi.mock('child_process', async () => {
  return {
    exec: vi.fn(),
  };
});

vi.mock('util', async () => {
  return {
    promisify: () => mockExecAsync,
  };
});

// Import after mocks are set up
const { GET } = await import('./route');

describe('GitHub Issues API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecAsync.mockReset();
  });

  describe('GET /api/github/issues', () => {
    it('should return all GitHub issues with proper formatting', async () => {
      const mockGhOutput = JSON.stringify([
        {
          number: 5,
          title: 'Fix pathfinding bug',
          state: 'closed',
          labels: [
            { name: 'P0-Critical' },
            { name: 'bug' },
          ],
          createdAt: '2026-01-30T10:00:00Z',
          updatedAt: '2026-01-30T12:00:00Z',
          assignees: [{ login: 'johndoe' }],
          url: 'https://github.com/test/repo/issues/5',
        },
        {
          number: 10,
          title: 'Add new feature',
          state: 'open',
          labels: [
            { name: 'P1-High' },
            { name: 'enhancement' },
            { name: 'in-progress' },
          ],
          createdAt: '2026-01-29T14:00:00Z',
          updatedAt: '2026-01-30T08:00:00Z',
          assignees: [],
          url: 'https://github.com/test/repo/issues/10',
        },
      ]);

      mockExecAsync.mockResolvedValue({ stdout: mockGhOutput, stderr: '' });

      const request = new NextRequest('http://localhost:3000/api/github/issues');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.issues).toHaveLength(2);

      // First issue (closed)
      expect(data.issues[0]).toMatchObject({
        number: 5,
        title: 'Fix pathfinding bug',
        state: 'closed',
        priority: 'Critical',
        status: 'Closed',
        assignee: 'johndoe',
      });
      expect(data.issues[0].labels).toContain('P0-Critical');
      expect(data.issues[0].labels).toContain('bug');

      // Second issue (open, in progress)
      expect(data.issues[1]).toMatchObject({
        number: 10,
        title: 'Add new feature',
        state: 'open',
        priority: 'High',
        status: 'In Progress',
        assignee: null,
      });
      expect(data.issues[1].labels).toContain('in-progress');
    });

    it('should filter by state parameter', async () => {
      const mockGhOutput = JSON.stringify([
        {
          number: 10,
          title: 'Open issue',
          state: 'open',
          labels: [{ name: 'P2-Medium' }],
          createdAt: '2026-01-29T14:00:00Z',
          updatedAt: '2026-01-30T08:00:00Z',
          assignees: [],
          url: 'https://github.com/test/repo/issues/10',
        },
      ]);

      mockExecAsync.mockResolvedValue({ stdout: mockGhOutput, stderr: '' });

      const request = new NextRequest('http://localhost:3000/api/github/issues?state=open');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.issues).toHaveLength(1);
      expect(data.issues[0].state).toBe('open');
    });

    it('should filter by priority parameter', async () => {
      const mockGhOutput = JSON.stringify([
        {
          number: 5,
          title: 'Critical issue',
          state: 'open',
          labels: [{ name: 'P0-Critical' }],
          createdAt: '2026-01-30T10:00:00Z',
          updatedAt: '2026-01-30T12:00:00Z',
          assignees: [],
          url: 'https://github.com/test/repo/issues/5',
        },
        {
          number: 10,
          title: 'High priority issue',
          state: 'open',
          labels: [{ name: 'P1-High' }],
          createdAt: '2026-01-29T14:00:00Z',
          updatedAt: '2026-01-30T08:00:00Z',
          assignees: [],
          url: 'https://github.com/test/repo/issues/10',
        },
      ]);

      mockExecAsync.mockResolvedValue({ stdout: mockGhOutput, stderr: '' });

      const request = new NextRequest('http://localhost:3000/api/github/issues?priority=P0-Critical');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.issues).toHaveLength(1);
      expect(data.issues[0].priority).toBe('Critical');
      expect(data.issues[0].number).toBe(5);
    });

    it('should handle issues without priority labels', async () => {
      const mockGhOutput = JSON.stringify([
        {
          number: 15,
          title: 'Issue without priority',
          state: 'open',
          labels: [{ name: 'enhancement' }],
          createdAt: '2026-01-30T10:00:00Z',
          updatedAt: '2026-01-30T12:00:00Z',
          assignees: [],
          url: 'https://github.com/test/repo/issues/15',
        },
      ]);

      mockExecAsync.mockResolvedValue({ stdout: mockGhOutput, stderr: '' });

      const request = new NextRequest('http://localhost:3000/api/github/issues');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.issues[0].priority).toBeNull();
    });

    it('should handle GitHub CLI not installed', async () => {
      mockExecAsync.mockRejectedValue(new Error('gh: command not found'));

      const request = new NextRequest('http://localhost:3000/api/github/issues');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('GitHub CLI');
      expect(data.issues).toEqual([]);
    });

    it('should handle authentication errors', async () => {
      mockExecAsync.mockRejectedValue(new Error('authentication required'));

      const request = new NextRequest('http://localhost:3000/api/github/issues');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Not authenticated');
      expect(data.issues).toEqual([]);
    });

    it('should return empty array on general errors', async () => {
      mockExecAsync.mockRejectedValue(new Error('Unknown error'));

      const request = new NextRequest('http://localhost:3000/api/github/issues');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.issues).toEqual([]);
    });

    it('should handle empty issues list', async () => {
      mockExecAsync.mockResolvedValue({ stdout: '[]', stderr: '' });

      const request = new NextRequest('http://localhost:3000/api/github/issues');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.issues).toEqual([]);
    });
  });
});
