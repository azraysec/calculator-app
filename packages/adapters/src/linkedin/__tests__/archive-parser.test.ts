/**
 * Unit Tests for LinkedIn Archive Parser
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LinkedInArchiveParser } from '../archive-parser';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(),
}));

describe('LinkedInArchiveParser', () => {
  let parser: LinkedInArchiveParser;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ personId: null, email: 'test@example.com', name: 'Test User' }),
        update: vi.fn().mockResolvedValue({}),
      },
      person: {
        findFirst: vi.fn(),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        update: vi.fn(),
      },
      edge: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      evidenceEvent: {
        findFirst: vi.fn().mockResolvedValue(null), // For deduplication checks
        create: vi.fn(),
      },
      conversation: {
        create: vi.fn(),
        upsert: vi.fn(),
      },
    };

    parser = new LinkedInArchiveParser(mockPrisma as any, 'test-user-id');
  });

  describe('findFile', () => {
    it('should find file case-insensitively', () => {
      const entries = [
        { entryName: 'Connections.csv' },
        { entryName: 'Messages.csv' },
        { entryName: 'folder/Profile.pdf' },
      ] as any[];

      const result = (parser as any).findFile(entries, 'connections.csv');
      expect(result).toBeDefined();
      expect(result.entryName).toBe('Connections.csv');
    });

    it('should return null if file not found', () => {
      const entries = [{ entryName: 'Other.csv' }] as any[];

      const result = (parser as any).findFile(entries, 'connections.csv');
      expect(result).toBeNull();
    });

    it('should match files in subdirectories', () => {
      const entries = [
        { entryName: 'data/Connections.csv' },
      ] as any[];

      const result = (parser as any).findFile(entries, 'connections.csv');
      expect(result).toBeDefined();
      expect(result.entryName).toBe('data/Connections.csv');
    });

    it('should NOT match files that end with search term but are not exact', () => {
      const entries = [
        { entryName: 'guide_messages.csv' },
        { entryName: 'messages.csv' },
        { entryName: 'learning_coach_messages.csv' },
      ] as any[];

      const result = (parser as any).findFile(entries, 'messages.csv');
      expect(result).toBeDefined();
      expect(result.entryName).toBe('messages.csv'); // Should match exact file, not guide_messages.csv
    });
  });

  describe('upsertPerson', () => {
    it('should find existing person by email', async () => {
      const existingPerson = {
        id: 'person-1',
        names: ['John Doe'],
        emails: ['john@example.com'],
      };

      mockPrisma.person.findFirst.mockResolvedValue(existingPerson);

      const result = await (parser as any).upsertPerson({
        names: ['John Doe'],
        emails: ['john@example.com'],
        title: 'Engineer',
      });

      expect(result.person).toEqual(existingPerson);
      expect(result.wasCreated).toBe(false);
      expect(mockPrisma.person.create).not.toHaveBeenCalled();
    });

    it('should create new person if not found', async () => {
      mockPrisma.person.findFirst.mockResolvedValue(null);

      const newPerson = {
        id: 'person-2',
        names: ['Jane Smith'],
        emails: ['jane@example.com'],
        title: 'Manager',
      };

      mockPrisma.person.create.mockResolvedValue(newPerson);

      const result = await (parser as any).upsertPerson({
        names: ['Jane Smith'],
        emails: ['jane@example.com'],
        title: 'Manager',
      });

      expect(result.person).toEqual(newPerson);
      expect(result.wasCreated).toBe(true);
      expect(mockPrisma.person.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          names: ['Jane Smith'],
          emails: ['jane@example.com'],
          title: 'Manager',
        }),
      });
    });

    it('should find existing person by name when no email provided', async () => {
      const existingPerson = {
        id: 'person-3',
        names: ['John Doe'],
        emails: [],
      };

      mockPrisma.person.findFirst.mockResolvedValue(existingPerson);

      const result = await (parser as any).upsertPerson({
        names: ['John Doe'],
        emails: [],
      });

      expect(result.person).toEqual(existingPerson);
      expect(result.wasCreated).toBe(false);
    });

    it('should update existing person with email when found by name', async () => {
      const existingPerson = {
        id: 'person-4',
        names: ['Jane Smith'],
        emails: [],
      };

      mockPrisma.person.findFirst
        .mockResolvedValueOnce(null) // Email search returns null
        .mockResolvedValueOnce(existingPerson); // Name search finds person

      mockPrisma.person.update.mockResolvedValue({
        ...existingPerson,
        emails: ['jane@example.com'],
      });

      const result = await (parser as any).upsertPerson({
        names: ['Jane Smith'],
        emails: ['jane@example.com'],
      });

      expect(mockPrisma.person.update).toHaveBeenCalledWith({
        where: { id: 'person-4' },
        data: {
          emails: ['jane@example.com'],
        },
      });
      expect(result.wasCreated).toBe(false);
    });
  });

  describe('upsertEdge', () => {
    it('should update existing edge', async () => {
      const existingEdge = {
        id: 'edge-1',
        fromPersonId: 'person-1',
        toPersonId: 'person-2',
        sources: ['gmail'],
        interactionCount: 5,
      };

      mockPrisma.edge.findFirst.mockResolvedValue(existingEdge);
      mockPrisma.edge.update.mockResolvedValue({
        ...existingEdge,
        sources: ['gmail', 'linkedin_archive'],
        interactionCount: 6,
      });

      const result = await (parser as any).upsertEdge(
        'person-1',
        'person-2',
        {
          relationshipType: 'connected_to',
          sources: ['linkedin_archive'],
          firstSeenAt: new Date(),
        }
      );

      expect(mockPrisma.edge.update).toHaveBeenCalled();
      expect(result.sources).toContain('linkedin_archive');
      expect(result.interactionCount).toBe(6);
    });

    it('should create new edge if not found', async () => {
      mockPrisma.edge.findFirst.mockResolvedValue(null);

      const newEdge = {
        id: 'edge-2',
        fromPersonId: 'person-1',
        toPersonId: 'person-2',
        sources: ['linkedin_archive'],
        interactionCount: 1,
      };

      mockPrisma.edge.create.mockResolvedValue(newEdge);

      const result = await (parser as any).upsertEdge(
        'person-1',
        'person-2',
        {
          relationshipType: 'connected_to',
          sources: ['linkedin_archive'],
          firstSeenAt: new Date(),
        }
      );

      expect(mockPrisma.edge.create).toHaveBeenCalled();
      expect(result.interactionCount).toBe(1);
    });
  });

  describe('reportProgress', () => {
    it('should call progress callback if provided', () => {
      const onProgress = vi.fn();
      const parserWithCallback = new LinkedInArchiveParser(
        mockPrisma as any,
        'test@example.com',
        onProgress
      );

      (parserWithCallback as any).reportProgress('test', 50, 'Testing');

      expect(onProgress).toHaveBeenCalledWith({
        stage: 'test',
        progress: 50,
        message: 'Testing',
      });
    });

    it('should not throw if no callback provided', () => {
      expect(() => {
        (parser as any).reportProgress('test', 50, 'Testing');
      }).not.toThrow();
    });
  });

  describe('parseDate', () => {
    it('should parse standard ISO date string', () => {
      const result = (parser as any).parseDate('2026-01-12 22:44:18 UTC');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2026);
    });

    it('should parse LinkedIn date format "DD Mon YYYY"', () => {
      const result = (parser as any).parseDate('12 Jan 2026');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(0); // January is 0
      expect(result.getDate()).toBe(12);
    });

    it('should handle all month abbreviations', () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach((month, index) => {
        const result = (parser as any).parseDate(`15 ${month} 2026`);
        expect(result.getMonth()).toBe(index);
      });
    });

    it('should fallback to current date on invalid input', () => {
      const beforeParse = Date.now();
      const result = (parser as any).parseDate('invalid date string');
      const afterParse = Date.now();

      expect(result.getTime()).toBeGreaterThanOrEqual(beforeParse);
      expect(result.getTime()).toBeLessThanOrEqual(afterParse);
    });

    it('should handle case insensitive month names', () => {
      const result = (parser as any).parseDate('12 JAN 2026');
      expect(result.getMonth()).toBe(0);
    });
  });

  describe('getOrCreateMePerson', () => {
    it('should use existing linked person from User.personId', async () => {
      const linkedPerson = {
        id: 'linked-person-id',
        names: ['Linked User'],
        emails: ['linked@example.com'],
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        personId: 'linked-person-id',
        email: 'test@example.com',
        name: 'Test User',
      });
      mockPrisma.person.findUnique.mockResolvedValue(linkedPerson);

      const result = await (parser as any).getOrCreateMePerson();

      expect(result.id).toBe('linked-person-id');
      expect(mockPrisma.person.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should find existing me person by metadata when not linked', async () => {
      const mePerson = {
        id: 'me-person-id',
        names: ['Me Person'],
        emails: ['me@example.com'],
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        personId: null,
        email: 'test@example.com',
        name: 'Test User',
      });
      mockPrisma.person.findUnique.mockResolvedValue(null);
      mockPrisma.person.findFirst.mockResolvedValue(mePerson);

      const result = await (parser as any).getOrCreateMePerson();

      expect(result.id).toBe('me-person-id');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        data: { personId: 'me-person-id' },
      });
    });

    it('should create new me person and link to user when none exists', async () => {
      const newPerson = {
        id: 'new-me-id',
        names: ['Test'],
        emails: ['test@example.com'],
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        personId: null,
        email: 'test@example.com',
        name: 'Test User',
      });
      mockPrisma.person.findUnique.mockResolvedValue(null);
      mockPrisma.person.findFirst.mockResolvedValue(null);
      mockPrisma.person.create.mockResolvedValue(newPerson);

      const result = await (parser as any).getOrCreateMePerson();

      expect(result.id).toBe('new-me-id');
      expect(mockPrisma.person.create).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        data: { personId: 'new-me-id' },
      });
    });
  });

  describe('parseConnections', () => {
    beforeEach(() => {
      // Setup mock for "me" person
      mockPrisma.person.findFirst.mockResolvedValueOnce({
        id: 'me-id',
        names: ['Test User'],
        emails: ['test@example.com'],
      });

      // Setup mock for upsertPerson (connection)
      mockPrisma.person.findFirst.mockResolvedValue(null);
      mockPrisma.person.create.mockResolvedValue({
        id: 'connection-id',
        names: ['John Doe'],
        emails: ['john@example.com'],
      });

      // Setup mock for edge
      mockPrisma.edge.findFirst.mockResolvedValue(null);
      mockPrisma.edge.create.mockResolvedValue({
        id: 'edge-id',
        fromPersonId: 'me-id',
        toPersonId: 'connection-id',
      });

      mockPrisma.evidenceEvent.create.mockResolvedValue({
        id: 'event-id',
      });
    });

    it('should skip LinkedIn Notes header', async () => {
      const csvContent = `Notes:
"This is a note about the export"

First Name,Last Name,Email Address,Company,Position,Connected On
John,Doe,john@example.com,ACME Corp,Engineer,12 Jan 2026`;

      const result = await (parser as any).parseConnections(csvContent);

      expect(result.count).toBe(1);
      expect(result.newPersons).toBeGreaterThanOrEqual(0);
      expect(result.edgesRescored).toBeGreaterThanOrEqual(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle CSV without Notes header', async () => {
      const csvContent = `First Name,Last Name,Email Address,Company,Position,Connected On
Jane,Smith,jane@example.com,Tech Inc,Manager,15 Feb 2026`;

      const result = await (parser as any).parseConnections(csvContent);

      expect(result.count).toBe(1);
      expect(result.newPersons).toBeGreaterThanOrEqual(0);
      expect(result.edgesRescored).toBeGreaterThanOrEqual(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should skip empty rows', async () => {
      const csvContent = `First Name,Last Name,Email Address,Company,Position,Connected On
John,Doe,john@example.com,ACME Corp,Engineer,12 Jan 2026
,,,,
Jane,Smith,jane@example.com,Tech Inc,Manager,15 Feb 2026`;

      const result = await (parser as any).parseConnections(csvContent);

      expect(result.count).toBe(2);
    });

    it('should handle names without spaces correctly', async () => {
      const csvContent = `First Name,Last Name,Email Address,Company,Position,Connected On
John,Doe,john@example.com,ACME Corp,Engineer,12 Jan 2026`;

      await (parser as any).parseConnections(csvContent);

      // Check that person was created with properly formatted name
      expect(mockPrisma.person.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          names: ['John Doe'], // Not 'John  Doe' with double space
        }),
      });
    });

    it('should handle connections without email', async () => {
      const csvContent = `First Name,Last Name,Email Address,Company,Position,Connected On
John,Doe,,ACME Corp,Engineer,12 Jan 2026`;

      const result = await (parser as any).parseConnections(csvContent);

      expect(result.count).toBe(1);
      expect(mockPrisma.person.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          emails: [],
        }),
      });
    });

    it.skip('should auto-create me person if not found', async () => {
      mockPrisma.person.findFirst.mockResolvedValueOnce(null); // "me" not found

      mockPrisma.person.create.mockResolvedValueOnce({
        id: 'new-me-id',
        names: ['test@example.com'],
        emails: ['test@example.com'],
      });

      const csvContent = `First Name,Last Name,Email Address,Company,Position,Connected On
John,Doe,john@example.com,ACME Corp,Engineer,12 Jan 2026`;

      const result = await (parser as any).parseConnections(csvContent);

      expect(result.count).toBe(1);
      // Verify "me" person was auto-created with isMe flag
      expect(mockPrisma.person.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            emails: ['test@example.com'],
            metadata: expect.objectContaining({
              isMe: true,
            }),
          }),
        })
      );
    });
  });

  describe('parseMessages', () => {
    beforeEach(() => {
      // Setup mock for "me" person
      mockPrisma.person.findFirst
        .mockResolvedValueOnce({
          id: 'me-id',
          names: ['Test User'],
          emails: ['test@example.com'],
        })
        .mockResolvedValue(null); // Other person lookups return null

      // Setup mock for creating other persons
      mockPrisma.person.create.mockResolvedValue({
        id: 'other-person-id',
        names: ['John Doe'],
        emails: [],
      });

      // Setup mocks for conversation and edge
      mockPrisma.conversation.upsert.mockResolvedValue({
        id: 'conversation-id',
        externalId: 'conv-1',
        sourceName: 'linkedin',
      });

      mockPrisma.edge.findFirst.mockResolvedValue(null);
      mockPrisma.edge.create.mockResolvedValue({
        id: 'edge-id',
      });

      mockPrisma.evidenceEvent.create.mockResolvedValue({
        id: 'event-id',
      });
    });

    it('should skip LinkedIn Notes header', async () => {
      const csvContent = `Notes:
"Some notes about messages"

CONVERSATION ID,FROM,TO,DATE,CONTENT
conv-1,Test User,John Doe,2026-01-12 10:00:00 UTC,Hello
conv-1,John Doe,Test User,2026-01-12 10:05:00 UTC,Hi back`;

      const result = await (parser as any).parseMessages(csvContent);

      expect(result.count).toBe(2);
      expect(result.newPersons).toBeGreaterThanOrEqual(0);
      expect(result.edgesRescored).toBeGreaterThanOrEqual(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect sent vs received messages correctly', async () => {
      const csvContent = `CONVERSATION ID,FROM,TO,DATE,CONTENT
conv-1,Test User,John Doe,2026-01-12 10:00:00 UTC,Hello
conv-1,John Doe,Test User,2026-01-12 10:05:00 UTC,Hi back`;

      await (parser as any).parseMessages(csvContent);

      // Check that evidence events were created with correct types
      const calls = mockPrisma.evidenceEvent.create.mock.calls;
      expect(calls[0][0].data.type).toBe('linkedin_message_sent');
      expect(calls[1][0].data.type).toBe('linkedin_message_received');
    });

    it('should create Person records for message participants', async () => {
      const csvContent = `CONVERSATION ID,FROM,TO,DATE,CONTENT
conv-1,Test User,John Doe,2026-01-12 10:00:00 UTC,Hello`;

      await (parser as any).parseMessages(csvContent);

      // Verify person was created for John Doe
      expect(mockPrisma.person.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          names: ['John Doe'],
        }),
      });
    });

    it('should update edges between message participants', async () => {
      const csvContent = `CONVERSATION ID,FROM,TO,DATE,CONTENT
conv-1,Test User,John Doe,2026-01-12 10:00:00 UTC,Hello`;

      await (parser as any).parseMessages(csvContent);

      // Verify edge was created
      expect(mockPrisma.edge.create).toHaveBeenCalled();
    });

    it('should upsert conversations to avoid duplicates', async () => {
      const csvContent = `CONVERSATION ID,FROM,TO,DATE,CONTENT
conv-1,Test User,John Doe,2026-01-12 10:00:00 UTC,Hello
conv-1,John Doe,Test User,2026-01-12 10:05:00 UTC,Hi back`;

      await (parser as any).parseMessages(csvContent);

      // Verify conversation.upsert was called once per conversation
      expect(mockPrisma.conversation.upsert).toHaveBeenCalledTimes(1);
      expect(mockPrisma.conversation.upsert).toHaveBeenCalledWith({
        where: {
          sourceName_externalId: {
            sourceName: 'linkedin',
            externalId: 'conv-1',
          },
        },
        create: expect.any(Object),
        update: expect.any(Object),
      });
    });

    it('should skip messages without sender or recipient', async () => {
      const csvContent = `CONVERSATION ID,FROM,TO,DATE,CONTENT
conv-1,Test User,,2026-01-12 10:00:00 UTC,Hello
conv-1,,Test User,2026-01-12 10:05:00 UTC,Hi back`;

      const result = await (parser as any).parseMessages(csvContent);

      expect(result.count).toBe(0);
    });

    it('should truncate message content to 500 chars', async () => {
      const longContent = 'a'.repeat(1000);
      const csvContent = `CONVERSATION ID,FROM,TO,DATE,CONTENT
conv-1,Test User,John Doe,2026-01-12 10:00:00 UTC,${longContent}`;

      await (parser as any).parseMessages(csvContent);

      const call = mockPrisma.evidenceEvent.create.mock.calls[0];
      expect(call[0].data.metadata.content).toHaveLength(500);
    });
  });
});
