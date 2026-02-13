/**
 * Run Gmail sync locally against production database
 * This bypasses Vercel and uses local env vars
 * Self-contained - doesn't import from @wig/adapters to avoid monorepo issues
 */

import { prisma } from '../lib/prisma';
import { google } from 'googleapis';

async function syncGmail() {
  const user = await prisma.user.findFirst({
    where: { email: 'ariel.zamir@raysecurity.io' },
    select: {
      id: true,
      email: true,
      googleRefreshToken: true,
      googleAccessToken: true,
      person: { select: { id: true } },
    },
  });

  if (!user?.googleRefreshToken) {
    console.log('No refresh token found');
    await prisma.$disconnect();
    return;
  }

  console.log('Starting sync for:', user.email);
  console.log('User ID:', user.id);

  // Initialize OAuth2 client directly
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: user.googleRefreshToken,
    access_token: user.googleAccessToken || undefined,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Validate connection
  try {
    await gmail.users.getProfile({ userId: 'me' });
    console.log('Connection valid: true');
  } catch (err: any) {
    console.log('Connection valid: false');
    console.log('Error:', err.message);
    await prisma.$disconnect();
    return;
  }

  let pageToken: string | undefined;
  let totalMessages = 0;
  let totalContacts = 0;
  let page = 0;

  console.log('');
  console.log('Starting full sync...');

  while (true) {
    page++;

    // List messages
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 100,
      pageToken,
    });

    const messages = listResponse.data.messages || [];
    console.log(`Page ${page}: ${messages.length} messages`);

    for (const msg of messages) {
      if (!msg.id) continue;

      // Get full message
      const msgResponse = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date'],
      });

      const headers = msgResponse.data.payload?.headers || [];
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const to = headers.find((h: any) => h.name === 'To')?.value || '';
      const cc = headers.find((h: any) => h.name === 'Cc')?.value || '';

      // Extract email addresses
      const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
      const participants = new Set<string>();

      [from, to, cc].forEach(field => {
        const matches = field.match(emailRegex);
        if (matches) {
          matches.forEach(email => participants.add(email.toLowerCase()));
        }
      });

      // Remove user's own email
      participants.delete(user.email!.toLowerCase());

      totalMessages++;

      // Process each participant
      for (const participant of participants) {
        const existing = await prisma.person.findFirst({
          where: {
            userId: user.id,
            emails: { has: participant },
          },
        });

        if (!existing) {
          await prisma.person.create({
            data: {
              userId: user.id,
              names: [participant.split('@')[0]],
              emails: [participant],
              phones: [],
              socialHandles: {},
              metadata: { source: 'gmail' } as any,
            },
          });
          totalContacts++;
        }

        // Create/update edge if user has person record
        if (user.person?.id) {
          const existingPerson = existing || await prisma.person.findFirst({
            where: { userId: user.id, emails: { has: participant } },
          });

          if (existingPerson && existingPerson.id !== user.person.id) {
            const isSent = from.toLowerCase().includes(user.email!.toLowerCase());
            const fromPersonId = isSent ? user.person.id : existingPerson.id;
            const toPersonId = isSent ? existingPerson.id : user.person.id;

            await prisma.edge.upsert({
              where: {
                fromPersonId_toPersonId: { fromPersonId, toPersonId },
              },
              create: {
                fromPersonId,
                toPersonId,
                relationshipType: 'interacted_with',
                strength: 0.3,
                sources: ['gmail'],
                channels: ['email'],
                interactionCount: 1,
                firstSeenAt: new Date(),
                lastSeenAt: new Date(),
              },
              update: {
                interactionCount: { increment: 1 },
                lastSeenAt: new Date(),
              },
            });
          }
        }
      }
    }

    console.log(`  Total so far: ${totalMessages} messages, ${totalContacts} new contacts`);

    if (!listResponse.data.nextPageToken) {
      break;
    }

    pageToken = listResponse.data.nextPageToken;
  }

  // Update last sync time
  await prisma.user.update({
    where: { id: user.id },
    data: { lastGmailSyncAt: new Date() },
  });

  console.log('');
  console.log('='.repeat(50));
  console.log('SYNC COMPLETE!');
  console.log(`Total messages: ${totalMessages}`);
  console.log(`Total new contacts: ${totalContacts}`);
  console.log(`Total pages: ${page}`);
  console.log('='.repeat(50));

  await prisma.$disconnect();
}

syncGmail().catch(async (err) => {
  console.error('Sync failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
