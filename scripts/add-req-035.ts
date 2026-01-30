import { prisma } from '@wig/db';

async function addEntry() {
  try {
    console.log('Adding REQ-035 changelog entry...');

    const entry = await prisma.changelogEntry.create({
      data: {
        entryId: 'REQ-035',
        requirement: 'Add Vercel deployment verification to all procedures',
        priority: 'high',
        status: 'done',
        category: 'Infrastructure',
        notes: 'Updated MASTER-PROCEDURE.md and all specialized procedures (bug-fix, new-feature, deployment-fix, performance-optimization) to include mandatory Vercel deployment verification steps. Added commands to check deployment status (vercel ls, vercel inspect) and confirm status is Ready before proceeding. Prevents shipping broken deployments by catching build/TypeScript errors early. Verified v0.11.0 successfully deployed with all features (dynamic changelog, GitHub Issues integration, Ctrl+F keyboard shortcut) now live in production.',
        dateAdded: new Date('2026-01-30'),
        dateStarted: new Date('2026-01-30'),
        dateCompleted: new Date('2026-01-30'),
        version: '0.11.0',
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
