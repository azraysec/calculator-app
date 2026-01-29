/**
 * Cleanup script v3 - Simplest approach using CASCADE
 * Just delete duplicate persons, let CASCADE handle edges
 * Then manually clean up any remaining edge duplicates
 */

import { prisma } from '@wig/db';

async function main() {
  console.log('=== CLEANING UP DUPLICATES (V3 - CASCADE DELETE) ===\n');

  // 1. Find all duplicate persons by name (no email)
  console.log('1. Finding duplicate persons by name...');
  const allPersons = await prisma.person.findMany({
    where: {
      deletedAt: null,
      emails: { isEmpty: true }, // Only persons without email
    },
    select: {
      id: true,
      names: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' }, // Keep oldest
  });

  const nameMap = new Map<string, typeof allPersons>();
  allPersons.forEach((person) => {
    person.names.forEach((name) => {
      if (!nameMap.has(name)) {
        nameMap.set(name, []);
      }
      nameMap.get(name)!.push(person);
    });
  });

  const duplicateGroups = Array.from(nameMap.entries()).filter(
    ([_, persons]) => persons.length > 1
  );

  console.log(`   Found ${duplicateGroups.length} duplicate name groups`);

  if (duplicateGroups.length === 0) {
    console.log('\n✓ No duplicates found!');
    return;
  }

  const personsToDelete: string[] = [];

  for (const [name, persons] of duplicateGroups) {
    const keep = persons[0]; // Keep oldest
    const duplicates = persons.slice(1);
    duplicates.forEach((dup) => personsToDelete.push(dup.id));
  }

  console.log(`\n2. Will delete ${personsToDelete.length} duplicate persons`);
  console.log(`   CASCADE will automatically delete their edges`);

  // 2. Update evidence events to point to kept persons BEFORE deleting
  console.log('\n3. Updating evidence events...');

  // Build mapping of old -> keep IDs
  const personsToKeep = new Map<string, string>();
  for (const [name, persons] of duplicateGroups) {
    const keep = persons[0];
    const duplicates = persons.slice(1);
    duplicates.forEach((dup) => {
      personsToKeep.set(dup.id, keep.id);
    });
  }

  // Update evidence events
  for (const [oldId, keepId] of personsToKeep.entries()) {
    await prisma.evidenceEvent.updateMany({
      where: { subjectPersonId: oldId },
      data: { subjectPersonId: keepId },
    });

    await prisma.evidenceEvent.updateMany({
      where: { objectPersonId: oldId },
      data: { objectPersonId: keepId },
    });
  }
  console.log(`   ✓ Updated evidence events`);

  // 3. Delete duplicate persons (CASCADE will delete their edges)
  console.log('\n4. Deleting duplicate persons...');
  const deleted = await prisma.person.deleteMany({
    where: {
      id: { in: personsToDelete },
    },
  });

  console.log(`   ✓ Deleted ${deleted.count} duplicate persons`);
  console.log(`   ✓ CASCADE automatically deleted their edges`);

  // 4. Check for any remaining duplicate edges (same from/to pair)
  console.log('\n5. Checking for remaining duplicate edges...');
  const allEdges = await prisma.edge.findMany({
    select: {
      id: true,
      fromPersonId: true,
      toPersonId: true,
      interactionCount: true,
      sources: true,
      channels: true,
      createdAt: true,
      firstSeenAt: true,
      lastSeenAt: true,
      relationshipType: true,
      strength: true,
    },
    orderBy: { createdAt: 'asc' }, // Keep oldest
  });

  const edgeMap = new Map<string, typeof allEdges>();
  allEdges.forEach((edge) => {
    const key = `${edge.fromPersonId}-${edge.toPersonId}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, []);
    }
    edgeMap.get(key)!.push(edge);
  });

  const duplicateEdgeGroups = Array.from(edgeMap.entries()).filter(
    ([_, edges]) => edges.length > 1
  );

  if (duplicateEdgeGroups.length === 0) {
    console.log(`   ✓ No duplicate edges found`);
  } else {
    console.log(`   Found ${duplicateEdgeGroups.length} duplicate edge groups, merging...`);

    let edgesDeleted = 0;
    for (const [key, edges] of duplicateEdgeGroups) {
      const keep = edges[0]; // Keep oldest
      const duplicates = edges.slice(1);

      // Merge data
      const totalInteractions = edges.reduce(
        (sum, e) => sum + e.interactionCount,
        0
      );
      const allSources = Array.from(new Set(edges.flatMap((e) => e.sources)));
      const allChannels = Array.from(new Set(edges.flatMap((e) => e.channels)));
      const firstSeenAt = new Date(
        Math.min(...edges.map((e) => e.firstSeenAt.getTime()))
      );
      const lastSeenAt = new Date(
        Math.max(...edges.map((e) => e.lastSeenAt.getTime()))
      );

      // Update kept edge with merged data
      await prisma.edge.update({
        where: { id: keep.id },
        data: {
          interactionCount: totalInteractions,
          sources: allSources,
          channels: allChannels,
          firstSeenAt,
          lastSeenAt,
        },
      });

      // Delete duplicates
      await prisma.edge.deleteMany({
        where: { id: { in: duplicates.map((e) => e.id) } },
      });

      edgesDeleted += duplicates.length;
    }

    console.log(`   ✓ Merged and deleted ${edgesDeleted} duplicate edges`);
  }

  console.log('\n=== CLEANUP COMPLETE ===');
  console.log(`\nSummary:`);
  console.log(`  - Removed ${deleted.count} duplicate persons`);
  console.log(`  - Their edges were automatically deleted by CASCADE`);
  console.log(`  - Final data is clean and deduplicated`);
}

main()
  .catch((error) => {
    console.error('\nError during cleanup:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
