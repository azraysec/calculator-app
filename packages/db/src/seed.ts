/**
 * Database Seed Script for WIG
 *
 * Creates realistic development data including:
 * - Organizations (tech companies)
 * - People (professionals with various roles)
 * - Edges (professional relationships with varying strengths)
 * - Interactions (emails, meetings, calls)
 * - SyncStates (configured data sources)
 * - AuditLogs (sample operations)
 */

import { PrismaClient, InteractionChannel, RelationshipType, SyncStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data (in order to respect foreign keys)
  console.log('🧹 Cleaning existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.syncState.deleteMany();
  await prisma.edge.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.person.deleteMany();
  await prisma.organization.deleteMany();

  // ============================================================================
  // Organizations
  // ============================================================================
  console.log('🏢 Creating organizations...');

  const acmeCorp = await prisma.organization.create({
    data: {
      name: 'Acme Corporation',
      domain: 'acme.com',
      metadata: {
        linkedin: {
          companyId: 'acme-corp',
          size: '1000-5000',
          industry: 'Technology',
        },
        clearbit: {
          founded: 2010,
          employees: 2500,
        },
      },
    },
  });

  const techStartup = await prisma.organization.create({
    data: {
      name: 'TechStartup Inc',
      domain: 'techstartup.io',
      metadata: {
        linkedin: {
          companyId: 'techstartup-inc',
          size: '50-200',
          industry: 'Software',
        },
      },
    },
  });

  const consultingFirm = await prisma.organization.create({
    data: {
      name: 'Global Consulting Partners',
      domain: 'gcp.com',
      metadata: {
        linkedin: {
          companyId: 'global-consulting',
          size: '10000+',
          industry: 'Consulting',
        },
      },
    },
  });

  // ============================================================================
  // People
  // ============================================================================
  console.log('👥 Creating people...');

  const alice = await prisma.person.create({
    data: {
      names: ['Alice Johnson', 'Alice M. Johnson', 'A. Johnson'],
      emails: ['alice@acme.com', 'alice.johnson@gmail.com'],
      phones: ['+1-555-0101', '555-0101'],
      socialHandles: {
        linkedin: 'alice-johnson',
        twitter: '@alicejohnson',
        github: 'alicej',
      },
      title: 'VP of Engineering',
      organizationId: acmeCorp.id,
      metadata: {
        linkedin: {
          profileUrl: 'https://linkedin.com/in/alice-johnson',
          connections: 2500,
        },
        gmail: {
          lastSyncedAt: new Date().toISOString(),
          totalEmails: 15234,
        },
      },
    },
  });

  const bob = await prisma.person.create({
    data: {
      names: ['Bob Smith', 'Robert Smith', 'Bob'],
      emails: ['bob@techstartup.io', 'bob.smith@outlook.com'],
      phones: ['+1-555-0102'],
      socialHandles: {
        linkedin: 'bob-smith-tech',
        github: 'bobsmith',
      },
      title: 'CTO',
      organizationId: techStartup.id,
      metadata: {
        linkedin: {
          profileUrl: 'https://linkedin.com/in/bob-smith-tech',
          connections: 800,
        },
      },
    },
  });

  const carol = await prisma.person.create({
    data: {
      names: ['Carol Davis', 'Carol D.'],
      emails: ['carol@acme.com', 'carol.davis@gmail.com'],
      phones: ['+1-555-0103'],
      socialHandles: {
        linkedin: 'carol-davis',
        twitter: '@caroldavis',
      },
      title: 'Senior Software Engineer',
      organizationId: acmeCorp.id,
      metadata: {
        linkedin: {
          profileUrl: 'https://linkedin.com/in/carol-davis',
          connections: 450,
        },
      },
    },
  });

  const david = await prisma.person.create({
    data: {
      names: ['David Lee', 'Dave Lee', 'D. Lee'],
      emails: ['david@gcp.com', 'david.lee@proton.me'],
      phones: ['+1-555-0104'],
      socialHandles: {
        linkedin: 'david-lee-consultant',
      },
      title: 'Principal Consultant',
      organizationId: consultingFirm.id,
      metadata: {
        linkedin: {
          profileUrl: 'https://linkedin.com/in/david-lee-consultant',
          connections: 3200,
        },
      },
    },
  });

  const eve = await prisma.person.create({
    data: {
      names: ['Eve Martinez', 'Evelyn Martinez'],
      emails: ['eve@techstartup.io'],
      phones: ['+1-555-0105'],
      socialHandles: {
        linkedin: 'eve-martinez',
        github: 'evemartinez',
      },
      title: 'Product Manager',
      organizationId: techStartup.id,
      metadata: {
        linkedin: {
          profileUrl: 'https://linkedin.com/in/eve-martinez',
          connections: 1100,
        },
      },
    },
  });

  const frank = await prisma.person.create({
    data: {
      names: ['Frank Wilson', 'Francis Wilson', 'Frank W.'],
      emails: ['frank.wilson@gmail.com', 'frank@acme.com'],
      phones: ['+1-555-0106'],
      socialHandles: {
        linkedin: 'frank-wilson',
        twitter: '@frankwilson',
      },
      title: 'Engineering Manager',
      organizationId: acmeCorp.id,
      metadata: {
        linkedin: {
          profileUrl: 'https://linkedin.com/in/frank-wilson',
          connections: 920,
        },
      },
    },
  });

  const grace = await prisma.person.create({
    data: {
      names: ['Grace Chen', 'Grace C.'],
      emails: ['grace@gcp.com'],
      phones: ['+1-555-0107'],
      socialHandles: {
        linkedin: 'grace-chen-gcp',
      },
      title: 'Senior Partner',
      organizationId: consultingFirm.id,
      metadata: {
        linkedin: {
          profileUrl: 'https://linkedin.com/in/grace-chen-gcp',
          connections: 5000,
        },
      },
    },
  });

  const henry = await prisma.person.create({
    data: {
      names: ['Henry Park', 'Henry P.'],
      emails: ['henry@techstartup.io', 'hpark@gmail.com'],
      phones: ['+1-555-0108'],
      socialHandles: {
        linkedin: 'henry-park-startup',
        github: 'henrypark',
      },
      title: 'Lead Developer',
      organizationId: techStartup.id,
      metadata: {
        linkedin: {
          profileUrl: 'https://linkedin.com/in/henry-park-startup',
          connections: 680,
        },
      },
    },
  });

  // ============================================================================
  // Edges (Relationships)
  // ============================================================================
  console.log('🔗 Creating relationship edges...');

  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  // Alice <-> Bob (strong connection, recent interactions)
  await prisma.edge.create({
    data: {
      fromPersonId: alice.id,
      toPersonId: bob.id,
      relationshipType: RelationshipType.knows,
      strength: 0.92,
      strengthFactors: {
        recency: 0.95,
        frequency: 0.88,
        mutuality: 1.0,
        channels: 0.9,
      },
      sources: ['gmail', 'linkedin', 'calendar'],
      channels: ['email', 'meeting', 'call'],
      firstSeenAt: oneYearAgo,
      lastSeenAt: now,
      interactionCount: 47,
    },
  });

  // Alice <-> Carol (colleagues, strong connection)
  await prisma.edge.create({
    data: {
      fromPersonId: alice.id,
      toPersonId: carol.id,
      relationshipType: RelationshipType.worked_at,
      strength: 0.88,
      strengthFactors: {
        recency: 0.85,
        frequency: 0.92,
        mutuality: 0.95,
        channels: 0.8,
      },
      sources: ['gmail', 'calendar', 'slack'],
      channels: ['email', 'meeting', 'message'],
      firstSeenAt: new Date('2022-03-15'),
      lastSeenAt: oneMonthAgo,
      interactionCount: 156,
    },
  });

  // Bob <-> Eve (colleagues at TechStartup)
  await prisma.edge.create({
    data: {
      fromPersonId: bob.id,
      toPersonId: eve.id,
      relationshipType: RelationshipType.worked_at,
      strength: 0.85,
      strengthFactors: {
        recency: 0.9,
        frequency: 0.8,
        mutuality: 0.85,
        channels: 0.85,
      },
      sources: ['calendar', 'slack', 'linkedin'],
      channels: ['meeting', 'message'],
      firstSeenAt: new Date('2023-01-10'),
      lastSeenAt: now,
      interactionCount: 89,
    },
  });

  // David <-> Grace (colleagues at consulting firm)
  await prisma.edge.create({
    data: {
      fromPersonId: david.id,
      toPersonId: grace.id,
      relationshipType: RelationshipType.worked_at,
      strength: 0.78,
      strengthFactors: {
        recency: 0.7,
        frequency: 0.85,
        mutuality: 0.8,
        channels: 0.75,
      },
      sources: ['outlook', 'linkedin'],
      channels: ['email', 'meeting'],
      firstSeenAt: new Date('2020-06-01'),
      lastSeenAt: sixMonthsAgo,
      interactionCount: 234,
    },
  });

  // Alice <-> David (professional acquaintance)
  await prisma.edge.create({
    data: {
      fromPersonId: alice.id,
      toPersonId: david.id,
      relationshipType: RelationshipType.knows,
      strength: 0.65,
      strengthFactors: {
        recency: 0.6,
        frequency: 0.5,
        mutuality: 0.8,
        channels: 0.7,
      },
      sources: ['gmail', 'linkedin'],
      channels: ['email'],
      firstSeenAt: new Date('2021-09-20'),
      lastSeenAt: sixMonthsAgo,
      interactionCount: 12,
    },
  });

  // Carol <-> Frank (colleagues)
  await prisma.edge.create({
    data: {
      fromPersonId: carol.id,
      toPersonId: frank.id,
      relationshipType: RelationshipType.worked_at,
      strength: 0.82,
      strengthFactors: {
        recency: 0.8,
        frequency: 0.85,
        mutuality: 0.9,
        channels: 0.75,
      },
      sources: ['gmail', 'slack', 'calendar'],
      channels: ['email', 'message', 'meeting'],
      firstSeenAt: new Date('2022-03-15'),
      lastSeenAt: oneMonthAgo,
      interactionCount: 203,
    },
  });

  // Bob <-> Henry (colleagues at TechStartup)
  await prisma.edge.create({
    data: {
      fromPersonId: bob.id,
      toPersonId: henry.id,
      relationshipType: RelationshipType.worked_at,
      strength: 0.9,
      strengthFactors: {
        recency: 0.95,
        frequency: 0.88,
        mutuality: 0.92,
        channels: 0.85,
      },
      sources: ['slack', 'github', 'calendar'],
      channels: ['message', 'meeting'],
      firstSeenAt: new Date('2023-01-10'),
      lastSeenAt: now,
      interactionCount: 312,
    },
  });

  // Alice <-> Frank (manager-report relationship)
  await prisma.edge.create({
    data: {
      fromPersonId: alice.id,
      toPersonId: frank.id,
      relationshipType: RelationshipType.worked_at,
      strength: 0.94,
      strengthFactors: {
        recency: 0.95,
        frequency: 0.95,
        mutuality: 0.98,
        channels: 0.88,
      },
      sources: ['gmail', 'calendar', 'slack'],
      channels: ['email', 'meeting', 'message'],
      firstSeenAt: new Date('2021-05-01'),
      lastSeenAt: now,
      interactionCount: 487,
    },
  });

  // ============================================================================
  // Interactions
  // ============================================================================
  console.log('💬 Creating interactions...');

  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  await prisma.interaction.create({
    data: {
      sourceId: 'gmail-msg-001',
      sourceName: 'gmail',
      timestamp: lastWeek,
      participants: ['alice@acme.com', 'bob@techstartup.io'],
      channel: InteractionChannel.email,
      direction: 'two_way',
      metadata: {
        subject: 'Re: Partnership Discussion',
        threadId: 'thread-abc-123',
        hasAttachments: true,
      },
    },
  });

  await prisma.interaction.create({
    data: {
      sourceId: 'cal-event-001',
      sourceName: 'google-calendar',
      timestamp: now,
      participants: ['alice@acme.com', 'carol@acme.com', 'frank@acme.com'],
      channel: InteractionChannel.meeting,
      direction: 'two_way',
      metadata: {
        title: 'Engineering Weekly Sync',
        duration: 60,
        location: 'Conference Room A',
        recurring: true,
      },
    },
  });

  await prisma.interaction.create({
    data: {
      sourceId: 'slack-msg-001',
      sourceName: 'slack',
      timestamp: now,
      participants: ['bob@techstartup.io', 'eve@techstartup.io', 'henry@techstartup.io'],
      channel: InteractionChannel.message,
      direction: 'two_way',
      metadata: {
        channelName: 'engineering',
        messageCount: 15,
        hasThreads: true,
      },
    },
  });

  await prisma.interaction.create({
    data: {
      sourceId: 'zoom-call-001',
      sourceName: 'zoom',
      timestamp: sixMonthsAgo,
      participants: ['alice@acme.com', 'david@gcp.com'],
      channel: InteractionChannel.call,
      direction: 'two_way',
      metadata: {
        duration: 45,
        recordingAvailable: false,
      },
    },
  });

  await prisma.interaction.create({
    data: {
      sourceId: 'gmail-msg-002',
      sourceName: 'gmail',
      timestamp: oneMonthAgo,
      participants: ['carol@acme.com', 'frank@acme.com'],
      channel: InteractionChannel.email,
      direction: 'two_way',
      metadata: {
        subject: 'Code Review: Feature X',
        labels: ['work', 'code-review'],
      },
    },
  });

  // ============================================================================
  // Sync States
  // ============================================================================
  console.log('🔄 Creating sync states...');

  await prisma.syncState.create({
    data: {
      sourceName: 'gmail',
      cursor: 'gmail-cursor-abc123',
      lastSyncAt: now,
      lastSuccessAt: now,
      status: SyncStatus.success,
      metadata: {
        totalRecords: 15234,
        newRecords: 23,
        updatedRecords: 8,
        errors: [],
      },
    },
  });

  await prisma.syncState.create({
    data: {
      sourceName: 'linkedin',
      cursor: 'li-cursor-xyz789',
      lastSyncAt: oneMonthAgo,
      lastSuccessAt: oneMonthAgo,
      status: SyncStatus.success,
      metadata: {
        totalConnections: 2500,
        newConnections: 12,
      },
    },
  });

  await prisma.syncState.create({
    data: {
      sourceName: 'calendar',
      cursor: 'cal-cursor-def456',
      lastSyncAt: lastWeek,
      lastSuccessAt: lastWeek,
      status: SyncStatus.success,
      metadata: {
        totalEvents: 489,
        newEvents: 5,
      },
    },
  });

  await prisma.syncState.create({
    data: {
      sourceName: 'slack',
      cursor: null,
      lastSyncAt: null,
      lastSuccessAt: null,
      status: SyncStatus.idle,
      metadata: {
        configured: true,
        workspaces: ['acme-corp', 'techstartup'],
      },
    },
  });

  // ============================================================================
  // Audit Logs
  // ============================================================================
  console.log('📝 Creating audit logs...');

  const correlationId1 = 'corr-001-' + Date.now();

  await prisma.auditLog.create({
    data: {
      correlationId: correlationId1,
      action: 'data.synced',
      actorId: 'system',
      entityType: 'SyncState',
      entityId: 'gmail',
      metadata: {
        source: 'gmail',
        recordsProcessed: 23,
        duration: 4521,
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      correlationId: 'corr-002-' + Date.now(),
      action: 'person.created',
      actorId: 'system',
      entityType: 'Person',
      entityId: alice.id,
      metadata: {
        source: 'gmail',
        email: 'alice@acme.com',
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      correlationId: 'corr-003-' + Date.now(),
      action: 'edge.created',
      actorId: 'system',
      entityType: 'Edge',
      entityId: alice.id,
      metadata: {
        from: alice.id,
        to: bob.id,
        strength: 0.92,
      },
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log(`  - Organizations: ${await prisma.organization.count()}`);
  console.log(`  - People: ${await prisma.person.count()}`);
  console.log(`  - Edges: ${await prisma.edge.count()}`);
  console.log(`  - Interactions: ${await prisma.interaction.count()}`);
  console.log(`  - Sync States: ${await prisma.syncState.count()}`);
  console.log(`  - Audit Logs: ${await prisma.auditLog.count()}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
