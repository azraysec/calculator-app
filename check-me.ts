import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMe() {
  try {
    const me = await prisma.person.findUnique({
      where: { id: 'me' },
    });

    console.log('User "me":', me ? 'EXISTS' : 'NOT FOUND');
    if (me) {
      console.log('  Names:', me.names);
      console.log('  Emails:', me.emails);
    }

    // Check all people
    const allPeople = await prisma.person.findMany({
      select: { id: true, names: true, deletedAt: true },
    });

    console.log(`\nTotal people: ${allPeople.length}`);
    console.log('People:');
    allPeople.forEach(p => console.log(`  - ${p.id}: ${p.names[0]} (deleted: ${p.deletedAt ? 'YES' : 'NO'})`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMe();
