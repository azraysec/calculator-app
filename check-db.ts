import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDb() {
  try {
    const personCount = await prisma.person.count();
    const edgeCount = await prisma.edge.count();
    const orgCount = await prisma.organization.count();

    console.log('Database counts:');
    console.log('  People:', personCount);
    console.log('  Edges:', edgeCount);
    console.log('  Organizations:', orgCount);

    const people = await prisma.person.findMany({
      select: { id: true, names: true },
      take: 5,
    });

    console.log('\nFirst 5 people:');
    people.forEach(p => console.log(`  - ${p.id}: ${p.names[0]}`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDb();
