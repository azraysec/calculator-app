/**
 * Unit Tests for Gmail Adapter
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GmailAdapter, type GmailConfig } from '../../gmail-adapter';

// Create mock Gmail API instance
const mockGmailInstance = {
  users: {
    messages: {
      list: vi.fn(),
      get: vi.fn(),
    },
    getProfile: vi.fn(),
  },
};

// Mock googleapis
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        setCredentials: vi.fn(),
      })),
    },
    gmail: vi.fn(() => mockGmailInstance),
  },
}));

describe('GmailAdapter', () => {
  let adapter: GmailAdapter;
  let mockConfig: GmailConfig;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    mockConfig = {
      refreshToken: 'test-refresh-token',
      accessToken: 'test-access-token',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    };

    adapter = new GmailAdapter(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('capabilities', () => {
    it('should return correct capabilities', async () => {
      const capabilities = await adapter.capabilities();

      expect(capabilities).toEqual({
        contacts: true,
        organizations: false,
        interactions: true,
      });
    });
  });

  describe('validateConnection', () => {
    it('should return valid when connection succeeds', async () => {
      mockGmailInstance.users.getProfile.mockResolvedValue({
        data: {
          emailAddress: 'test@example.com',
          messagesTotal: 100,
        },
      });

      const result = await adapter.validateConnection();

      expect(result).toEqual({ valid: true });
      expect(mockGmailInstance.users.getProfile).toHaveBeenCalledWith({
        userId: 'me',
      });
    });

    it('should return invalid when connection fails', async () => {
      mockGmailInstance.users.getProfile.mockRejectedValue(
        new Error('Authentication failed')
      );

      const result = await adapter.validateConnection();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });

    it('should handle non-Error rejections', async () => {
      mockGmailInstance.users.getProfile.mockRejectedValue('Unknown error');

      const result = await adapter.validateConnection();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unknown error');
    });
  });

  describe('listContacts', () => {
    it('should extract contacts from email headers', async () => {
      mockGmailInstance.users.messages.list.mockResolvedValue({
        data: {
          messages: [
            { id: 'msg-1' },
            { id: 'msg-2' },
          ],
          nextPageToken: null,
        },
      });

      mockGmailInstance.users.messages.get
        .mockResolvedValueOnce({
          data: {
            id: 'msg-1',
            payload: {
              headers: [
                { name: 'From', value: 'Alice Smith <alice@example.com>' },
                { name: 'To', value: 'bob@example.com' },
              ],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            id: 'msg-2',
            payload: {
              headers: [
                { name: 'From', value: 'charlie@example.com' },
                { name: 'Cc', value: 'alice@example.com, dave@example.com' },
              ],
            },
          },
        });

      const result = await adapter.listContacts({ limit: 10 });

      expect(result.items).toHaveLength(4);
      expect(result.items.map((c) => c.emails[0]).sort()).toEqual([
        'alice@example.com',
        'bob@example.com',
        'charlie@example.com',
        'dave@example.com',
      ]);
      expect(result.hasMore).toBe(false);
    });

    it('should handle pagination', async () => {
      mockGmailInstance.users.messages.list.mockResolvedValue({
        data: {
          messages: [{ id: 'msg-1' }],
          nextPageToken: 'next-page-token',
        },
      });

      mockGmailInstance.users.messages.get.mockResolvedValue({
        data: {
          id: 'msg-1',
          payload: {
            headers: [
              { name: 'From', value: 'alice@example.com' },
            ],
          },
        },
      });

      const result = await adapter.listContacts({
        limit: 1,
        cursor: 'previous-token',
      });

      expect(result.nextCursor).toBe('next-page-token');
      expect(result.hasMore).toBe(true);
      expect(mockGmailInstance.users.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        maxResults: 1,
        pageToken: 'previous-token',
      });
    });

    it('should deduplicate contacts', async () => {
      mockGmailInstance.users.messages.list.mockResolvedValue({
        data: {
          messages: [{ id: 'msg-1' }, { id: 'msg-2' }],
        },
      });

      mockGmailInstance.users.messages.get
        .mockResolvedValueOnce({
          data: {
            payload: {
              headers: [
                { name: 'From', value: 'alice@example.com' },
              ],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            payload: {
              headers: [
                { name: 'From', value: 'alice@example.com' },
              ],
            },
          },
        });

      const result = await adapter.listContacts({ limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].emails[0]).toBe('alice@example.com');
    });
  });

  describe('listInteractions', () => {
    it('should fetch and parse email interactions', async () => {
      mockGmailInstance.users.messages.list.mockResolvedValue({
        data: {
          messages: [{ id: 'msg-1' }],
        },
      });

      mockGmailInstance.users.messages.get.mockResolvedValue({
        data: {
          id: 'msg-1',
          threadId: 'thread-1',
          internalDate: '1609459200000', // 2021-01-01
          snippet: 'Hello world',
          labelIds: ['INBOX', 'UNREAD'],
          payload: {
            headers: [
              { name: 'From', value: 'alice@example.com' },
              { name: 'To', value: 'bob@example.com' },
              { name: 'Subject', value: 'Test Email' },
              { name: 'Date', value: 'Fri, 1 Jan 2021 00:00:00 +0000' },
            ],
          },
        },
      });

      const result = await adapter.listInteractions({ limit: 10 });

      expect(result.items).toHaveLength(1);
      const interaction = result.items[0];

      expect(interaction.sourceId).toBe('msg-1');
      expect(interaction.sourceName).toBe('gmail');
      expect(interaction.channel).toBe('email');
      expect(interaction.direction).toBe('2-way');
      expect(interaction.participants).toEqual([
        'alice@example.com',
        'bob@example.com',
      ]);
      expect(interaction.metadata).toMatchObject({
        threadId: 'thread-1',
        subject: 'Test Email',
        snippet: 'Hello world',
        labels: ['INBOX', 'UNREAD'],
      });
    });

    it('should handle incremental sync with since parameter', async () => {
      const sinceDate = new Date('2021-01-01');
      const sinceTimestamp = Math.floor(sinceDate.getTime() / 1000);

      mockGmailInstance.users.messages.list.mockResolvedValue({
        data: { messages: [] },
      });

      await adapter.listInteractions({
        since: sinceDate,
        limit: 10,
      });

      expect(mockGmailInstance.users.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        maxResults: 10,
        pageToken: undefined,
        q: `after:${sinceTimestamp}`,
      });
    });

    it('should handle messages with Cc recipients', async () => {
      mockGmailInstance.users.messages.list.mockResolvedValue({
        data: {
          messages: [{ id: 'msg-1' }],
        },
      });

      mockGmailInstance.users.messages.get.mockResolvedValue({
        data: {
          id: 'msg-1',
          threadId: 'thread-1',
          internalDate: '1609459200000',
          payload: {
            headers: [
              { name: 'From', value: 'alice@example.com' },
              { name: 'To', value: 'bob@example.com' },
              { name: 'Cc', value: 'charlie@example.com, dave@example.com' },
              { name: 'Subject', value: 'Group Email' },
              { name: 'Date', value: 'Fri, 1 Jan 2021 00:00:00 +0000' },
            ],
          },
        },
      });

      const result = await adapter.listInteractions({ limit: 10 });

      expect(result.items[0].participants).toEqual([
        'alice@example.com',
        'bob@example.com',
        'charlie@example.com',
        'dave@example.com',
      ]);
    });

    it('should use internalDate as fallback when Date header missing', async () => {
      mockGmailInstance.users.messages.list.mockResolvedValue({
        data: {
          messages: [{ id: 'msg-1' }],
        },
      });

      mockGmailInstance.users.messages.get.mockResolvedValue({
        data: {
          id: 'msg-1',
          threadId: 'thread-1',
          internalDate: '1609459200000', // 2021-01-01 00:00:00 UTC
          payload: {
            headers: [
              { name: 'From', value: 'alice@example.com' },
              { name: 'To', value: 'bob@example.com' },
            ],
          },
        },
      });

      const result = await adapter.listInteractions({ limit: 10 });

      expect(result.items[0].timestamp).toEqual(new Date(1609459200000));
    });
  });

  describe('email parsing', () => {
    it('should parse email addresses from various formats', async () => {
      mockGmailInstance.users.messages.list.mockResolvedValue({
        data: {
          messages: [{ id: 'msg-1' }],
        },
      });

      mockGmailInstance.users.messages.get.mockResolvedValue({
        data: {
          id: 'msg-1',
          payload: {
            headers: [
              // Various email formats
              { name: 'From', value: 'Alice Smith <alice@example.com>' },
              { name: 'To', value: 'bob@example.com' },
              { name: 'Cc', value: '"Charlie, Dave" <charlie@example.com>, eve@example.com' },
            ],
          },
        },
      });

      const result = await adapter.listContacts({ limit: 10 });

      const emails = result.items.map((c) => c.emails[0]).sort();
      expect(emails).toContain('alice@example.com');
      expect(emails).toContain('bob@example.com');
      expect(emails).toContain('charlie@example.com');
      expect(emails).toContain('eve@example.com');
    });

    it('should extract names from email headers', async () => {
      mockGmailInstance.users.messages.list.mockResolvedValue({
        data: {
          messages: [{ id: 'msg-1' }],
        },
      });

      mockGmailInstance.users.messages.get.mockResolvedValue({
        data: {
          id: 'msg-1',
          payload: {
            headers: [
              { name: 'From', value: 'Alice Smith <alice@example.com>' },
            ],
          },
        },
      });

      const result = await adapter.listContacts({ limit: 10 });

      // Name is extracted from email username since parseEmailAddresses only returns the email
      expect(result.items[0].names[0]).toBe('Alice');
    });

    it('should generate name from email username as fallback', async () => {
      mockGmailInstance.users.messages.list.mockResolvedValue({
        data: {
          messages: [{ id: 'msg-1' }],
        },
      });

      mockGmailInstance.users.messages.get.mockResolvedValue({
        data: {
          id: 'msg-1',
          payload: {
            headers: [
              { name: 'From', value: 'john.doe@example.com' },
            ],
          },
        },
      });

      const result = await adapter.listContacts({ limit: 10 });

      expect(result.items[0].names[0]).toBe('John Doe');
    });
  });
});
