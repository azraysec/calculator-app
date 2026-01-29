/**
 * Check detailed logs from latest job
 */

import { prisma } from '@wig/db';
import { put } from '@vercel/blob';
import AdmZip from 'adm-zip';

async function main() {
  console.log('=== CHECKING JOB LOGS ===\n');

  // Get latest job
  const job = await prisma.ingestJob.findFirst({
    where: { sourceName: 'linkedin_archive' },
    orderBy: { createdAt: 'desc' },
  });

  if (!job) {
    console.log('No jobs found');
    return;
  }

  console.log('Latest Job:');
  console.log('  ID:', job.id);
  console.log('  Status:', job.status);
  console.log('  File:', (job.fileMetadata as any)?.fileName);
  console.log('  Blob URL:', (job.fileMetadata as any)?.blobUrl);
  console.log('\nResult Metadata:');
  console.log(JSON.stringify(job.resultMetadata, null, 2));

  console.log('\nFile Metadata:');
  console.log(JSON.stringify(job.fileMetadata, null, 2));

  // Try to fetch and inspect the blob
  const blobUrl = (job.fileMetadata as any)?.blobUrl;
  if (blobUrl) {
    console.log('\n=== INSPECTING ARCHIVE ===');
    try {
      const response = await fetch(blobUrl);
      const buffer = await response.arrayBuffer();
      const zip = new AdmZip(Buffer.from(buffer));
      const entries = zip.getEntries();

      console.log(`\nTotal files in archive: ${entries.length}`);
      console.log('\nFiles:');
      entries.forEach((entry) => {
        console.log(`  - ${entry.entryName} (${entry.header.size} bytes)`);
      });

      // Check for messages file
      const messagesFile = entries.find((e) =>
        e.entryName.toLowerCase().includes('messages.csv')
      );

      if (messagesFile) {
        console.log('\n=== MESSAGES.CSV FOUND ===');
        console.log('  Name:', messagesFile.entryName);
        console.log('  Size:', messagesFile.header.size);

        const content = zip.readAsText(messagesFile);
        const lines = content.split('\n');
        console.log('  Line count:', lines.length);
        console.log('\n  First 20 lines:');
        lines.slice(0, 20).forEach((line, idx) => {
          console.log(`    ${idx + 1}: ${line.substring(0, 100)}`);
        });
      } else {
        console.log('\n=== MESSAGES.CSV NOT FOUND ===');
        console.log('Looking for files with "message" in name:');
        entries
          .filter((e) => e.entryName.toLowerCase().includes('message'))
          .forEach((e) => {
            console.log(`  - ${e.entryName}`);
          });
      }
    } catch (error) {
      console.error('Error inspecting blob:', error);
    }
  }
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
