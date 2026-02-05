/**
 * Tests for Person Detail API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth-helpers
const mockWithAuth = vi.fn();
vi.mock('@/lib/auth-helpers', () => ({
  withAuth: (handler: any) => {
    mockWithAuth.mockImplementation(handler);
    return async (request: Request, context: any) => {
      const mockSession = { userId: 'user-123' };
      return handler(request, { ...context, ...mockSession });
    };
  },
}));

// Mock Prisma
vi.mock('@wig/db', () => ({
  prisma: {
    person: {
      findFirst: vi.fn(),
    },
    evidenceEvent: {
      findMany: vi.fn(),
    },
    conversation: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@wig/db';

// Import handler after mocks
const importHandler = async () => {
  const mod = await import('./route');
  return mod.GET;
};

describe('Person Detail API', () => {
  const mockUserId = 'user-123';
  const mockPersonId = 'person-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/people/[id]', () => {
    it('should return 404 when person not found', async () => {
      vi.mocked(prisma.person.findFirst).mockResolvedValue(null);

      const GET = await importHandler();
      const request = new Request('http://localhost/api/people/person-1');
      const response = await GET(request, { params: Promise.resolve({ id: mockPersonId }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Person not found');
    });

    it('should return complete person data with connections', async () => {
      const mockPerson = {
        id: mockPersonId,
        names: ['John Doe'],
        emails: ['john@example.com'],
        phones: ['+1234567890'],
        title: 'Engineer',
        organization: { id: 'org-1', name: 'Acme Corp' },
        socialHandles: { linkedin: 'johndoe' },
        metadata: { notes: 'Test' },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        outgoingEdges: [
          {
            id: 'edge-1',
            toPerson: {
              id: 'person-2',
              names: ['Alice'],
              emails: ['alice@example.com'],
              title: 'Designer',
              organization: null,
            },
            relationshipType: 'colleague',
            strength: 0.8,
            strengthFactors: { meetings: 5 },
            sources: ['linkedin'],
            firstSeenAt: new Date(),
            lastSeenAt: new Date(),
            interactionCount: 10,
          },
        ],
        incomingEdges: [
          {
            id: 'edge-2',
            fromPerson: {
              id: 'person-3',
              names: ['Bob'],
              emails: ['bob@example.com'],
              title: 'Manager',
              organization: null,
            },
            relationshipType: 'manager',
            strength: 0.9,
            strengthFactors: { reports: true },
            sources: ['gmail'],
            firstSeenAt: new Date(),
            lastSeenAt: new Date(),
            interactionCount: 20,
          },
        ],
      };

      vi.mocked(prisma.person.findFirst).mockResolvedValue(mockPerson as any);
      vi.mocked(prisma.evidenceEvent.findMany).mockResolvedValue([]);
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([]);

      const GET = await importHandler();
      const request = new Request('http://localhost/api/people/person-1');
      const response = await GET(request, { params: Promise.resolve({ id: mockPersonId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.person.id).toBe(mockPersonId);
      expect(data.person.names).toContain('John Doe');
      expect(data.connections.outgoing).toHaveLength(1);
      expect(data.connections.incoming).toHaveLength(1);
      expect(data.stats.totalConnections).toBe(2);
    });

    it('should return evidence grouped by type', async () => {
      const mockPerson = {
        id: mockPersonId,
        names: ['John'],
        emails: [],
        phones: [],
        title: null,
        organization: null,
        socialHandles: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        outgoingEdges: [],
        incomingEdges: [],
      };

      const mockEvidence = [
        {
          id: 'ev-1',
          type: 'email_sent',
          timestamp: new Date(),
          source: 'gmail',
          subjectPersonId: mockPersonId,
          objectPersonId: 'person-2',
          metadata: { subject: 'Hello' },
        },
        {
          id: 'ev-2',
          type: 'email_sent',
          timestamp: new Date(),
          source: 'gmail',
          subjectPersonId: mockPersonId,
          objectPersonId: 'person-3',
          metadata: { subject: 'Meeting' },
        },
        {
          id: 'ev-3',
          type: 'linkedin_connection',
          timestamp: new Date(),
          source: 'linkedin',
          subjectPersonId: mockPersonId,
          objectPersonId: 'person-4',
          metadata: {},
        },
      ];

      vi.mocked(prisma.person.findFirst).mockResolvedValue(mockPerson as any);
      vi.mocked(prisma.evidenceEvent.findMany).mockResolvedValue(mockEvidence as any);
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([]);

      const GET = await importHandler();
      const request = new Request('http://localhost/api/people/person-1');
      const response = await GET(request, { params: Promise.resolve({ id: mockPersonId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.evidence.all).toHaveLength(3);
      expect(data.evidence.byType.email_sent).toHaveLength(2);
      expect(data.evidence.byType.linkedin_connection).toHaveLength(1);
      expect(data.stats.totalEvidence).toBe(3);
      expect(data.stats.sources).toContain('gmail');
      expect(data.stats.sources).toContain('linkedin');
    });

    it('should return conversations with recent messages', async () => {
      const mockPerson = {
        id: mockPersonId,
        names: ['John'],
        emails: [],
        phones: [],
        title: null,
        organization: null,
        socialHandles: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        outgoingEdges: [],
        incomingEdges: [],
      };

      const mockConversations = [
        {
          id: 'conv-1',
          externalId: 'ext-1',
          sourceName: 'gmail',
          participants: [mockPersonId, 'person-2'],
          metadata: { thread: 'thread-1' },
          updatedAt: new Date(),
          messages: [
            {
              id: 'msg-1',
              senderId: mockPersonId,
              timestamp: new Date(),
              content: 'Hello!',
              metadata: {},
            },
            {
              id: 'msg-2',
              senderId: 'person-2',
              timestamp: new Date(),
              content: 'Hi there!',
              metadata: null,
            },
          ],
        },
      ];

      vi.mocked(prisma.person.findFirst).mockResolvedValue(mockPerson as any);
      vi.mocked(prisma.evidenceEvent.findMany).mockResolvedValue([]);
      vi.mocked(prisma.conversation.findMany).mockResolvedValue(mockConversations as any);

      const GET = await importHandler();
      const request = new Request('http://localhost/api/people/person-1');
      const response = await GET(request, { params: Promise.resolve({ id: mockPersonId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.conversations).toHaveLength(1);
      expect(data.conversations[0].recentMessages).toHaveLength(2);
      expect(data.stats.totalConversations).toBe(1);
    });

    it('should filter by userId for multi-tenant isolation', async () => {
      vi.mocked(prisma.person.findFirst).mockResolvedValue(null);

      const GET = await importHandler();
      const request = new Request('http://localhost/api/people/person-1');
      await GET(request, { params: Promise.resolve({ id: mockPersonId }) });

      expect(prisma.person.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: mockPersonId,
            userId: mockUserId,
            deletedAt: null,
          }),
        })
      );
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.person.findFirst).mockRejectedValue(new Error('DB error'));

      const GET = await importHandler();
      const request = new Request('http://localhost/api/people/person-1');
      const response = await GET(request, { params: Promise.resolve({ id: mockPersonId }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle person with null optional fields', async () => {
      const mockPerson = {
        id: mockPersonId,
        names: ['John'],
        emails: [],
        phones: [],
        title: null,
        organization: null,
        socialHandles: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        outgoingEdges: [],
        incomingEdges: [],
      };

      vi.mocked(prisma.person.findFirst).mockResolvedValue(mockPerson as any);
      vi.mocked(prisma.evidenceEvent.findMany).mockResolvedValue([]);
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([]);

      const GET = await importHandler();
      const request = new Request('http://localhost/api/people/person-1');
      const response = await GET(request, { params: Promise.resolve({ id: mockPersonId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.person.title).toBeNull();
      expect(data.person.organization).toBeNull();
      expect(data.person.socialHandles).toBeNull();
    });

    it('should handle evidence error gracefully', async () => {
      const mockPerson = {
        id: mockPersonId,
        names: ['John'],
        emails: [],
        phones: [],
        title: null,
        organization: null,
        socialHandles: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        outgoingEdges: [],
        incomingEdges: [],
      };

      vi.mocked(prisma.person.findFirst).mockResolvedValue(mockPerson as any);
      vi.mocked(prisma.evidenceEvent.findMany).mockRejectedValue(new Error('Evidence error'));

      const GET = await importHandler();
      const request = new Request('http://localhost/api/people/person-1');
      const response = await GET(request, { params: Promise.resolve({ id: mockPersonId }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
