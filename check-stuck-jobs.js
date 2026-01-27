/**
 * Diagnostic script to check for stuck LinkedIn archive jobs
 * Run with: node check-stuck-jobs.js
 */

const { PrismaClient } = require('@wig/db');

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('Checking for stuck LinkedIn archive jobs...\n');

    // Find all LinkedIn archive jobs
    const allJobs = await prisma.ingestJob.findMany({
      where: { sourceName: 'linkedin_archive' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (allJobs.length === 0) {
      console.log('No LinkedIn archive jobs found.');
      return;
    }

    console.log(`Found ${allJobs.length} job(s):\n`);

    for (const job of allJobs) {
      const fileMetadata = job.fileMetadata;
      const fileName = fileMetadata?.fileName || 'unknown';
      const createdAgo = Math.round((Date.now() - job.createdAt.getTime()) / 1000 / 60);

      console.log(`Job ID: ${job.id}`);
      console.log(`  Status: ${job.status}`);
      console.log(`  File: ${fileName}`);
      console.log(`  Progress: ${job.progress}%`);
      console.log(`  Created: ${createdAgo} minutes ago`);
      console.log(`  Started: ${job.startedAt ? 'Yes' : 'No'}`);
      console.log(`  Completed: ${job.completedAt ? 'Yes' : 'No'}`);
      if (job.error) {
        console.log(`  Error: ${job.error}`);
      }
      if (job.logs) {
        console.log(`  Last log: ${job.logs.substring(0, 100)}`);
      }
      console.log('');
    }

    // Find stuck jobs
    const stuckJobs = allJobs.filter(job =>
      (job.status === 'queued' || job.status === 'running') &&
      (!job.completedAt) &&
      (Date.now() - job.createdAt.getTime() > 10 * 60 * 1000) // Stuck for >10 min
    );

    if (stuckJobs.length > 0) {
      console.log(`\n⚠️  Found ${stuckJobs.length} stuck job(s)!\n`);
      console.log('To manually trigger the cron processor, run:');
      console.log('  curl http://localhost:3000/api/cron/linkedin-process\n');
      console.log('Or reset the stuck job to "queued" status:');
      for (const job of stuckJobs) {
        console.log(`  node -e "const {PrismaClient} = require('@wig/db'); const p = new PrismaClient(); p.ingestJob.update({where:{id:'${job.id}'}, data:{status:'queued',startedAt:null}}).then(()=>console.log('Reset')).finally(()=>p.$disconnect())"`);
      }
    } else {
      console.log('✓ No stuck jobs found.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
