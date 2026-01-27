/**
 * Cleanup script to cancel invalid LinkedIn archive jobs
 */
import { PrismaClient } from '@wig/db';

const prisma = new PrismaClient();

async function main() {
  // Find all queued/running jobs
  const jobs = await prisma.ingestJob.findMany({
    where: {
      sourceName: 'linkedin_archive',
      status: { in: ['queued', 'running'] },
    },
  });

  console.log(`Found ${jobs.length} pending jobs\n`);

  let cancelledCount = 0;
  let validCount = 0;

  for (const job of jobs) {
    const fileMetadata = job.fileMetadata;
    const blobUrl = fileMetadata?.blobUrl;

    if (!blobUrl) {
      console.log(`❌ Cancelling job ${job.id} - no blob URL (created ${job.createdAt})`);
      await prisma.ingestJob.update({
        where: { id: job.id },
        data: {
          status: 'cancelled',
          completedAt: new Date(),
          error: 'Invalid job - no blob URL (from old system)',
        },
      });
      cancelledCount++;
    } else {
      console.log(`✓ Job ${job.id} is valid (has blob URL)`);
      validCount++;
    }
  }

  console.log(`\nCancelled: ${cancelledCount} invalid jobs`);
  console.log(`Valid: ${validCount} jobs ready for processing`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
