import { prisma } from '@wig/db';

async function addEntry() {
  try {
    console.log('Adding REQ-032 changelog entry...');

    const entry = await prisma.changelogEntry.create({
      data: {
        entryId: 'REQ-032',
        requirement: 'Dynamic changelog from database with real-time updates',
        priority: 'medium',
        status: 'done',
        category: 'Feature',
        notes: 'Replaced static REQUIREMENTS array with database-backed changelog system. Created ChangelogEntry model in Prisma, added GET/POST /api/changelog API endpoints, updated UI to fetch from database with 5-second polling for real-time updates. Migrated all 34 existing entries to database. Added 8 comprehensive unit tests for API endpoints. Now shows live indicator and updates automatically as Steve works.',
        dateAdded: new Date('2026-01-30'),
        dateStarted: new Date('2026-01-30'),
        dateCompleted: new Date('2026-01-30'),
        version: '0.9.0',
        githubIssueNumber: 9,
        githubIssueUrl: 'https://github.com/owner/repo/issues/9',
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
