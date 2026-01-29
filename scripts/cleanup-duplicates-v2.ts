/**
 * Cleanup script v2 - Safer approach
 * Deletes duplicate persons and merges their data WITHOUT updating edges in place
 */

import { prisma } from '@wig/db';

async function main() {
  console.log('=== CLEANING UP DUPLICATES (V2 - SAFE APPROACH) ===\n');

  // 1. Find all duplicate persons by name
  console.log('1. Finding duplicate persons by name (no email)...');
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

  const personsToKeep = new Map<string, string>(); // old ID -> keep ID
  const personsToDelete: string[] = [];

  for (const [name, persons] of duplicateGroups) {
    const keep = persons[0]; // Keep oldest
    const duplicates = persons.slice(1);

    duplicates.forEach((dup) => {
      personsToDelete.push(dup.id);
      personsToKeep.set(dup.id, keep.id);
    });
  }

  console.log(`\n2. Will merge ${personsToDelete.length} duplicate persons`);
  console.log(`   Into ${duplicateGroups.length} kept persons`);

  // 2. Get ALL edges that reference persons to be deleted
  console.log('\n3. Fetching affected edges...');
  const affectedEdges = await prisma.edge.findMany({
    where: {
      OR: [
        { fromPersonId: { in: personsToDelete } },
        { toPersonId: { in: personsToDelete } },
      ],
    },
    include: {
      fromPerson: { select: { names: true } },
      toPerson: { select: { names: true } },
    },
  });

  console.log(`   Found ${affectedEdges.length} edges to process`);

  // 3. Delete all affected edges (we'll recreate merged ones)
  console.log('\n4. Deleting affected edges (will recreate merged)...');
  await prisma.edge.deleteMany({
    where: {
      id: { in: affectedEdges.map((e) => e.id) },
    },
  });

  console.log(`   ✓ Deleted ${affectedEdges.length} edges`);

  // 4. Group edges by their remapped from/to pairs
  console.log('\n5. Recreating merged edges...');
  const remappedEdges = new Map<string, typeof affectedEdges>();

  affectedEdges.forEach((edge) => {
    const newFromId = personsToKeep.get(edge.fromPersonId) || edge.fromPersonId;
    const newToId = personsToKeep.get(edge.toPersonId) || edge.toPersonId;

    // Skip self-referencing edges
    if (newFromId === newToId) {
      return;
    }

    const key = `${newFromId}-${newToId}`;
    if (!remappedEdges.has(key)) {
      remappedEdges.set(key, []);
    }
    remappedEdges.get(key)!.push(edge);
  });

  // 5. Create merged edges
  let createdCount = 0;
  for (const [key, edges] of remappedEdges.entries()) {
    const [fromId, toId] = key.split('-');

    // Merge data from all edges
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

    // Create merged edge
    await prisma.edge.create({
      data: {
        fromPersonId: fromId,
        toPersonId: toId,
        relationshipType: edges[0].relationshipType,
        strength: edges[0].strength,
        sources: allSources,
        channels: allChannels,
        firstSeenAt,
        lastSeenAt,
        interactionCount: totalInteractions,
      },
    });

    createdCount++;
  }

  console.log(`   ✓ Created ${createdCount} merged edges`);

  // 6. Update evidence events
  console.log('\n6. Updating evidence events...');
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

  // 7. Delete duplicate persons
  console.log('\n7. Deleting duplicate persons...');
  const deleted = await prisma.person.deleteMany({
    where: {
      id: { in: personsToDelete },
    },
  });

  console.log(`   ✓ Deleted ${deleted.count} duplicate persons`);

  console.log('\n=== CLEANUP COMPLETE ===');
  console.log(`\nSummary:`);
  console.log(`  - Removed ${deleted.count} duplicate persons`);
  console.log(`  - Processed ${affectedEdges.length} edges`);
  console.log(`  - Created ${createdCount} merged edges`);
}

main()
  .catch((error) => {
    console.error('\nError during cleanup:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
