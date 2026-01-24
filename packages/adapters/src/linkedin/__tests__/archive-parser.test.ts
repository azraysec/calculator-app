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
      person: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      edge: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      evidenceEvent: {
        create: vi.fn(),
      },
      conversation: {
        create: vi.fn(),
      },
    };

    parser = new LinkedInArchiveParser(mockPrisma as any, 'test@example.com');
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

    it('should skip email lookup if no emails provided', async () => {
      mockPrisma.person.create.mockResolvedValue({
        id: 'person-3',
        names: ['No Email'],
      });

      const result = await (parser as any).upsertPerson({
        names: ['No Email'],
        emails: [],
      });

      expect(mockPrisma.person.findFirst).not.toHaveBeenCalled();
      expect(result.wasCreated).toBe(true);
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
});
