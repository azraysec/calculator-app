import { prisma } from '@wig/db';

async function addEntry() {
  try {
    console.log('Adding REQ-034 changelog entry...');

    const entry = await prisma.changelogEntry.create({
      data: {
        entryId: 'REQ-034',
        requirement: 'Add Ctrl+F keyboard shortcut for fast GitHub issue creation',
        priority: 'medium',
        status: 'done',
        category: 'Feature',
        notes: 'Implemented global Ctrl+F keyboard shortcut that opens modal dialog for creating GitHub issues. Added POST /api/github/issues endpoint using gh CLI to create issues with title, description, priority, and labels. Built CreateIssueDialog component with form validation, success notifications, and issue link. Supports P0-P3 priority selection, multiple label types (bug/enhancement/feature/documentation). Shows success state with auto-close after 3s. Added 7 comprehensive unit tests for POST endpoint. Improves feedback loop by eliminating context switching to GitHub.',
        dateAdded: new Date('2026-01-30'),
        dateStarted: new Date('2026-01-30'),
        dateCompleted: new Date('2026-01-30'),
        version: '0.11.0',
        githubIssueNumber: 8,
        githubIssueUrl: 'https://github.com/owner/repo/issues/8',
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
