import { prisma } from '@wig/db';

async function addEntry() {
  try {
    console.log('Adding REQ-033 changelog entry...');

    const entry = await prisma.changelogEntry.create({
      data: {
        entryId: 'REQ-033',
        requirement: 'Show all GitHub issues in changelog for complete visibility',
        priority: 'critical',
        status: 'done',
        category: 'Feature',
        notes: 'Integrated GitHub Issues directly into changelog view. Created /api/github/issues endpoint using gh CLI to fetch all issues with labels, priorities, and status. Updated RequirementsTable to merge changelog entries with GitHub issues, eliminating duplicates. Added filter controls (All/Open Issues/Completed) with real-time counts. Polls changelog every 5s and GitHub every 10s for live updates. Now shows complete picture: past work (completed), present (in progress), and future (open issues). Added 8 comprehensive unit tests for GitHub API endpoint.',
        dateAdded: new Date('2026-01-30'),
        dateStarted: new Date('2026-01-30'),
        dateCompleted: new Date('2026-01-30'),
        version: '0.10.0',
        githubIssueNumber: 11,
        githubIssueUrl: 'https://github.com/owner/repo/issues/11',
      },
    });

    console.log('✅ Successfully added changelog entry!');
    console.log(`ID: ${entry.entryId}`);
    console.log(`Requirement: ${entry.requirement}`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addEntry();
