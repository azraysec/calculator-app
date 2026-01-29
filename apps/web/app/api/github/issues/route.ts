/**
 * GitHub Issues API
 * GET /api/github/issues - Fetch all issues from repository
 * POST /api/github/issues - Create new GitHub issue
 * Integrates with GitHub CLI (gh) for authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

    // Fetch issues using GitHub CLI
    // gh issue list --json number,title,state,labels,createdAt,updatedAt,assignees,url --limit 100
    const cmd = `gh issue list --json number,title,state,labels,createdAt,updatedAt,assignees,url --limit 100 --state ${state}`;

    const { stdout, stderr } = await execAsync(cmd, {
      cwd: process.cwd(),
      timeout: 10000,
    });

    if (stderr) {
      console.error('GitHub CLI error:', stderr);
    }

    const rawIssues = JSON.parse(stdout);

    // Transform to our format
    const issues: GitHubIssue[] = rawIssues.map((issue: any) => {
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
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        assignee: issue.assignees?.[0]?.login || null,
        url: issue.url,
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

    // Check if gh CLI is not installed
    if (error.message?.includes('command not found') || error.message?.includes('not recognized')) {
      return NextResponse.json(
        { error: 'GitHub CLI (gh) not installed or not in PATH', issues: [] },
        { status: 500 }
      );
    }

    // Check if not authenticated
    if (error.message?.includes('authentication') || error.message?.includes('401')) {
      return NextResponse.json(
        { error: 'Not authenticated with GitHub. Run: gh auth login', issues: [] },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', issues: [] },
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

    // Build labels list
    const allLabels: string[] = [];
    if (priority) {
      allLabels.push(priority); // P0-Critical, P1-High, etc.
    }
    if (labels && Array.isArray(labels)) {
      allLabels.push(...labels);
    }

    // Build gh CLI command
    let cmd = `gh issue create --title "${title.replace(/"/g, '\\"')}"`;

    if (description) {
      cmd += ` --body "${description.replace(/"/g, '\\"')}"`;
    }

    if (allLabels.length > 0) {
      cmd += ` --label "${allLabels.join(',')}"`;
    }

    // Execute gh CLI command
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: process.cwd(),
      timeout: 10000,
    });

    if (stderr) {
      console.error('GitHub CLI stderr:', stderr);
    }

    // Extract issue URL from stdout (gh returns the issue URL)
    const issueUrl = stdout.trim();

    // Parse issue number from URL
    const match = issueUrl.match(/\/issues\/(\d+)$/);
    const issueNumber = match ? parseInt(match[1]) : null;

    return NextResponse.json(
      {
        success: true,
        issueUrl,
        issueNumber,
        message: `Issue #${issueNumber} created successfully`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating GitHub issue:', error);

    // Check if gh CLI is not installed
    if (error.message?.includes('command not found') || error.message?.includes('not recognized')) {
      return NextResponse.json(
        { error: 'GitHub CLI (gh) not installed or not in PATH' },
        { status: 500 }
      );
    }

    // Check if not authenticated
    if (error.message?.includes('authentication') || error.message?.includes('401')) {
      return NextResponse.json(
        { error: 'Not authenticated with GitHub. Run: gh auth login' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create issue: ' + error.message },
      { status: 500 }
    );
  }
}
