/**
 * Cleanup script to remove duplicate persons and evidence events
 * Run this to clean up after multiple uploads created duplicates
 */

import { prisma } from '@wig/db';

async function main() {
  console.log('=== CLEANING UP DUPLICATES ===\n');

  // 1. Find duplicate persons by email
  console.log('1. Finding duplicate persons by email...');
  const allPersons = await prisma.person.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      names: true,
      emails: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' }, // Keep oldest
  });

  const emailMap = new Map<string, typeof allPersons>();
  allPersons.forEach((person) => {
    person.emails.forEach((email) => {
      if (!emailMap.has(email)) {
        emailMap.set(email, []);
      }
      emailMap.get(email)!.push(person);
    });
  });

  const duplicatesByEmail = Array.from(emailMap.entries()).filter(
    ([_, persons]) => persons.length > 1
  );

  console.log(`   Found ${duplicatesByEmail.length} duplicate email groups`);

  let personsToDelete: string[] = [];
  let personsToKeep: Map<string, string> = new Map(); // old ID -> keep ID

  for (const [email, persons] of duplicatesByEmail) {
    const keep = persons[0]; // Keep oldest
    const duplicates = persons.slice(1);

    console.log(`   Email: ${email}`);
    console.log(`     Keeping: ${keep.id} (${keep.names.join(', ')})`);
    console.log(`     Removing: ${duplicates.length} duplicates`);

    duplicates.forEach((dup) => {
      personsToDelete.push(dup.id);
      personsToKeep.set(dup.id, keep.id);
    });
  }

  // 2. Find duplicate persons by name (no email)
  console.log('\n2. Finding duplicate persons by name (no email)...');
  const personsWithoutEmail = allPersons.filter((p) => p.emails.length === 0);

  const nameMap = new Map<string, typeof allPersons>();
  personsWithoutEmail.forEach((person) => {
    person.names.forEach((name) => {
      if (!nameMap.has(name)) {
        nameMap.set(name, []);
      }
      nameMap.get(name)!.push(person);
    });
  });

  const duplicatesByName = Array.from(nameMap.entries()).filter(
    ([_, persons]) => persons.length > 1
  );

  console.log(`   Found ${duplicatesByName.length} duplicate name groups`);

  for (const [name, persons] of duplicatesByName) {
    const keep = persons[0]; // Keep oldest
    const duplicates = persons.slice(1);

    console.log(`   Name: ${name}`);
    console.log(`     Keeping: ${keep.id}`);
    console.log(`     Removing: ${duplicates.length} duplicates`);

    duplicates.forEach((dup) => {
      if (!personsToDelete.includes(dup.id)) {
        personsToDelete.push(dup.id);
        personsToKeep.set(dup.id, keep.id);
      }
    });
  }

  if (personsToDelete.length === 0) {
    console.log('\n✓ No duplicate persons found!');
    return;
  }

  console.log(`\n3. Will delete ${personsToDelete.length} duplicate persons`);
  console.log('   Updating references to point to kept persons...');

  // 3. Update all edges that reference deleted persons
  for (const [oldId, keepId] of personsToKeep.entries()) {
    // Update edges where deleted person is fromPerson
    await prisma.edge.updateMany({
      where: { fromPersonId: oldId },
      data: { fromPersonId: keepId },
    });

    // Update edges where deleted person is toPerson
    await prisma.edge.updateMany({
      where: { toPersonId: oldId },
      data: { toPersonId: keepId },
    });

    // Update evidence events
    await prisma.evidenceEvent.updateMany({
      where: { subjectPersonId: oldId },
      data: { subjectPersonId: keepId },
    });

    await prisma.evidenceEvent.updateMany({
      where: { objectPersonId: oldId },
      data: { objectPersonId: keepId },
    });
  }

  // 4. Delete duplicate persons
  console.log('   Deleting duplicate persons...');
  const deleted = await prisma.person.deleteMany({
    where: {
      id: { in: personsToDelete },
    },
  });

  console.log(`   ✓ Deleted ${deleted.count} duplicate persons`);

  // 5. Remove duplicate edges (same from/to pair)
  console.log('\n4. Cleaning up duplicate edges...');

  // Find duplicate edges
  const edges = await prisma.edge.findMany({
    select: {
      id: true,
      fromPersonId: true,
      toPersonId: true,
      createdAt: true,
      interactionCount: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const edgeMap = new Map<string, typeof edges>();
  edges.forEach((edge) => {
    const key = `${edge.fromPersonId}-${edge.toPersonId}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, []);
    }
    edgeMap.get(key)!.push(edge);
  });

  const duplicateEdges = Array.from(edgeMap.entries()).filter(
    ([_, edges]) => edges.length > 1
  );

  console.log(`   Found ${duplicateEdges.length} duplicate edge groups`);

  let edgesToDelete: string[] = [];
  for (const [key, edgeList] of duplicateEdges) {
    const keep = edgeList[0]; // Keep oldest
    const duplicates = edgeList.slice(1);

    // Sum up interaction counts
    const totalInteractions = edgeList.reduce(
      (sum, e) => sum + e.interactionCount,
      0
    );

    // Update the kept edge with total interactions
    await prisma.edge.update({
      where: { id: keep.id },
      data: { interactionCount: totalInteractions },
    });

    duplicates.forEach((dup) => edgesToDelete.push(dup.id));
  }

  if (edgesToDelete.length > 0) {
    const deletedEdges = await prisma.edge.deleteMany({
      where: { id: { in: edgesToDelete } },
    });
    console.log(`   ✓ Deleted ${deletedEdges.count} duplicate edges`);
  } else {
    console.log('   ✓ No duplicate edges found');
  }

  console.log('\n=== CLEANUP COMPLETE ===');
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
