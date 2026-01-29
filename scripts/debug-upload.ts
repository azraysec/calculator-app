/**
 * Debug script to investigate upload issues
 */

import { prisma } from '@wig/db';

async function main() {
  console.log('=== DEBUGGING UPLOAD ISSUES ===\n');

  // 1. Check latest ingest job
  console.log('1. Latest LinkedIn Ingest Job:');
  const latestJob = await prisma.ingestJob.findFirst({
    where: { sourceName: 'linkedin_archive' },
    orderBy: { createdAt: 'desc' },
  });

  if (latestJob) {
    console.log('   Job ID:', latestJob.id);
    console.log('   Status:', latestJob.status);
    console.log('   Created:', latestJob.createdAt);
    console.log('   Completed:', latestJob.completedAt);
    console.log('   File:', (latestJob.fileMetadata as any)?.fileName);
    console.log('   Result:', latestJob.resultMetadata);
    console.log('   Errors:', latestJob.error);
  } else {
    console.log('   No jobs found');
  }

  // 2. Check for duplicate persons
  console.log('\n2. Checking for Duplicate Persons:');
  const persons = await prisma.person.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      names: true,
      emails: true,
    },
  });

  // Group by email
  const emailGroups = new Map<string, typeof persons>();
  persons.forEach((person) => {
    person.emails.forEach((email) => {
      if (!emailGroups.has(email)) {
        emailGroups.set(email, []);
      }
      emailGroups.get(email)!.push(person);
    });
  });

  const duplicates = Array.from(emailGroups.entries()).filter(
    ([_, persons]) => persons.length > 1
  );

  if (duplicates.length > 0) {
    console.log(`   Found ${duplicates.length} duplicate emails:`);
    duplicates.slice(0, 5).forEach(([email, persons]) => {
      console.log(`   - ${email}: ${persons.length} persons`);
      persons.forEach((p) => console.log(`     - ID: ${p.id}, Names: ${p.names.join(', ')}`));
    });
  } else {
    console.log('   No duplicates found');
  }

  // 3. Check conversations
  console.log('\n3. Conversations:');
  const conversationCount = await prisma.conversation.count();
  console.log(`   Total conversations: ${conversationCount}`);

  const sampleConversations = await prisma.conversation.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
  });
  console.log('   Sample conversations:');
  sampleConversations.forEach((c) => {
    console.log(`   - ${c.sourceName}:${c.externalId} - ${c.participants.length} participants`);
  });

  // 4. Check evidence events
  console.log('\n4. Evidence Events:');
  const linkedinMessageEvents = await prisma.evidenceEvent.count({
    where: {
      type: {
        in: ['linkedin_message_sent', 'linkedin_message_received'],
      },
    },
  });
  console.log(`   LinkedIn message events: ${linkedinMessageEvents}`);

  const linkedinConnectionEvents = await prisma.evidenceEvent.count({
    where: { type: 'linkedin_connection' },
  });
  console.log(`   LinkedIn connection events: ${linkedinConnectionEvents}`);

  // 5. Check edges
  console.log('\n5. Edges:');
  const totalEdges = await prisma.edge.count();
  console.log(`   Total edges: ${totalEdges}`);

  const linkedinEdges = await prisma.edge.count({
    where: { sources: { has: 'linkedin_archive' } },
  });
  console.log(`   LinkedIn edges: ${linkedinEdges}`);

  // 6. Check for duplicate edges
  console.log('\n6. Checking for Duplicate Edges:');
  const edges = await prisma.edge.findMany({
    select: {
      fromPersonId: true,
      toPersonId: true,
      id: true,
    },
  });

  const edgeMap = new Map<string, number>();
  edges.forEach((edge) => {
    const key = `${edge.fromPersonId}-${edge.toPersonId}`;
    edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
  });

  const duplicateEdges = Array.from(edgeMap.entries()).filter(
    ([_, count]) => count > 1
  );

  if (duplicateEdges.length > 0) {
    console.log(`   Found ${duplicateEdges.length} duplicate edges`);
    duplicateEdges.slice(0, 5).forEach(([key, count]) => {
      console.log(`   - ${key}: ${count} duplicates`);
    });
  } else {
    console.log('   No duplicate edges found');
  }

  // 7. Check unique constraints
  console.log('\n7. Database Constraints:');
  const constraints = await prisma.$queryRaw<any[]>`
    SELECT
      tc.constraint_name,
      tc.table_name,
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'UNIQUE'
      AND tc.table_name IN ('persons', 'edges', 'conversations', 'evidence_events')
    ORDER BY tc.table_name, tc.constraint_name;
  `;

  console.log('   Unique constraints:');
  constraints.forEach((c) => {
    console.log(`   - ${c.table_name}.${c.column_name} (${c.constraint_name})`);
  });

  console.log('\n=== DEBUG COMPLETE ===');
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
