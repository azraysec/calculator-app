/**
 * IntroductionPath Model Integration Tests
 *
 * Tests CRUD operations, status workflow, JSON path storage,
 * and multi-tenant isolation for the IntroductionPath model.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma, disconnectDatabase } from '../index';

describe('IntroductionPath Model', () => {
  // Test data IDs - will be populated in beforeAll
  let testUser1Id: string;
  let testUser2Id: string;
  let testPerson1Id: string;
  let testPerson2Id: string;
  let testPerson3Id: string;
  let testPerson4Id: string; // For user2

  beforeAll(async () => {
    // Create test users
    const user1 = await prisma.user.create({
      data: {
        email: `test-ip-user1-${Date.now()}@example.com`,
        name: 'Test User 1',
      },
    });
    testUser1Id = user1.id;

    const user2 = await prisma.user.create({
      data: {
        email: `test-ip-user2-${Date.now()}@example.com`,
        name: 'Test User 2',
      },
    });
    testUser2Id = user2.id;

    // Create test persons for user1
    const person1 = await prisma.person.create({
      data: {
        userId: testUser1Id,
        names: ['Me (User 1)'],
        emails: ['me@example.com'],
        phones: [],
      },
    });
    testPerson1Id = person1.id;

    const person2 = await prisma.person.create({
      data: {
        userId: testUser1Id,
        names: ['Alice Smith'],
        emails: ['alice@example.com'],
        phones: [],
      },
    });
    testPerson2Id = person2.id;

    const person3 = await prisma.person.create({
      data: {
        userId: testUser1Id,
        names: ['Bob Jones'],
        emails: ['bob@example.com'],
        phones: [],
      },
    });
    testPerson3Id = person3.id;

    // Create test person for user2
    const person4 = await prisma.person.create({
      data: {
        userId: testUser2Id,
        names: ['Charlie Brown'],
        emails: ['charlie@example.com'],
        phones: [],
      },
    });
    testPerson4Id = person4.id;
  });

  afterAll(async () => {
    // Clean up test data - delete users (cascades to persons and paths)
    await prisma.user.deleteMany({
      where: {
        id: { in: [testUser1Id, testUser2Id] },
      },
    });
    await disconnectDatabase();
  });

  beforeEach(async () => {
    // Clean up introduction paths between tests
    await prisma.introductionPath.deleteMany({
      where: {
        userId: { in: [testUser1Id, testUser2Id] },
      },
    });
  });

  it('should create an IntroductionPath record', async () => {
    const pathNodes = [testPerson1Id, testPerson2Id, testPerson3Id];

    const path = await prisma.introductionPath.create({
      data: {
        userId: testUser1Id,
        targetPersonId: testPerson3Id,
        pathNodes: pathNodes,
        hopCount: 2,
        pathScore: 0.75,
        explanation: 'Connect through Alice Smith to reach Bob Jones',
      },
    });

    expect(path).toBeDefined();
    expect(path.id).toBeDefined();
    expect(path.userId).toBe(testUser1Id);
    expect(path.targetPersonId).toBe(testPerson3Id);
    expect(path.pathNodes).toEqual(pathNodes);
    expect(path.hopCount).toBe(2);
    expect(path.pathScore).toBe(0.75);
    expect(path.explanation).toBe('Connect through Alice Smith to reach Bob Jones');
    expect(path.status).toBe('SUGGESTED'); // Default status
  });

  it('should read IntroductionPath by id', async () => {
    const created = await prisma.introductionPath.create({
      data: {
        userId: testUser1Id,
        targetPersonId: testPerson3Id,
        pathNodes: [testPerson1Id, testPerson3Id],
        hopCount: 1,
        pathScore: 0.9,
        explanation: 'Direct connection to Bob Jones',
      },
    });

    const found = await prisma.introductionPath.findUnique({
      where: { id: created.id },
    });

    expect(found).toBeDefined();
    expect(found!.id).toBe(created.id);
    expect(found!.pathScore).toBe(0.9);
    expect(found!.explanation).toBe('Direct connection to Bob Jones');
  });

  it('should update IntroductionPath status', async () => {
    const created = await prisma.introductionPath.create({
      data: {
        userId: testUser1Id,
        targetPersonId: testPerson3Id,
        pathNodes: [testPerson1Id, testPerson2Id, testPerson3Id],
        hopCount: 2,
        pathScore: 0.7,
        explanation: 'Path through Alice',
        status: 'SUGGESTED',
      },
    });

    expect(created.status).toBe('SUGGESTED');

    const updated = await prisma.introductionPath.update({
      where: { id: created.id },
      data: { status: 'ACCEPTED' },
    });

    expect(updated.status).toBe('ACCEPTED');

    // Update to IN_PROGRESS
    const inProgress = await prisma.introductionPath.update({
      where: { id: created.id },
      data: { status: 'IN_PROGRESS' },
    });

    expect(inProgress.status).toBe('IN_PROGRESS');
  });

  it('should delete IntroductionPath', async () => {
    const created = await prisma.introductionPath.create({
      data: {
        userId: testUser1Id,
        targetPersonId: testPerson3Id,
        pathNodes: [testPerson1Id, testPerson3Id],
        hopCount: 1,
        pathScore: 0.85,
        explanation: 'Direct path',
      },
    });

    await prisma.introductionPath.delete({
      where: { id: created.id },
    });

    const found = await prisma.introductionPath.findUnique({
      where: { id: created.id },
    });

    expect(found).toBeNull();
  });

  it('should store pathNodes as JSON array correctly', async () => {
    const pathNodes = [testPerson1Id, testPerson2Id, testPerson3Id];

    const created = await prisma.introductionPath.create({
      data: {
        userId: testUser1Id,
        targetPersonId: testPerson3Id,
        pathNodes: pathNodes,
        hopCount: 2,
        pathScore: 0.7,
        explanation: 'Two-hop path',
      },
    });

    // Verify the JSON array is stored and retrieved correctly
    expect(Array.isArray(created.pathNodes)).toBe(true);
    expect(created.pathNodes).toHaveLength(3);
    expect((created.pathNodes as string[])[0]).toBe(testPerson1Id);
    expect((created.pathNodes as string[])[1]).toBe(testPerson2Id);
    expect((created.pathNodes as string[])[2]).toBe(testPerson3Id);

    // Verify on read
    const found = await prisma.introductionPath.findUnique({
      where: { id: created.id },
    });

    expect(found!.pathNodes).toEqual(pathNodes);
  });

  it('should only return paths for the querying user', async () => {
    // Create path for user1
    await prisma.introductionPath.create({
      data: {
        userId: testUser1Id,
        targetPersonId: testPerson3Id,
        pathNodes: [testPerson1Id, testPerson3Id],
        hopCount: 1,
        pathScore: 0.8,
        explanation: 'User 1 path',
      },
    });

    // Query paths for user1 - should find 1
    const user1Paths = await prisma.introductionPath.findMany({
      where: { userId: testUser1Id },
    });
    expect(user1Paths).toHaveLength(1);

    // Query paths for user2 - should find 0
    const user2Paths = await prisma.introductionPath.findMany({
      where: { userId: testUser2Id },
    });
    expect(user2Paths).toHaveLength(0);
  });

  it('should query by targetPersonId', async () => {
    // Create two paths to different targets
    await prisma.introductionPath.create({
      data: {
        userId: testUser1Id,
        targetPersonId: testPerson2Id,
        pathNodes: [testPerson1Id, testPerson2Id],
        hopCount: 1,
        pathScore: 0.9,
        explanation: 'Path to Alice',
      },
    });

    await prisma.introductionPath.create({
      data: {
        userId: testUser1Id,
        targetPersonId: testPerson3Id,
        pathNodes: [testPerson1Id, testPerson3Id],
        hopCount: 1,
        pathScore: 0.8,
        explanation: 'Path to Bob',
      },
    });

    // Query by targetPersonId
    const pathsToAlice = await prisma.introductionPath.findMany({
      where: {
        userId: testUser1Id,
        targetPersonId: testPerson2Id,
      },
    });

    expect(pathsToAlice).toHaveLength(1);
    expect(pathsToAlice[0].explanation).toBe('Path to Alice');
  });

  it('should accept all PathStatus enum values', async () => {
    const statuses = ['SUGGESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'DECLINED'] as const;

    for (const status of statuses) {
      const path = await prisma.introductionPath.create({
        data: {
          userId: testUser1Id,
          targetPersonId: testPerson3Id,
          pathNodes: [testPerson1Id, testPerson3Id],
          hopCount: 1,
          pathScore: 0.7,
          explanation: `Path with status ${status}`,
          status: status,
        },
      });

      expect(path.status).toBe(status);

      // Clean up for next iteration
      await prisma.introductionPath.delete({ where: { id: path.id } });
    }
  });
});
