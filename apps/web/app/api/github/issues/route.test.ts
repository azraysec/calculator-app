import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock environment variables
process.env.GITHUB_TOKEN = 'test-token';
process.env.GITHUB_REPO_OWNER = 'test-owner';
process.env.GITHUB_REPO_NAME = 'test-repo';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocks are set up
const { GET, POST } = await import('./route');

describe('GitHub Issues API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('GET /api/github/issues', () => {
    it('should return all GitHub issues with proper formatting', async () => {
      const mockApiResponse = [
        {
          number: 5,
          title: 'Fix pathfinding bug',
          state: 'closed',
          labels: [
            { name: 'P0-Critical' },
            { name: 'bug' },
          ],
          created_at: '2026-01-30T10:00:00Z',
          updated_at: '2026-01-30T12:00:00Z',
          assignee: { login: 'johndoe' },
          html_url: 'https://github.com/test/repo/issues/5',
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
          created_at: '2026-01-29T14:00:00Z',
          updated_at: '2026-01-30T08:00:00Z',
          assignee: null,
          html_url: 'https://github.com/test/repo/issues/10',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

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
      const mockApiResponse = [
        {
          number: 10,
          title: 'Open issue',
          state: 'open',
          labels: [{ name: 'P2-Medium' }],
          created_at: '2026-01-29T14:00:00Z',
          updated_at: '2026-01-30T08:00:00Z',
          assignee: null,
          html_url: 'https://github.com/test/repo/issues/10',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      const request = new NextRequest('http://localhost:3000/api/github/issues?state=open');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.issues).toHaveLength(1);
      expect(data.issues[0].state).toBe('open');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('state=open'),
        expect.any(Object)
      );
    });

    it('should filter by priority parameter', async () => {
      const mockApiResponse = [
        {
          number: 5,
          title: 'Critical issue',
          state: 'open',
          labels: [{ name: 'P0-Critical' }],
          created_at: '2026-01-30T10:00:00Z',
          updated_at: '2026-01-30T12:00:00Z',
          assignee: null,
          html_url: 'https://github.com/test/repo/issues/5',
        },
        {
          number: 10,
          title: 'High priority issue',
          state: 'open',
          labels: [{ name: 'P1-High' }],
          created_at: '2026-01-29T14:00:00Z',
          updated_at: '2026-01-30T08:00:00Z',
          assignee: null,
          html_url: 'https://github.com/test/repo/issues/10',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      const request = new NextRequest('http://localhost:3000/api/github/issues?priority=P0-Critical');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.issues).toHaveLength(1);
      expect(data.issues[0].priority).toBe('Critical');
      expect(data.issues[0].number).toBe(5);
    });

    it('should handle issues without priority labels', async () => {
      const mockApiResponse = [
        {
          number: 15,
          title: 'Issue without priority',
          state: 'open',
          labels: [{ name: 'enhancement' }],
          created_at: '2026-01-30T10:00:00Z',
          updated_at: '2026-01-30T12:00:00Z',
          assignee: null,
          html_url: 'https://github.com/test/repo/issues/15',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      const request = new NextRequest('http://localhost:3000/api/github/issues');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.issues[0].priority).toBeNull();
    });

    it('should filter out pull requests', async () => {
      const mockApiResponse = [
        {
          number: 5,
          title: 'Regular issue',
          state: 'open',
          labels: [{ name: 'P2-Medium' }],
          created_at: '2026-01-30T10:00:00Z',
          updated_at: '2026-01-30T12:00:00Z',
          assignee: null,
          html_url: 'https://github.com/test/repo/issues/5',
        },
        {
          number: 10,
          title: 'Pull request',
          state: 'open',
          labels: [],
          created_at: '2026-01-30T10:00:00Z',
          updated_at: '2026-01-30T12:00:00Z',
          assignee: null,
          html_url: 'https://github.com/test/repo/pull/10',
          pull_request: { url: 'https://api.github.com/repos/test/repo/pulls/10' },
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      const request = new NextRequest('http://localhost:3000/api/github/issues');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.issues).toHaveLength(1);
      expect(data.issues[0].number).toBe(5);
    });

    it('should return error when GITHUB_TOKEN is not set', async () => {
      const originalToken = process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_TOKEN;

      const request = new NextRequest('http://localhost:3000/api/github/issues');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('GITHUB_TOKEN');
      expect(data.issues).toEqual([]);

      process.env.GITHUB_TOKEN = originalToken;
    });

    it('should handle GitHub API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Bad credentials' }),
      });

      const request = new NextRequest('http://localhost:3000/api/github/issues');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Bad credentials');
      expect(data.issues).toEqual([]);
    });

    it('should return empty array on general errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const request = new NextRequest('http://localhost:3000/api/github/issues');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.issues).toEqual([]);
    });

    it('should handle empty issues list', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const request = new NextRequest('http://localhost:3000/api/github/issues');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.issues).toEqual([]);
    });
  });

  describe('POST /api/github/issues', () => {
    it('should create a GitHub issue successfully', async () => {
      const mockApiResponse = {
        number: 15,
        html_url: 'https://github.com/test/repo/issues/15',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      const requestBody = {
        title: 'New feature request',
        description: 'Add support for X',
        priority: 'P1-High',
        labels: ['enhancement'],
      };

      const request = new NextRequest('http://localhost:3000/api/github/issues', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.issueNumber).toBe(15);
      expect(data.issueUrl).toBe('https://github.com/test/repo/issues/15');
      expect(data.message).toContain('#15');

      // Verify fetch was called with correct parameters
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/test-owner/test-repo/issues',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should return 400 when title is missing', async () => {
      const requestBody = {
        description: 'Some description',
      };

      const request = new NextRequest('http://localhost:3000/api/github/issues', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Title is required');
    });

    it('should handle issues without description', async () => {
      const mockApiResponse = {
        number: 16,
        html_url: 'https://github.com/test/repo/issues/16',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      const requestBody = {
        title: 'Simple issue',
      };

      const request = new NextRequest('http://localhost:3000/api/github/issues', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
    });

    it('should handle multiple labels', async () => {
      const mockApiResponse = {
        number: 17,
        html_url: 'https://github.com/test/repo/issues/17',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      const requestBody = {
        title: 'Bug report',
        priority: 'P0-Critical',
        labels: ['bug', 'urgent'],
      };

      const request = new NextRequest('http://localhost:3000/api/github/issues', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      // Verify labels are included in API call
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.labels).toEqual(['P0-Critical', 'bug', 'urgent']);
    });

    it('should return error when GITHUB_TOKEN is not set', async () => {
      const originalToken = process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_TOKEN;

      const requestBody = {
        title: 'Test issue',
      };

      const request = new NextRequest('http://localhost:3000/api/github/issues', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('GITHUB_TOKEN');

      process.env.GITHUB_TOKEN = originalToken;
    });

    it('should handle GitHub API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: async () => ({ message: 'Validation failed' }),
      });

      const requestBody = {
        title: 'Test issue',
      };

      const request = new NextRequest('http://localhost:3000/api/github/issues', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error).toContain('Validation failed');
    });

    it('should handle fetch network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const requestBody = {
        title: 'Test issue',
      };

      const request = new NextRequest('http://localhost:3000/api/github/issues', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Network error');
    });
  });
});
