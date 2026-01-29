/**
 * Migration Script: Populate Changelog Database via API
 * Run: node scripts/migrate-changelog.js
 */

const STATIC_REQUIREMENTS = [
  {
    id: 'REQ-001',
    requirement: 'Add changelog tab to UI',
    priority: 'High',
    status: 'Done',
    category: 'Feature',
    notes: 'Display all requirements with status and priority',
    dateAdded: '2026-01-20',
    dateStarted: '2026-01-20',
    dateCompleted: '2026-01-20',
  },
  // ... (all 31 entries from before)
];

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function migrateChangelog() {
  console.log('Starting changelog migration via API...');
  console.log(`API URL: ${API_URL}/api/changelog`);
  console.log(`Found ${STATIC_REQUIREMENTS.length} entries to migrate\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const req of STATIC_REQUIREMENTS) {
    try {
      const response = await fetch(`${API_URL}/api/changelog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entryId: req.id,
          requirement: req.requirement,
          priority: req.priority,
          status: req.status,
          category: req.category,
          notes: req.notes || null,
          dateAdded: req.dateAdded,
          dateStarted: req.dateStarted || null,
          dateCompleted: req.dateCompleted || null,
        }),
      });

      if (response.ok) {
        console.log(`  ✅ Migrated ${req.id}: ${req.requirement}`);
        successCount++;
      } else if (response.status === 409) {
        console.log(`  ⏭️  Skipping ${req.id} (already exists)`);
        skipCount++;
      } else {
        const error = await response.text();
        console.error(`  ❌ Failed ${req.id}: ${error}`);
        errorCount++;
      }
    } catch (error) {
      console.error(`  ❌ Failed ${req.id}:`, error.message);
      errorCount++;
    }
  }

  console.log('\nMigration complete!');
  console.log(`  Created: ${successCount}`);
  console.log(`  Skipped: ${skipCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`  Total: ${STATIC_REQUIREMENTS.length}`);
}

migrateChangelog().catch(console.error);
