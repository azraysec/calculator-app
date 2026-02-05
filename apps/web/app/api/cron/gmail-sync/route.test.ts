/**
 * Tests for Gmail Sync Cron Job API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock Prisma from @wig/db
vi.mock('@wig/db', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    conversation: {
      upsert: vi.fn(),
    },
    message: {
      create: vi.fn(),
    },
    person: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    evidenceEvent: {
      create: vi.fn(),
    },
  },
}));

// Mock Gmail adapter
const mockAdapter = {
  validateConnection: vi.fn(),
  listInteractions: vi.fn(),
};

vi.mock('@wig/adapters', () => ({
  createGmailAdapter: vi.fn(() => mockAdapter),
}));

import { prisma } from '@wig/db';
import { createGmailAdapter } from '@wig/adapters';

describe('Gmail Sync Cron Job', () => {
  const createRequest = () => {
    return new Request('http://localhost/api/cron/gmail-sync', {
      method: 'POST',
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/cron/gmail-sync', () => {
    it('should return success with no users to sync', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      const response = await POST(createRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processed).toBe(0);
      expect(data.results).toEqual([]);
    });

    it('should filter users with Gmail connected', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      await POST(createRequest());

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          googleRefreshToken: {
            not: null,
          },
        },
        select: expect.objectContaining({
          id: true,
          email: true,
          googleRefreshToken: true,
          googleAccessToken: true,
          lastGmailSyncAt: true,
        }),
      });
    });

    it('should handle invalid Gmail connection', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: 'user-1',
          email: 'user@example.com',
          googleRefreshToken: 'refresh-token',
          googleAccessToken: 'access-token',
          lastGmailSyncAt: null,
          person: null,
        },
      ] as any);

      mockAdapter.validateConnection.mockResolvedValue({
        valid: false,
        error: 'Invalid credentials',
      });

      const response = await POST(createRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.results[0].status).toBe('error');
      expect(data.results[0].error).toBe('Invalid credentials');
    });

    it('should sync emails successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        googleRefreshToken: 'refresh-token',
        googleAccessToken: 'access-token',
        lastGmailSyncAt: null,
        person: { id: 'person-me' },
      };

      vi.mocked(prisma.user.findMany).mockResolvedValue([mockUser] as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);
      vi.mocked(prisma.conversation.upsert).mockResolvedValue({ id: 'conv-1' } as any);
      vi.mocked(prisma.message.create).mockResolvedValue({} as any);
      vi.mocked(prisma.person.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.person.create).mockResolvedValue({ id: 'person-new' } as any);
      vi.mocked(prisma.evidenceEvent.create).mockResolvedValue({} as any);

      mockAdapter.validateConnection.mockResolvedValue({ valid: true });
      mockAdapter.listInteractions.mockResolvedValue({
        items: [
          {
            sourceId: 'msg-1',
            sourceName: 'gmail',
            timestamp: new Date(),
            participants: ['sender@example.com', 'recipient@example.com'],
            metadata: {
              threadId: 'thread-1',
              subject: 'Test Email',
              snippet: 'Email content...',
              labels: ['INBOX'],
            },
          },
        ],
        hasMore: false,
      });

      const response = await POST(createRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.results[0].status).toBe('success');
      expect(data.results[0].synced).toBe(1);
    });

    it('should skip interactions without threadId', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: 'user-1',
          email: 'user@example.com',
          googleRefreshToken: 'token',
          googleAccessToken: null,
          lastGmailSyncAt: null,
          person: null,
        },
      ] as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      mockAdapter.validateConnection.mockResolvedValue({ valid: true });
      mockAdapter.listInteractions.mockResolvedValue({
        items: [
          {
            sourceId: 'msg-1',
            sourceName: 'gmail',
            timestamp: new Date(),
            participants: ['a@b.com', 'c@d.com'],
            metadata: {}, // No threadId
          },
        ],
        hasMore: false,
      });

      const response = await POST(createRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results[0].status).toBe('success');
      // Conversation should not be created for missing threadId
      expect(prisma.conversation.upsert).not.toHaveBeenCalled();
    });

    it('should create evidence for sent emails', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: 'user-1',
          email: 'user@example.com',
          googleRefreshToken: 'token',
          googleAccessToken: null,
          lastGmailSyncAt: null,
          person: { id: 'person-me' },
        },
      ] as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);
      vi.mocked(prisma.conversation.upsert).mockResolvedValue({ id: 'conv-1' } as any);
      vi.mocked(prisma.message.create).mockResolvedValue({} as any);
      vi.mocked(prisma.person.findFirst).mockResolvedValue({ id: 'person-existing' } as any);
      vi.mocked(prisma.evidenceEvent.create).mockResolvedValue({} as any);

      mockAdapter.validateConnection.mockResolvedValue({ valid: true });
      mockAdapter.listInteractions.mockResolvedValue({
        items: [
          {
            sourceId: 'msg-1',
            sourceName: 'gmail',
            timestamp: new Date(),
            participants: ['me@example.com', 'other@example.com'],
            metadata: {
              threadId: 'thread-1',
              subject: 'Sent Email',
              snippet: 'Content...',
              labels: ['SENT'],
            },
          },
        ],
        hasMore: false,
      });

      await POST(createRequest());

      expect(prisma.evidenceEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'email_sent',
          }),
        })
      );
    });

    it('should handle user processing error', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: 'user-1',
          email: 'user@example.com',
          googleRefreshToken: 'token',
          googleAccessToken: null,
          lastGmailSyncAt: null,
          person: null,
        },
      ] as any);

      mockAdapter.validateConnection.mockRejectedValue(new Error('Network error'));

      const response = await POST(createRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.results[0].status).toBe('error');
      expect(data.results[0].error).toBe('Network error');
    });

    it('should handle fatal errors', async () => {
      vi.mocked(prisma.user.findMany).mockRejectedValue(new Error('Database down'));

      const response = await POST(createRequest());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database down');
    });

    it('should update last sync timestamp on success', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: 'user-1',
          email: 'user@example.com',
          googleRefreshToken: 'token',
          googleAccessToken: null,
          lastGmailSyncAt: null,
          person: null,
        },
      ] as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      mockAdapter.validateConnection.mockResolvedValue({ valid: true });
      mockAdapter.listInteractions.mockResolvedValue({
        items: [],
        hasMore: false,
      });

      await POST(createRequest());

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          lastGmailSyncAt: expect.any(Date),
        },
      });
    });

    it('should handle null metadata fields gracefully', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: 'user-1',
          email: 'user@example.com',
          googleRefreshToken: 'token',
          googleAccessToken: null,
          lastGmailSyncAt: null,
          person: null,
        },
      ] as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);
      vi.mocked(prisma.conversation.upsert).mockResolvedValue({ id: 'conv-1' } as any);
      vi.mocked(prisma.message.create).mockResolvedValue({} as any);
      vi.mocked(prisma.person.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.person.create).mockResolvedValue({ id: 'person-new' } as any);
      vi.mocked(prisma.evidenceEvent.create).mockResolvedValue({} as any);

      mockAdapter.validateConnection.mockResolvedValue({ valid: true });
      mockAdapter.listInteractions.mockResolvedValue({
        items: [
          {
            sourceId: 'msg-1',
            sourceName: 'gmail',
            timestamp: new Date(),
            participants: ['sender@example.com', 'recipient@example.com'],
            metadata: {
              threadId: 'thread-1',
              // subject and labels are undefined
            },
          },
        ],
        hasMore: false,
      });

      const response = await POST(createRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results[0].status).toBe('success');
      // Should create evidence with email_received type (labels undefined, not SENT)
      expect(prisma.evidenceEvent.create).toHaveBeenCalled();
    });

    it('should handle non-Error exceptions in user processing', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: 'user-1',
          email: 'user@example.com',
          googleRefreshToken: 'token',
          googleAccessToken: null,
          lastGmailSyncAt: null,
          person: null,
        },
      ] as any);

      mockAdapter.validateConnection.mockRejectedValue('String error');

      const response = await POST(createRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results[0].status).toBe('error');
      expect(data.results[0].error).toBe('Unknown error');
    });

    it('should handle non-Error exceptions in fatal errors', async () => {
      vi.mocked(prisma.user.findMany).mockRejectedValue('String fatal error');

      const response = await POST(createRequest());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unknown error');
    });

    it('should use user.person.id when available', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: 'user-1',
          email: 'user@example.com',
          googleRefreshToken: 'token',
          googleAccessToken: null,
          lastGmailSyncAt: null,
          person: { id: 'user-person-id' },
        },
      ] as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);
      vi.mocked(prisma.conversation.upsert).mockResolvedValue({ id: 'conv-1' } as any);
      vi.mocked(prisma.message.create).mockResolvedValue({} as any);
      vi.mocked(prisma.person.findFirst).mockResolvedValue({ id: 'existing-person' } as any);
      vi.mocked(prisma.evidenceEvent.create).mockResolvedValue({} as any);

      mockAdapter.validateConnection.mockResolvedValue({ valid: true });
      mockAdapter.listInteractions.mockResolvedValue({
        items: [
          {
            sourceId: 'msg-1',
            sourceName: 'gmail',
            timestamp: new Date(),
            participants: ['sender@example.com', 'recipient@example.com'],
            metadata: {
              threadId: 'thread-1',
              subject: 'Test',
              labels: ['INBOX'],
            },
          },
        ],
        hasMore: false,
      });

      await POST(createRequest());

      expect(prisma.evidenceEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subjectPersonId: 'user-person-id',
          }),
        })
      );
    });

    it('should use person.id when user.person is null', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: 'user-1',
          email: 'user@example.com',
          googleRefreshToken: 'token',
          googleAccessToken: null,
          lastGmailSyncAt: null,
          person: null,
        },
      ] as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);
      vi.mocked(prisma.conversation.upsert).mockResolvedValue({ id: 'conv-1' } as any);
      vi.mocked(prisma.message.create).mockResolvedValue({} as any);
      vi.mocked(prisma.person.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.person.create).mockResolvedValue({ id: 'created-person' } as any);
      vi.mocked(prisma.evidenceEvent.create).mockResolvedValue({} as any);

      mockAdapter.validateConnection.mockResolvedValue({ valid: true });
      mockAdapter.listInteractions.mockResolvedValue({
        items: [
          {
            sourceId: 'msg-1',
            sourceName: 'gmail',
            timestamp: new Date(),
            participants: ['sender@example.com', 'recipient@example.com'],
            metadata: {
              threadId: 'thread-1',
              subject: 'Test',
              labels: ['INBOX'],
            },
          },
        ],
        hasMore: false,
      });

      await POST(createRequest());

      expect(prisma.evidenceEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subjectPersonId: 'created-person',
          }),
        })
      );
    });
  });
});
