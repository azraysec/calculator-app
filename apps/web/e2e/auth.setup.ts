/**
 * Playwright Authentication Setup
 *
 * Creates an authenticated session for E2E tests by:
 * 1. Creating a test user in the database
 * 2. Generating a valid JWT token (matching NextAuth JWT strategy)
 * 3. Setting the session cookie
 *
 * This setup runs once before all tests and stores the authenticated state.
 */

import { test as setup } from '@playwright/test';
import { prisma } from '@wig/db';
import { encode } from '@auth/core/jwt';

const authFile = 'playwright/.auth/user.json';

// Must match the AUTH_SECRET from playwright.config.ts
const AUTH_SECRET = process.env.AUTH_SECRET || 'test-secret-for-local-development-only-do-not-use-in-production-a1b2c3d4e5f6';

/**
 * Encode a JWT token using NextAuth's own encode function
 * This ensures the token format matches exactly
 */
async function encodeJwt(payload: any): Promise<string> {
  const token = await encode({
    token: payload,
    secret: AUTH_SECRET,
    salt: 'authjs.session-token', // NextAuth uses the cookie name as salt
  });
  return token;
}

setup('authenticate', async ({ context }) => {
  // Create a test user with a valid session
  const testUserEmail = 'test@playwright.dev';
  const testUserName = 'Test User';

  try {
    // Clean up existing test user and related data
    // Delete person with id 'me' first (if exists)
    await prisma.person.deleteMany({
      where: { id: 'me' }
    });

    // Delete test user and cascade will clean up related data
    await prisma.user.deleteMany({
      where: { email: testUserEmail }
    });

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        name: testUserName,
      },
    });

    console.log(`Created test user: ${user.id}`);

    // Create an account record (required by NextAuth)
    await prisma.account.create({
      data: {
        userId: user.id,
        type: 'oauth',
        provider: 'google',
        providerAccountId: 'test-google-id',
        access_token: 'test-access-token',
        token_type: 'Bearer',
        scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
      },
    });

    // Generate JWT token (NextAuth JWT strategy)
    const expires = new Date();
    expires.setMonth(expires.getMonth() + 1); // 1 month from now

    // Create JWT payload matching NextAuth format
    const jwtPayload = {
      id: user.id,
      name: testUserName,
      email: testUserEmail,
      picture: null,
      sub: user.id, // NextAuth uses sub for user ID
    };

    const sessionToken = await encodeJwt(jwtPayload);
    console.log(`Generated JWT token for user: ${user.id}`);

    console.log(`Created session token: ${sessionToken}`);

    // Create test data for this user
    console.log('Creating test data for user...');

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

    // Create people for this user
    const alice = await prisma.person.create({
      data: {
        userId: user.id,
        names: ['Alice Johnson'],
        emails: ['alice@startup.com'],
        title: 'Founder & CEO',
        organizationId: startupCo.id,
      },
    });

    const bob = await prisma.person.create({
      data: {
        userId: user.id,
        names: ['Bob Smith'],
        emails: ['bob@bigcorp.com'],
        title: 'VP of Engineering',
        organizationId: bigCorp.id,
      },
    });

    const charlie = await prisma.person.create({
      data: {
        userId: user.id,
        names: ['Charlie Brown'],
        emails: ['charlie@startup.com'],
        title: 'CTO',
        organizationId: startupCo.id,
      },
    });

    const jane = await prisma.person.create({
      data: {
        userId: user.id,
        names: ['Jane Doe'],
        emails: ['jane@bigcorp.com'],
        title: 'CTO',
        organizationId: bigCorp.id,
      },
    });

    // Create "me" person for this user
    const mePerson = await prisma.person.create({
      data: {
        id: 'me',
        userId: user.id,
        names: ['Test User'],
        emails: [testUserEmail],
      },
    });

    // Link user to their person
    await prisma.user.update({
      where: { id: user.id },
      data: { personId: mePerson.id },
    });

    // Create edges (connections)
    await prisma.edge.createMany({
      data: [
        {
          fromPersonId: mePerson.id,
          toPersonId: alice.id,
          relationshipType: 'knows',
          strength: 0.85,
          sources: ['linkedin'],
          channels: ['email'],
          firstSeenAt: new Date('2023-01-01'),
          lastSeenAt: new Date('2024-12-01'),
          interactionCount: 15,
          strengthFactors: { recency: 0.9, frequency: 0.8, mutuality: 1.0, channels: 0.8 },
        },
        {
          fromPersonId: mePerson.id,
          toPersonId: bob.id,
          relationshipType: 'knows',
          strength: 0.65,
          sources: ['linkedin'],
          channels: ['message'],
          firstSeenAt: new Date('2023-06-01'),
          lastSeenAt: new Date('2024-10-20'),
          interactionCount: 5,
          strengthFactors: { recency: 0.65, frequency: 0.6, mutuality: 0.7, channels: 0.4 },
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
          strengthFactors: { recency: 0.75, frequency: 0.65, mutuality: 0.8, channels: 0.6 },
        },
        {
          fromPersonId: bob.id,
          toPersonId: jane.id,
          relationshipType: 'worked_at',
          strength: 0.88,
          sources: ['gmail'],
          channels: ['email'],
          firstSeenAt: new Date('2020-01-01'),
          lastSeenAt: new Date('2024-12-10'),
          interactionCount: 120,
          strengthFactors: { recency: 0.95, frequency: 0.85, mutuality: 0.9, channels: 0.8 },
        },
        {
          fromPersonId: alice.id,
          toPersonId: charlie.id,
          relationshipType: 'worked_at',
          strength: 0.92,
          sources: ['gmail'],
          channels: ['email'],
          firstSeenAt: new Date('2021-03-01'),
          lastSeenAt: new Date('2024-12-15'),
          interactionCount: 200,
          strengthFactors: { recency: 0.98, frequency: 0.9, mutuality: 0.95, channels: 1.0 },
        },
      ],
    });

    console.log('Created test data: 5 people, 5 connections');

    // Set the session cookie
    // NextAuth v5 uses __Secure- prefix in production and no prefix in development
    await context.addCookies([
      {
        name: 'authjs.session-token',
        value: sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        expires: Math.floor(expires.getTime() / 1000),
      },
    ]);

    console.log('Session cookie set');

    // Save the authenticated state (cookie + storage)
    // Note: We save the state now rather than testing navigation
    // because the actual tests will verify auth is working
    await context.storageState({ path: authFile });

    console.log(`Authentication state saved to ${authFile}`);

  } catch (error) {
    console.error('Authentication setup failed:', error);
    throw error;
  }
});
