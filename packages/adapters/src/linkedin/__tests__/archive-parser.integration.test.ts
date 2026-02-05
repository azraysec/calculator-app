/**
 * Integration Tests for LinkedIn Archive Parser
 *
 * These tests use a real Prisma client with a test database.
 * NO MOCKS - tests actual database operations with real UUIDs.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { LinkedInArchiveParser } from '../archive-parser';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import * as os from 'os';

// Use test database - requires DATABASE_URL to point to test db
const prisma = new PrismaClient();

describe('LinkedInArchiveParser - Integration Tests', () => {
  // Real UUIDs like production
  let testUserId1: string;
  let testUserId2: string;
  let testUser1Email: string;
  let testUser2Email: string;
  let tempDir: string;

  beforeAll(async () => {
    // Create temp directory for test archives
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'linkedin-test-'));
  });

  afterAll(async () => {
    // Cleanup temp files
    fs.rmSync(tempDir, { recursive: true, force: true });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Generate real UUIDs for each test
    testUserId1 = randomUUID();
    testUserId2 = randomUUID();
    testUser1Email = `user1-${randomUUID().slice(0, 8)}@test.com`;
    testUser2Email = `user2-${randomUUID().slice(0, 8)}@test.com`;

    // Create test users in database
    await prisma.user.create({
      data: {
        id: testUserId1,
        email: testUser1Email,
        name: 'Test User 1',
      },
    });

    await prisma.user.create({
      data: {
        id: testUserId2,
        email: testUser2Email,
        name: 'Test User 2',
      },
    });
  });

  afterEach(async () => {
    // Clean up test data - delete in correct order for foreign keys
    await prisma.evidenceEvent.deleteMany({
      where: { userId: { in: [testUserId1, testUserId2] } },
    });
    await prisma.edge.deleteMany({
      where: {
        OR: [
          { fromPerson: { userId: { in: [testUserId1, testUserId2] } } },
          { toPerson: { userId: { in: [testUserId1, testUserId2] } } },
        ],
      },
    });
    await prisma.person.deleteMany({
      where: { userId: { in: [testUserId1, testUserId2] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testUserId1, testUserId2] } },
    });
  });

  /**
   * Helper to create a test LinkedIn archive ZIP
   */
  function createTestArchive(connections: string[], messages?: string[]): string {
    const zip = new AdmZip();

    // Add Connections.csv
    const connectionsContent = `First Name,Last Name,Email Address,Company,Position,Connected On
${connections.join('\n')}`;
    zip.addFile('Connections.csv', Buffer.from(connectionsContent));

    // Add Messages.csv if provided
    if (messages) {
      const messagesContent = `CONVERSATION ID,FROM,TO,DATE,CONTENT
${messages.join('\n')}`;
      zip.addFile('messages.csv', Buffer.from(messagesContent));
    }

    const archivePath = path.join(tempDir, `archive-${randomUUID()}.zip`);
    zip.writeZip(archivePath);
    return archivePath;
  }

  describe('Multi-tenant isolation', () => {
    it('should create Person records with correct userId', async () => {
      const archivePath = createTestArchive([
        'John,Doe,john@example.com,ACME Corp,Engineer,12 Jan 2026',
      ]);

      const parser = new LinkedInArchiveParser(prisma, testUserId1);
      const result = await parser.parseArchive(archivePath);

      // Verify person was created
      expect(result.connectionsProcessed).toBe(1);
      expect(result.newPersonsAdded).toBeGreaterThanOrEqual(1);

      // Verify person belongs to correct user
      const createdPerson = await prisma.person.findFirst({
        where: {
          emails: { has: 'john@example.com' },
        },
      });

      expect(createdPerson).not.toBeNull();
      expect(createdPerson!.userId).toBe(testUserId1);
    });

    it('should NOT allow User 2 to see User 1 connections', async () => {
      // User 1 uploads archive
      const archivePath = createTestArchive([
        'Alice,Smith,alice@example.com,TechCorp,Manager,15 Jan 2026',
      ]);

      const parser1 = new LinkedInArchiveParser(prisma, testUserId1);
      await parser1.parseArchive(archivePath);

      // Verify User 1 can see their connection
      const user1Connections = await prisma.person.findMany({
        where: {
          userId: testUserId1,
          emails: { has: 'alice@example.com' },
        },
      });
      expect(user1Connections).toHaveLength(1);

      // Verify User 2 CANNOT see User 1's connection
      const user2Connections = await prisma.person.findMany({
        where: {
          userId: testUserId2,
          emails: { has: 'alice@example.com' },
        },
      });
      expect(user2Connections).toHaveLength(0);
    });

    it('should create separate Person records for same contact uploaded by different users', async () => {
      const archivePath1 = createTestArchive([
        'Bob,Jones,bob@example.com,Corp1,Dev,10 Jan 2026',
      ]);
      const archivePath2 = createTestArchive([
        'Bob,Jones,bob@example.com,Corp1,Dev,10 Jan 2026',
      ]);

      // Both users upload archives with same contact
      const parser1 = new LinkedInArchiveParser(prisma, testUserId1);
      const parser2 = new LinkedInArchiveParser(prisma, testUserId2);

      await parser1.parseArchive(archivePath1);
      await parser2.parseArchive(archivePath2);

      // Each user should have their own Person record for Bob
      const allBobs = await prisma.person.findMany({
        where: {
          emails: { has: 'bob@example.com' },
        },
      });

      expect(allBobs).toHaveLength(2);
      expect(allBobs.map(p => p.userId).sort()).toEqual([testUserId1, testUserId2].sort());
    });
  });

  describe('Me person creation', () => {
    it('should create "me" Person with correct userId and email', async () => {
      const archivePath = createTestArchive([
        'Contact,Person,contact@example.com,Company,Title,01 Jan 2026',
      ]);

      const parser = new LinkedInArchiveParser(prisma, testUserId1);
      await parser.parseArchive(archivePath);

      // Find the "me" person
      const mePerson = await prisma.person.findFirst({
        where: {
          userId: testUserId1,
          metadata: {
            path: ['isMe'],
            equals: true,
          },
        },
      });

      expect(mePerson).not.toBeNull();
      expect(mePerson!.userId).toBe(testUserId1);
      expect(mePerson!.emails).toContain(testUser1Email);
      // Should NOT contain the userId as email (the old bug)
      expect(mePerson!.emails).not.toContain(testUserId1);
    });

    it('should NOT use UUID as email for "me" Person', async () => {
      const archivePath = createTestArchive([
        'Contact,Person,contact@example.com,Company,Title,01 Jan 2026',
      ]);

      const parser = new LinkedInArchiveParser(prisma, testUserId1);
      await parser.parseArchive(archivePath);

      // Check NO person has UUID as email
      const personsWithUuidEmail = await prisma.person.findMany({
        where: {
          emails: { has: testUserId1 },
        },
      });

      expect(personsWithUuidEmail).toHaveLength(0);
    });
  });

  describe('Edge creation', () => {
    it('should create edges with correct userId on both persons', async () => {
      const archivePath = createTestArchive([
        'Jane,Doe,jane@example.com,Corp,Eng,15 Jan 2026',
      ]);

      const parser = new LinkedInArchiveParser(prisma, testUserId1);
      await parser.parseArchive(archivePath);

      // Find edges created by this user
      const edges = await prisma.edge.findMany({
        where: {
          fromPerson: { userId: testUserId1 },
        },
        include: {
          fromPerson: true,
          toPerson: true,
        },
      });

      expect(edges.length).toBeGreaterThan(0);

      // All edges should connect persons belonging to the same user
      for (const edge of edges) {
        expect(edge.fromPerson.userId).toBe(testUserId1);
        expect(edge.toPerson.userId).toBe(testUserId1);
      }
    });
  });

  describe('Duplicate handling', () => {
    it('should update existing Person on re-upload, not create duplicate', async () => {
      const archivePath1 = createTestArchive([
        'Same,Person,same@example.com,Company1,Title1,01 Jan 2026',
      ]);
      const archivePath2 = createTestArchive([
        'Same,Person,same@example.com,Company2,Title2,15 Jan 2026',
      ]);

      const parser = new LinkedInArchiveParser(prisma, testUserId1);

      await parser.parseArchive(archivePath1);
      const afterFirst = await prisma.person.count({
        where: {
          userId: testUserId1,
          emails: { has: 'same@example.com' },
        },
      });
      expect(afterFirst).toBe(1);

      await parser.parseArchive(archivePath2);
      const afterSecond = await prisma.person.count({
        where: {
          userId: testUserId1,
          emails: { has: 'same@example.com' },
        },
      });

      // Should still be 1, not 2
      expect(afterSecond).toBe(1);
    });
  });

  describe('Error cases', () => {
    it('should handle missing user gracefully', async () => {
      const archivePath = createTestArchive([
        'Test,Contact,test@example.com,Corp,Title,01 Jan 2026',
      ]);

      // Use a non-existent user ID
      const nonExistentUserId = randomUUID();
      const parser = new LinkedInArchiveParser(prisma, nonExistentUserId);

      const result = await parser.parseArchive(archivePath);

      // Should have error about user not found
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
