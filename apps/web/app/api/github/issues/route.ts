/**
 * GitHub Issues API
 * GET /api/github/issues - Fetch all issues from repository
 * POST /api/github/issues - Create new GitHub issue
 * Uses GitHub REST API with GITHUB_TOKEN environment variable
 */

import { NextRequest, NextResponse } from 'next/server';

interface GitHubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: string[];
  priority: 'Critical' | 'High' | 'Medium' | 'Low' | null;
  status: 'Open' | 'In Progress' | 'Closed';
  createdAt: string;
  updatedAt: string;
  assignee: string | null;
  url: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state') || 'all'; // all, open, closed
    const priority = searchParams.get('priority'); // P0-Critical, P1-High, etc.

    // Get GitHub token from environment
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GITHUB_TOKEN environment variable not configured', issues: [] },
        { status: 500 }
      );
    }

    // Get repo owner and name from environment or default to azraysec/calculator-app
    const repoOwner = process.env.GITHUB_REPO_OWNER || 'azraysec';
    const repoName = process.env.GITHUB_REPO_NAME || 'calculator-app';

    // Fetch issues via GitHub REST API
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/issues?state=${state}&per_page=100`;
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('GitHub API error:', errorData);
      return NextResponse.json(
        { error: `GitHub API error: ${errorData.message || response.statusText}`, issues: [] },
        { status: response.status }
      );
    }

    const rawIssues = await response.json();

    // Transform to our format
    const issues: GitHubIssue[] = rawIssues
      .filter((issue: any) => !issue.pull_request) // Exclude pull requests
      .map((issue: any) => {
        // Extract priority from labels
        const priorityLabel = issue.labels.find((l: any) =>
          ['P0-Critical', 'P1-High', 'P2-Medium', 'P3-Low'].includes(l.name)
        );
        const priority = priorityLabel
          ? (priorityLabel.name.replace('P0-', '').replace('P1-', '').replace('P2-', '').replace('P3-', '') as any)
          : null;

        // Extract status from labels
        const statusLabel = issue.labels.find((l: any) =>
          ['in-progress', 'blocked'].includes(l.name)
        );
        let status: 'Open' | 'In Progress' | 'Closed' = issue.state === 'closed' ? 'Closed' : 'Open';
        if (statusLabel?.name === 'in-progress') {
          status = 'In Progress';
        }

        return {
          number: issue.number,
          title: issue.title,
          state: issue.state,
          labels: issue.labels.map((l: any) => l.name),
          priority,
          status,
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          assignee: issue.assignee?.login || null,
          url: issue.html_url,
        };
      });

    // Filter by priority if specified
    let filteredIssues = issues;
    if (priority) {
      const priorityMap: { [key: string]: string } = {
        'P0-Critical': 'Critical',
        'P1-High': 'High',
        'P2-Medium': 'Medium',
        'P3-Low': 'Low',
      };
      const targetPriority = priorityMap[priority];
      filteredIssues = issues.filter((issue) => issue.priority === targetPriority);
    }

    return NextResponse.json({ issues: filteredIssues });
  } catch (error: any) {
    console.error('Error fetching GitHub issues:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message, issues: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, priority, labels } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Get GitHub token from environment
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GITHUB_TOKEN environment variable not configured' },
        { status: 500 }
      );
    }

    // Get repo owner and name from environment or default to azraysec/calculator-app
    const repoOwner = process.env.GITHUB_REPO_OWNER || 'azraysec';
    const repoName = process.env.GITHUB_REPO_NAME || 'calculator-app';

    // Build labels list
    const allLabels: string[] = [];
    if (priority) {
      allLabels.push(priority); // P0-Critical, P1-High, etc.
    }
    if (labels && Array.isArray(labels)) {
      allLabels.push(...labels);
    }

    // Create issue via GitHub REST API
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/issues`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body: description || undefined,
        labels: allLabels,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('GitHub API error:', errorData);
      return NextResponse.json(
        { error: `GitHub API error: ${errorData.message || response.statusText}` },
        { status: response.status }
      );
    }

    const issue = await response.json();

    return NextResponse.json(
      {
        success: true,
        issueUrl: issue.html_url,
        issueNumber: issue.number,
        message: `Issue #${issue.number} created successfully`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating GitHub issue:', error);
    return NextResponse.json(
      { error: 'Failed to create issue: ' + error.message },
      { status: 500 }
    );
  }
}
