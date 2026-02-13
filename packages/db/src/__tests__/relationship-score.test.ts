/**
 * RelationshipScore Model Integration Tests
 *
 * Tests CRUD operations, unique constraints, multi-tenant isolation,
 * and cascade delete behavior for the RelationshipScore model.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma, disconnectDatabase } from '../index';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

describe('RelationshipScore Model', () => {
  // Test data IDs - will be populated in beforeAll
  let testUser1Id: string;
  let testUser2Id: string;
  let testPerson1Id: string;
  let testPerson2Id: string;
  let testPerson3Id: string; // For user2

  beforeAll(async () => {
    // Create test users
    const user1 = await prisma.user.create({
      data: {
        email: `test-rs-user1-${Date.now()}@example.com`,
        name: 'Test User 1',
      },
    });
    testUser1Id = user1.id;

    const user2 = await prisma.user.create({
      data: {
        email: `test-rs-user2-${Date.now()}@example.com`,
        name: 'Test User 2',
      },
    });
    testUser2Id = user2.id;

    // Create test persons for user1
    const person1 = await prisma.person.create({
      data: {
        userId: testUser1Id,
        names: ['Alice Smith'],
        emails: ['alice@example.com'],
        phones: [],
      },
    });
    testPerson1Id = person1.id;

    const person2 = await prisma.person.create({
      data: {
        userId: testUser1Id,
        names: ['Bob Jones'],
        emails: ['bob@example.com'],
        phones: [],
      },
    });
    testPerson2Id = person2.id;

    // Create test person for user2
    const person3 = await prisma.person.create({
      data: {
        userId: testUser2Id,
        names: ['Charlie Brown'],
        emails: ['charlie@example.com'],
        phones: [],
      },
    });
    testPerson3Id = person3.id;
  });

  afterAll(async () => {
    // Clean up test data - delete users (cascades to persons and scores)
    await prisma.user.deleteMany({
      where: {
        id: { in: [testUser1Id, testUser2Id] },
      },
    });
    await disconnectDatabase();
  });

  beforeEach(async () => {
    // Clean up relationship scores between tests
    await prisma.relationshipScore.deleteMany({
      where: {
        userId: { in: [testUser1Id, testUser2Id] },
      },
    });
  });

  it('should create a RelationshipScore record', async () => {
    const score = await prisma.relationshipScore.create({
      data: {
        userId: testUser1Id,
        sourcePersonId: testPerson1Id,
        targetPersonId: testPerson2Id,
        recencyScore: 0.8,
        frequencyScore: 0.6,
        bidirectionalScore: 0.9,
        channelDiversity: 0.5,
        overallScore: 0.7,
        confidence: 0.85,
        interactionCount: 15,
        lastInteractionAt: new Date('2026-02-01'),
      },
    });

    expect(score).toBeDefined();
    expect(score.id).toBeDefined();
    expect(score.userId).toBe(testUser1Id);
    expect(score.sourcePersonId).toBe(testPerson1Id);
    expect(score.targetPersonId).toBe(testPerson2Id);
    expect(score.recencyScore).toBe(0.8);
    expect(score.frequencyScore).toBe(0.6);
    expect(score.bidirectionalScore).toBe(0.9);
    expect(score.channelDiversity).toBe(0.5);
    expect(score.overallScore).toBe(0.7);
    expect(score.confidence).toBe(0.85);
    expect(score.interactionCount).toBe(15);
    expect(score.lastInteractionAt).toEqual(new Date('2026-02-01'));
  });

  it('should read RelationshipScore by id', async () => {
    const created = await prisma.relationshipScore.create({
      data: {
        userId: testUser1Id,
        sourcePersonId: testPerson1Id,
        targetPersonId: testPerson2Id,
        overallScore: 0.75,
        confidence: 0.9,
      },
    });

    const found = await prisma.relationshipScore.findUnique({
      where: { id: created.id },
    });

    expect(found).toBeDefined();
    expect(found!.id).toBe(created.id);
    expect(found!.overallScore).toBe(0.75);
    expect(found!.confidence).toBe(0.9);
  });

  it('should update RelationshipScore fields', async () => {
    const created = await prisma.relationshipScore.create({
      data: {
        userId: testUser1Id,
        sourcePersonId: testPerson1Id,
        targetPersonId: testPerson2Id,
        overallScore: 0.5,
        confidence: 0.6,
        interactionCount: 5,
      },
    });

    const updated = await prisma.relationshipScore.update({
      where: { id: created.id },
      data: {
        overallScore: 0.8,
        confidence: 0.95,
        interactionCount: 20,
        lastInteractionAt: new Date('2026-02-14'),
      },
    });

    expect(updated.overallScore).toBe(0.8);
    expect(updated.confidence).toBe(0.95);
    expect(updated.interactionCount).toBe(20);
    expect(updated.lastInteractionAt).toEqual(new Date('2026-02-14'));
  });

  it('should delete RelationshipScore', async () => {
    const created = await prisma.relationshipScore.create({
      data: {
        userId: testUser1Id,
        sourcePersonId: testPerson1Id,
        targetPersonId: testPerson2Id,
        overallScore: 0.7,
        confidence: 0.8,
      },
    });

    await prisma.relationshipScore.delete({
      where: { id: created.id },
    });

    const found = await prisma.relationshipScore.findUnique({
      where: { id: created.id },
    });

    expect(found).toBeNull();
  });

  it('should enforce unique constraint on userId+sourcePersonId+targetPersonId', async () => {
    // Create first score
    await prisma.relationshipScore.create({
      data: {
        userId: testUser1Id,
        sourcePersonId: testPerson1Id,
        targetPersonId: testPerson2Id,
        overallScore: 0.7,
        confidence: 0.8,
      },
    });

    // Attempt to create duplicate
    await expect(
      prisma.relationshipScore.create({
        data: {
          userId: testUser1Id,
          sourcePersonId: testPerson1Id,
          targetPersonId: testPerson2Id,
          overallScore: 0.9,
          confidence: 0.95,
        },
      })
    ).rejects.toThrow();

    // Verify error is a unique constraint violation
    try {
      await prisma.relationshipScore.create({
        data: {
          userId: testUser1Id,
          sourcePersonId: testPerson1Id,
          targetPersonId: testPerson2Id,
          overallScore: 0.9,
          confidence: 0.95,
        },
      });
    } catch (error) {
      expect(error).toBeInstanceOf(PrismaClientKnownRequestError);
      expect((error as PrismaClientKnownRequestError).code).toBe('P2002'); // Unique constraint violation
    }
  });

  it('should only return scores for the querying user', async () => {
    // Create score for user1
    await prisma.relationshipScore.create({
      data: {
        userId: testUser1Id,
        sourcePersonId: testPerson1Id,
        targetPersonId: testPerson2Id,
        overallScore: 0.7,
        confidence: 0.8,
      },
    });

    // Query scores for user1 - should find 1
    const user1Scores = await prisma.relationshipScore.findMany({
      where: { userId: testUser1Id },
    });
    expect(user1Scores).toHaveLength(1);

    // Query scores for user2 - should find 0
    const user2Scores = await prisma.relationshipScore.findMany({
      where: { userId: testUser2Id },
    });
    expect(user2Scores).toHaveLength(0);
  });

  it('should use index when querying by userId+overallScore', async () => {
    // Create multiple scores with different scores
    await prisma.relationshipScore.create({
      data: {
        userId: testUser1Id,
        sourcePersonId: testPerson1Id,
        targetPersonId: testPerson2Id,
        overallScore: 0.5,
        confidence: 0.8,
      },
    });

    // Query with ordering by overallScore
    const scores = await prisma.relationshipScore.findMany({
      where: { userId: testUser1Id },
      orderBy: { overallScore: 'desc' },
    });

    // This test verifies the query works - actual index usage is internal to Postgres
    // The index @@index([userId, overallScore]) optimizes this query pattern
    expect(scores).toBeDefined();
    expect(scores.length).toBeGreaterThanOrEqual(1);
    expect(scores[0].overallScore).toBe(0.5);
  });

  it('should cascade delete when User is deleted', async () => {
    // Create a temporary user for this test
    const tempUser = await prisma.user.create({
      data: {
        email: `test-cascade-${Date.now()}@example.com`,
        name: 'Temp User',
      },
    });

    // Create persons for the temp user
    const tempPerson1 = await prisma.person.create({
      data: {
        userId: tempUser.id,
        names: ['Temp Person 1'],
        emails: [],
        phones: [],
      },
    });

    const tempPerson2 = await prisma.person.create({
      data: {
        userId: tempUser.id,
        names: ['Temp Person 2'],
        emails: [],
        phones: [],
      },
    });

    // Create a relationship score
    const score = await prisma.relationshipScore.create({
      data: {
        userId: tempUser.id,
        sourcePersonId: tempPerson1.id,
        targetPersonId: tempPerson2.id,
        overallScore: 0.7,
        confidence: 0.8,
      },
    });

    const scoreId = score.id;

    // Delete the user
    await prisma.user.delete({
      where: { id: tempUser.id },
    });

    // Verify the score was cascade deleted
    const deletedScore = await prisma.relationshipScore.findUnique({
      where: { id: scoreId },
    });

    expect(deletedScore).toBeNull();
  });
});
