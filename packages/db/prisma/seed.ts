/**
 * Seed script for WIG database
 * Creates test data for development and demonstration
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data (for development)
  await prisma.edge.deleteMany();
  await prisma.person.deleteMany();
  await prisma.organization.deleteMany();

  console.log('✓ Cleared existing data');

  // Create organizations
  const startupCo = await prisma.organization.create({
    data: {
      name: 'Startup Co',
      domain: 'startup.com',
    },
  });

  const bigCorp = await prisma.organization.create({
    data: {
      name: 'Big Corp',
      domain: 'bigcorp.com',
    },
  });

  console.log('✓ Created 2 organizations');

  // Create "You" (the user)
  const you = await prisma.person.upsert({
    where: { id: 'me' },
    update: {},
    create: {
      id: 'me',
      names: ['You', 'Your Name'],
      emails: ['you@example.com'],
      phones: ['+1-555-0100'],
      title: 'Software Engineer',
    },
  });

  // Create target person (person we want to meet)
  const jane = await prisma.person.create({
    data: {
      names: ['Jane Doe'],
      emails: ['jane@bigcorp.com'],
      phones: ['+1-555-0104'],
      title: 'CTO',
      organizationId: bigCorp.id,
    },
  });

  // Create intermediary people
  const alice = await prisma.person.create({
    data: {
      names: ['Alice Smith'],
      emails: ['alice@startup.com'],
      phones: ['+1-555-0101'],
      title: 'Founder & CEO',
      organizationId: startupCo.id,
    },
  });

  const bob = await prisma.person.create({
    data: {
      names: ['Bob Johnson'],
      emails: ['bob@bigcorp.com'],
      phones: ['+1-555-0102'],
      title: 'VP of Engineering',
      organizationId: bigCorp.id,
    },
  });

  const charlie = await prisma.person.create({
    data: {
      names: ['Charlie Brown'],
      emails: ['charlie@startup.com'],
      phones: ['+1-555-0103'],
      title: 'CTO',
      organizationId: startupCo.id,
    },
  });

  console.log('✓ Created 5 people');

  // Create edges (relationships)
  const edges = [
    // Path 1: You → Alice → Jane (2 hops, strong connection)
    {
      fromPersonId: you.id,
      toPersonId: alice.id,
      relationshipType: 'knows',
      strength: 0.85,
      sources: ['linkedin', 'gmail'],
      channels: ['email', 'meeting'],
      firstSeenAt: new Date('2023-01-01'),
      lastSeenAt: new Date('2024-12-01'),
      interactionCount: 15,
      strengthFactors: {
        recency: 0.9,
        frequency: 0.8,
        mutuality: 1.0,
        channels: 0.8,
      },
    },
    {
      fromPersonId: alice.id,
      toPersonId: jane.id,
      relationshipType: 'worked_at',
      strength: 0.72,
      sources: ['linkedin'],
      channels: ['meeting'],
      firstSeenAt: new Date('2022-05-01'),
      lastSeenAt: new Date('2024-11-15'),
      interactionCount: 8,
      strengthFactors: {
        recency: 0.75,
        frequency: 0.65,
        mutuality: 0.8,
        channels: 0.6,
      },
    },

    // Path 2: You → Bob → Jane (2 hops, weaker connection)
    {
      fromPersonId: you.id,
      toPersonId: bob.id,
      relationshipType: 'knows',
      strength: 0.65,
      sources: ['linkedin'],
      channels: ['message'],
      firstSeenAt: new Date('2023-06-01'),
      lastSeenAt: new Date('2024-10-20'),
      interactionCount: 5,
      strengthFactors: {
        recency: 0.65,
        frequency: 0.6,
        mutuality: 0.7,
        channels: 0.4,
      },
    },
    {
      fromPersonId: bob.id,
      toPersonId: jane.id,
      relationshipType: 'worked_at',
      strength: 0.88,
      sources: ['gmail', 'calendar'],
      channels: ['email', 'meeting'],
      firstSeenAt: new Date('2020-01-01'),
      lastSeenAt: new Date('2024-12-10'),
      interactionCount: 120,
      strengthFactors: {
        recency: 0.95,
        frequency: 0.85,
        mutuality: 0.9,
        channels: 0.8,
      },
    },

    // Path 3: You → Alice → Charlie → Bob → Jane (4 hops, longer path)
    {
      fromPersonId: alice.id,
      toPersonId: charlie.id,
      relationshipType: 'worked_at',
      strength: 0.92,
      sources: ['gmail', 'slack'],
      channels: ['email', 'message', 'meeting'],
      firstSeenAt: new Date('2021-03-01'),
      lastSeenAt: new Date('2024-12-15'),
      interactionCount: 200,
      strengthFactors: {
        recency: 0.98,
        frequency: 0.9,
        mutuality: 0.95,
        channels: 1.0,
      },
    },
    {
      fromPersonId: charlie.id,
      toPersonId: bob.id,
      relationshipType: 'knows',
      strength: 0.68,
      sources: ['linkedin'],
      channels: ['meeting'],
      firstSeenAt: new Date('2023-03-01'),
      lastSeenAt: new Date('2024-09-01'),
      interactionCount: 6,
      strengthFactors: {
        recency: 0.6,
        frequency: 0.65,
        mutuality: 0.75,
        channels: 0.6,
      },
    },
  ];

  for (const edge of edges) {
    await prisma.edge.create({ data: edge });
  }

  console.log(`✓ Created ${edges.length} edges`);

  // Create some interactions for evidence
  await prisma.interaction.createMany({
    data: [
      {
        sourceId: 'gmail-msg-001',
        sourceName: 'gmail',
        timestamp: new Date('2024-12-01T10:00:00Z'),
        participants: ['you@example.com', 'alice@startup.com'],
        channel: 'email',
        direction: 'two_way',
        metadata: {
          subject: 'Coffee catch-up?',
          snippet: 'Hey Alice, would love to catch up over coffee...',
        },
      },
      {
        sourceId: 'cal-event-001',
        sourceName: 'calendar',
        timestamp: new Date('2024-12-10T14:00:00Z'),
        participants: ['bob@bigcorp.com', 'jane@bigcorp.com'],
        channel: 'meeting',
        direction: 'two_way',
        metadata: {
          subject: 'Engineering Sync',
          attendees: ['bob@bigcorp.com', 'jane@bigcorp.com'],
          duration: 30,
        },
      },
      {
        sourceId: 'gmail-msg-002',
        sourceName: 'gmail',
        timestamp: new Date('2024-12-15T09:30:00Z'),
        participants: ['alice@startup.com', 'charlie@startup.com'],
        channel: 'email',
        direction: 'two_way',
        metadata: {
          subject: 'Q4 Planning',
          snippet: "Let's schedule Q4 planning session...",
        },
      },
    ],
  });

  console.log('✓ Created sample interactions');

  // Print summary
  const stats = {
    people: await prisma.person.count(),
    edges: await prisma.edge.count(),
    organizations: await prisma.organization.count(),
    interactions: await prisma.interaction.count(),
  };

  console.log('\n✅ Seed completed successfully!');
  console.log('\nDatabase Summary:');
  console.log(`  👥 ${stats.people} people`);
  console.log(`  🔗 ${stats.edges} connections`);
  console.log(`  🏢 ${stats.organizations} organizations`);
  console.log(`  💬 ${stats.interactions} interactions`);
  console.log('\n💡 Try searching for "Jane" in the UI to see introduction paths!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
