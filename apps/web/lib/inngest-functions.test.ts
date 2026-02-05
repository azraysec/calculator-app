/**
 * Tests for Inngest Function Definitions
 *
 * Note: These are unit tests that verify the function definitions
 * are correctly exported. Integration tests would be needed to
 * test the actual event handling behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies before import
vi.mock('./event-bus', () => ({
  inngest: {
    createFunction: vi.fn((config, trigger, handler) => ({
      ...config,
      trigger,
      handler,
    })),
  },
}));

vi.mock('./prisma', () => ({
  prisma: {
    ingestJob: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@wig/adapters', () => ({
  LinkedInArchiveParser: class {
    constructor() {}
    parseArchive = vi.fn();
  },
}));

vi.mock('@wig/core', () => ({
  LinkedInRelationshipScorer: class {
    constructor() {}
    rescorePersonEdges = vi.fn();
  },
}));

vi.mock('fs/promises', () => ({
  writeFile: vi.fn(),
  unlink: vi.fn(),
}));

describe('Inngest Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export inngestFunctions array', async () => {
    const { inngestFunctions } = await import('./inngest-functions');

    expect(inngestFunctions).toBeDefined();
    expect(Array.isArray(inngestFunctions)).toBe(true);
  });

  it('should export 8 functions', async () => {
    const { inngestFunctions } = await import('./inngest-functions');

    expect(inngestFunctions).toHaveLength(8);
  });

  it('should export handleContactsIngested function', async () => {
    const { handleContactsIngested } = await import('./inngest-functions');

    expect(handleContactsIngested).toBeDefined();
    expect(handleContactsIngested.id).toBe('handle-contacts-ingested');
  });

  it('should export handleInteractionsIngested function', async () => {
    const { handleInteractionsIngested } = await import('./inngest-functions');

    expect(handleInteractionsIngested).toBeDefined();
    expect(handleInteractionsIngested.id).toBe('handle-interactions-ingested');
  });

  it('should export handleEntitiesMerged function', async () => {
    const { handleEntitiesMerged } = await import('./inngest-functions');

    expect(handleEntitiesMerged).toBeDefined();
    expect(handleEntitiesMerged.id).toBe('handle-entities-merged');
  });

  it('should export handleGraphUpdated function', async () => {
    const { handleGraphUpdated } = await import('./inngest-functions');

    expect(handleGraphUpdated).toBeDefined();
    expect(handleGraphUpdated.id).toBe('handle-graph-updated');
  });

  it('should export handleSyncStarted function', async () => {
    const { handleSyncStarted } = await import('./inngest-functions');

    expect(handleSyncStarted).toBeDefined();
    expect(handleSyncStarted.id).toBe('handle-sync-started');
  });

  it('should export handleSyncCompleted function', async () => {
    const { handleSyncCompleted } = await import('./inngest-functions');

    expect(handleSyncCompleted).toBeDefined();
    expect(handleSyncCompleted.id).toBe('handle-sync-completed');
  });

  it('should export handleSyncFailed function', async () => {
    const { handleSyncFailed } = await import('./inngest-functions');

    expect(handleSyncFailed).toBeDefined();
    expect(handleSyncFailed.id).toBe('handle-sync-failed');
  });

  it('should export processLinkedInArchive function', async () => {
    const { processLinkedInArchive } = await import('./inngest-functions');

    expect(processLinkedInArchive).toBeDefined();
    expect(processLinkedInArchive.id).toBe('process-linkedin-archive');
  });

  describe('Function handlers', () => {
    it('handleContactsIngested should process contacts', async () => {
      const { handleContactsIngested } = await import('./inngest-functions');

      const event = { data: { sourceName: 'linkedin', count: 100 } };
      const result = await handleContactsIngested.handler({ event } as any);

      expect(result).toEqual({ processed: 100 });
    });

    it('handleInteractionsIngested should process interactions', async () => {
      const { handleInteractionsIngested } = await import('./inngest-functions');

      const event = { data: { sourceName: 'gmail', count: 50 } };
      const result = await handleInteractionsIngested.handler({ event } as any);

      expect(result).toEqual({ processed: 50 });
    });

    it('handleEntitiesMerged should process merge events', async () => {
      const { handleEntitiesMerged } = await import('./inngest-functions');

      const event = {
        data: {
          entityType: 'person',
          targetId: 'target-1',
          sourceIds: ['source-1', 'source-2'],
        },
      };
      const result = await handleEntitiesMerged.handler({ event } as any);

      expect(result).toEqual({ merged: 2 });
    });

    it('handleGraphUpdated should process graph updates', async () => {
      const { handleGraphUpdated } = await import('./inngest-functions');

      const event = { data: { affectedPersonIds: ['p1', 'p2', 'p3'] } };
      const result = await handleGraphUpdated.handler({ event } as any);

      expect(result).toEqual({ invalidated: 3 });
    });

    it('handleSyncStarted should track sync start', async () => {
      const { handleSyncStarted } = await import('./inngest-functions');

      const event = { data: { sourceName: 'linkedin', syncId: 'sync-1' } };
      const result = await handleSyncStarted.handler({ event } as any);

      expect(result).toEqual({ status: 'tracking' });
    });

    it('handleSyncCompleted should handle sync completion', async () => {
      const { handleSyncCompleted } = await import('./inngest-functions');

      const event = {
        data: {
          sourceName: 'linkedin',
          syncId: 'sync-1',
          recordsProcessed: 100,
          duration: 5000,
        },
      };
      const result = await handleSyncCompleted.handler({ event } as any);

      expect(result).toEqual({ status: 'completed' });
    });

    it('handleSyncFailed should handle sync failure', async () => {
      const { handleSyncFailed } = await import('./inngest-functions');

      const event = {
        data: {
          sourceName: 'linkedin',
          syncId: 'sync-1',
          error: 'Connection timeout',
        },
      };
      const result = await handleSyncFailed.handler({ event } as any);

      expect(result).toEqual({ status: 'failed' });
    });

    describe('processLinkedInArchive', () => {
      it('should throw error when job not found', async () => {
        const { processLinkedInArchive } = await import('./inngest-functions');
        const { prisma } = await import('./prisma');

        vi.mocked(prisma.ingestJob.findUnique).mockResolvedValue(null);

        const event = { data: { jobId: 'non-existent-job' } };
        const step = {
          run: vi.fn(async (name: string, fn: () => Promise<any>) => fn()),
        };

        await expect(
          processLinkedInArchive.handler({ event, step } as any)
        ).rejects.toThrow('Job not found');
      });

      it('should throw error when blob URL not found', async () => {
        const { processLinkedInArchive } = await import('./inngest-functions');
        const { prisma } = await import('./prisma');

        vi.mocked(prisma.ingestJob.findUnique).mockResolvedValue({
          id: 'job-1',
          userId: 'user-1',
          fileMetadata: {}, // No blobUrl
        } as any);

        const event = { data: { jobId: 'job-1' } };
        const step = {
          run: vi.fn(async (name: string, fn: () => Promise<any>) => fn()),
        };

        await expect(
          processLinkedInArchive.handler({ event, step } as any)
        ).rejects.toThrow('Blob URL not found');
      });

      it('should throw error when userId missing', async () => {
        const { processLinkedInArchive } = await import('./inngest-functions');
        const { prisma } = await import('./prisma');

        vi.mocked(prisma.ingestJob.findUnique).mockResolvedValue({
          id: 'job-1',
          userId: null, // No userId
          fileMetadata: { blobUrl: 'https://example.com/file.zip' },
        } as any);

        const event = { data: { jobId: 'job-1' } };
        const step = {
          run: vi.fn(async (name: string, fn: () => Promise<any>) => fn()),
        };

        await expect(
          processLinkedInArchive.handler({ event, step } as any)
        ).rejects.toThrow('Job missing userId');
      });

      it('should process archive successfully', async () => {
        const { processLinkedInArchive } = await import('./inngest-functions');
        const { prisma } = await import('./prisma');
        const fs = await import('fs/promises');

        // Mock job lookup
        vi.mocked(prisma.ingestJob.findUnique).mockResolvedValue({
          id: 'job-1',
          userId: 'user-1',
          fileMetadata: { blobUrl: 'https://example.com/file.zip' },
        } as any);

        vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

        // Mock fetch for downloading
        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
        });
        global.fetch = mockFetch as any;

        // Mock fs operations
        vi.mocked(fs.writeFile).mockResolvedValue();
        vi.mocked(fs.unlink).mockResolvedValue();

        const event = { data: { jobId: 'job-1' } };

        // Create step mock that returns different values for each step
        let stepIndex = 0;
        const stepResults = [
          { blobUrl: 'https://example.com/file.zip', userId: 'user-1' }, // download-from-blob
          '/tmp/linkedin-archive-job-1.zip', // save-temp-file
          { // parse-archive
            connectionsProcessed: 100,
            messagesProcessed: 50,
            evidenceEventsCreated: 25,
            newPersonsAdded: 10,
            errors: [],
          },
          5, // rescore-relationships
          undefined, // complete-job
        ];

        const step = {
          run: vi.fn(async (name: string, fn: () => Promise<any>) => {
            const result = stepResults[stepIndex];
            stepIndex++;
            // Only call fn for specific steps where we want to test the logic
            if (stepIndex === 1) {
              // For download-from-blob, we test the actual logic
              return fn();
            }
            return result;
          }),
        };

        const result = await processLinkedInArchive.handler({ event, step } as any);

        expect(result).toEqual({
          connectionsProcessed: 100,
          messagesProcessed: 50,
          edgesRescored: 5,
        });
      });

      it('should handle fetch error when downloading', async () => {
        const { processLinkedInArchive } = await import('./inngest-functions');
        const { prisma } = await import('./prisma');

        vi.mocked(prisma.ingestJob.findUnique).mockResolvedValue({
          id: 'job-1',
          userId: 'user-1',
          fileMetadata: { blobUrl: 'https://example.com/file.zip' },
        } as any);
        vi.mocked(prisma.ingestJob.update).mockResolvedValue({} as any);

        const mockFetch = vi.fn().mockResolvedValue({
          ok: false,
          statusText: 'Not Found',
        });
        global.fetch = mockFetch as any;

        const event = { data: { jobId: 'job-1' } };
        let stepIndex = 0;
        const step = {
          run: vi.fn(async (name: string, fn: () => Promise<any>) => {
            stepIndex++;
            if (stepIndex <= 2) {
              return fn(); // Execute first two steps
            }
            return {};
          }),
        };

        await expect(
          processLinkedInArchive.handler({ event, step } as any)
        ).rejects.toThrow('Failed to download file from blob');
      });
    });
  });
});
