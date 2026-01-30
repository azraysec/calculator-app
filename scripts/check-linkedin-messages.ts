import { prisma } from '@wig/db';

async function checkMessages() {
  console.log('Checking LinkedIn message processing...\n');

  // Check recent LinkedIn archive jobs
  const recentJobs = await prisma.linkedInArchiveJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  console.log('=== Recent LinkedIn Archive Jobs ===');
  for (const job of recentJobs) {
    console.log(`\nJob ID: ${job.id}`);
    console.log(`Status: ${job.status}`);
    console.log(`Connections: ${job.connectionsTotal || 0} total, ${job.connectionsNew || 0} new`);
    console.log(`Messages: ${job.messagesTotal || 0} total, ${job.messagesNew || 0} new`);
    console.log(`Conversations: ${job.conversationsTotal || 0} total, ${job.conversationsNew || 0} new`);
    console.log(`Created: ${job.createdAt}`);
  }

  // Check total evidence events
  const evidenceCount = await prisma.evidenceEvent.count();
  console.log(`\n=== Evidence Events ===`);
  console.log(`Total evidence events in database: ${evidenceCount}`);

  // Check evidence by type
  const evidenceByType = await prisma.evidenceEvent.groupBy({
    by: ['type'],
    _count: { id: true },
  });

  console.log('\nEvidence by type:');
  for (const group of evidenceByType) {
    console.log(`  ${group.type}: ${group._count.id}`);
  }

  // Check total conversations
  const conversationCount = await prisma.conversation.count();
  console.log(`\nTotal conversations: ${conversationCount}`);

  // Check total messages
  const messageCount = await prisma.message.count();
  console.log(`Total messages: ${messageCount}`);

  await prisma.$disconnect();
}

checkMessages().catch(console.error);
