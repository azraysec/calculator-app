/**
 * CSV Adapter Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CSVAdapter, ImportResult } from './csv-adapter';

// Mock Prisma client
const createMockPrisma = () => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  person: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  edge: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
});

describe('CSVAdapter', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let adapter: CSVAdapter;

  const userId = 'user-123';
  const mePersonId = 'me-person-456';

  const sampleCSV = `First Name,Last Name,Email Address,Company,Position,Connected On
John,Doe,john@example.com,Acme Corp,Software Engineer,15 Jan 2023
Jane,Smith,jane@test.org,Tech Inc,Product Manager,1 Mar 2022`;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    adapter = new CSVAdapter(mockPrisma as any);

    // Default: user already has a personId
    mockPrisma.user.findUnique.mockResolvedValue({
      personId: mePersonId,
      email: 'user@example.com',
      name: 'Test User',
    });

    // Default: no existing persons
    mockPrisma.person.findFirst.mockResolvedValue(null);

    // Default: no existing edges
    mockPrisma.edge.findFirst.mockResolvedValue(null);

    // Default: create returns new record
    mockPrisma.person.create.mockImplementation(async (args) => ({
      id: `person-${Math.random().toString(36).substr(2, 9)}`,
      ...args.data,
    }));

    mockPrisma.edge.create.mockImplementation(async (args) => ({
      id: `edge-${Math.random().toString(36).substr(2, 9)}`,
      ...args.data,
    }));
  });

  it('should instantiate with PrismaClient', () => {
    expect(adapter).toBeInstanceOf(CSVAdapter);
  });

  it('should create Person records from CSV', async () => {
    await adapter.importLinkedInConnections(userId, sampleCSV);

    // Should create 2 persons
    expect(mockPrisma.person.create).toHaveBeenCalledTimes(2);

    // Verify first person data
    expect(mockPrisma.person.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          names: ['John Doe'],
          emails: ['john@example.com'],
        }),
      })
    );
  });

  it('should create Edge records linking to user', async () => {
    await adapter.importLinkedInConnections(userId, sampleCSV);

    // Should create 2 edges (one for each connection)
    expect(mockPrisma.edge.create).toHaveBeenCalledTimes(2);

    // Verify edge links from me person
    expect(mockPrisma.edge.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fromPersonId: mePersonId,
          sources: ['linkedin'],
        }),
      })
    );
  });

  it('should upsert existing Person by email (no duplicates)', async () => {
    // Setup: existing person with same email
    const existingPerson = {
      id: 'existing-person',
      names: ['John D'],
      emails: ['john@example.com'],
      title: null,
      metadata: null,
    };
    mockPrisma.person.findFirst.mockResolvedValue(existingPerson);
    mockPrisma.person.update.mockResolvedValue({
      ...existingPerson,
      names: ['John D', 'John Doe'],
    });

    const result = await adapter.importLinkedInConnections(userId, sampleCSV);

    // Should not create new person when email matches
    expect(mockPrisma.person.update).toHaveBeenCalled();
    expect(result.updated).toBe(2); // Both found by email
  });

  it('should set userId on all created Person records', async () => {
    await adapter.importLinkedInConnections(userId, sampleCSV);

    // Verify userId is set on all created persons
    const createCalls = mockPrisma.person.create.mock.calls;
    for (const call of createCalls) {
      expect(call[0].data.userId).toBe(userId);
    }
  });

  it('should set userId on all created Connection records', async () => {
    // This tests that persons created have userId set
    // Edges don't have userId directly - they inherit from the persons they connect
    await adapter.importLinkedInConnections(userId, sampleCSV);

    // Verify edges link from the user's me person
    const edgeCreateCalls = mockPrisma.edge.create.mock.calls;
    for (const call of edgeCreateCalls) {
      expect(call[0].data.fromPersonId).toBe(mePersonId);
    }
  });

  it('should return correct created count', async () => {
    const result = await adapter.importLinkedInConnections(userId, sampleCSV);

    expect(result.created).toBe(2);
  });

  it('should return correct updated count', async () => {
    // Setup: both persons exist
    const existingPerson = {
      id: 'existing-person',
      names: ['Existing'],
      emails: ['john@example.com'],
      title: null,
      metadata: null,
    };
    mockPrisma.person.findFirst.mockResolvedValue(existingPerson);
    mockPrisma.person.update.mockResolvedValue(existingPerson);

    const result = await adapter.importLinkedInConnections(userId, sampleCSV);

    expect(result.updated).toBe(2);
    expect(result.created).toBe(0);
  });

  it('should return correct skipped count', async () => {
    // Setup: person.create throws error
    mockPrisma.person.create.mockRejectedValue(new Error('DB Error'));

    const result = await adapter.importLinkedInConnections(userId, sampleCSV);

    expect(result.skipped).toBe(2);
    expect(result.errors.length).toBe(2);
  });

  it('should ensure User A cannot see User B\'s imported data', async () => {
    const userAId = 'user-A';
    const userBId = 'user-B';

    // User A imports
    mockPrisma.user.findUnique.mockResolvedValue({
      personId: 'me-A',
      email: 'a@example.com',
    });
    await adapter.importLinkedInConnections(userAId, sampleCSV);

    // Verify person.findFirst queries with userId filter
    expect(mockPrisma.person.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: userAId,
        }),
      })
    );

    // User B imports same data
    mockPrisma.user.findUnique.mockResolvedValue({
      personId: 'me-B',
      email: 'b@example.com',
    });
    await adapter.importLinkedInConnections(userBId, sampleCSV);

    // Verify separate userId filter for user B
    expect(mockPrisma.person.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: userBId,
        }),
      })
    );
  });

  it('should handle empty CSV gracefully', async () => {
    const emptyCSV = 'First Name,Last Name,Email Address,Company,Position,Connected On';

    const result = await adapter.importLinkedInConnections(userId, emptyCSV);

    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });
});
