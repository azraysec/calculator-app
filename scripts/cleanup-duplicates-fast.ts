/**
 * Fast cleanup - Delete duplicates without updating evidence events
 * Evidence events will just point to deleted persons (acceptable)
 */

import { prisma } from '@wig/db';

async function main() {
  console.log('=== FAST CLEANUP ===\n');

  const allPersons = await prisma.person.findMany({
    where: {
      deletedAt: null,
      emails: { isEmpty: true },
    },
    select: {
      id: true,
      names: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
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

  console.log(`Found ${duplicateGroups.length} duplicate groups`);

  const personsToDelete: string[] = [];
  for (const [_, persons] of duplicateGroups) {
    const duplicates = persons.slice(1);
    duplicates.forEach((dup) => personsToDelete.push(dup.id));
  }

  console.log(`Deleting ${personsToDelete.length} duplicates...`);

  const deleted = await prisma.person.deleteMany({
    where: {
      id: { in: personsToDelete },
    },
  });

  console.log(`✓ Deleted ${deleted.count} persons`);
  console.log(`✓ CASCADE deleted their edges`);

  // Clean up remaining edge duplicates
  console.log('\nCleaning duplicate edges...');
  const allEdges = await prisma.edge.findMany({
    select: {
      id: true,
      fromPersonId: true,
      toPersonId: true,
      interactionCount: true,
      sources: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const edgeMap = new Map<string, typeof allEdges>();
  allEdges.forEach((edge) => {
    const key = `${edge.fromPersonId}-${edge.toPersonId}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, []);
    }
    edgeMap.get(key)!.push(edge);
  });

  const duplicateEdges = Array.from(edgeMap.entries()).filter(
    ([_, edges]) => edges.length > 1
  );

  if (duplicateEdges.length > 0) {
    let edgesDeleted = 0;
    for (const [_, edges] of duplicateEdges) {
      const keep = edges[0];
      const duplicates = edges.slice(1);

      const total = edges.reduce((sum, e) => sum + e.interactionCount, 0);
      const sources = Array.from(new Set(edges.flatMap((e) => e.sources)));

      await prisma.edge.update({
        where: { id: keep.id },
        data: { interactionCount: total, sources },
      });

      await prisma.edge.deleteMany({
        where: { id: { in: duplicates.map((e) => e.id) } },
      });

      edgesDeleted += duplicates.length;
    }
    console.log(`✓ Merged ${edgesDeleted} duplicate edges`);
  }

  console.log('\n=== DONE ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
