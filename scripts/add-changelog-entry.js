/**
 * Add Changelog Entry via API
 * Usage: node scripts/add-changelog-entry.js
 */

const entry = {
  entryId: 'REQ-032',
  requirement: 'Dynamic changelog from database with real-time updates',
  priority: 'Medium',
  status: 'Done',
  category: 'Feature',
  notes: 'Replaced static REQUIREMENTS array with database-backed changelog system. Created ChangelogEntry model in Prisma, added GET/POST /api/changelog API endpoints, updated UI to fetch from database with 5-second polling for real-time updates. Migrated all 34 existing entries to database. Added 8 comprehensive unit tests for API endpoints. Now shows live indicator and updates automatically as Steve works.',
  dateAdded: '2026-01-30',
  dateStarted: '2026-01-30',
  dateCompleted: '2026-01-30',
  version: '0.9.0',
  githubIssueNumber: 9,
  githubIssueUrl: 'https://github.com/owner/repo/issues/9',
};

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function addEntry() {
  try {
    console.log('Adding changelog entry...');
    console.log(`Entry ID: ${entry.entryId}`);
    console.log(`Requirement: ${entry.requirement}\n`);

    const response = await fetch(`${API_URL}/api/changelog`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Successfully added changelog entry!');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.error('❌ Failed to add entry:', error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addEntry();
