/**
 * Mock adapter for testing and development
 * Provides fixture data without external API calls
 */

import type {
  SourceAdapter,
  AdapterCapabilities,
  PaginatedResult,
  SyncParams,
  CanonicalContact,
  CanonicalInteraction,
} from '@wig/shared-types';
import { BaseAdapter } from './base-adapter';

export interface MockData {
  contacts: CanonicalContact[];
  interactions: CanonicalInteraction[];
}

export class MockAdapter extends BaseAdapter implements SourceAdapter {
  readonly sourceName = 'mock';

  constructor(private data: MockData) {
    super();
  }

  async capabilities(): Promise<AdapterCapabilities> {
    return {
      contacts: true,
      organizations: false,
      interactions: true,
    };
  }

  async listContacts(params: SyncParams): Promise<PaginatedResult<CanonicalContact>> {
    const { cursor, limit = 100, since } = params;

    let filtered = this.data.contacts;

    // Filter by date if provided
    if (since) {
      filtered = filtered.filter((c) => {
        const updated = c.metadata.updatedAt as Date | undefined;
        return updated ? updated >= since : true;
      });
    }

    return this.paginate(filtered, cursor, limit);
  }

  async listInteractions(params: SyncParams): Promise<PaginatedResult<CanonicalInteraction>> {
    const { cursor, limit = 100, since } = params;

    let filtered = this.data.interactions;

    // Filter by date if provided
    if (since) {
      filtered = filtered.filter((i) => i.timestamp >= since);
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return this.paginate(filtered, cursor, limit);
  }

  async validateConnection(): Promise<{ valid: boolean; error?: string }> {
    return { valid: true };
  }
}

/**
 * Generate realistic mock data for testing
 */
export function generateMockData(): MockData {
  const now = new Date();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const contacts: CanonicalContact[] = [
    {
      sourceId: 'mock-1',
      sourceName: 'mock',
      names: ['Alice Johnson'],
      emails: ['alice@acme.com'],
      phones: ['+1-555-0101'],
      socialHandles: {
        linkedin: 'https://linkedin.com/in/alice-johnson',
      },
      title: 'VP Engineering',
      organizationName: 'Acme Corp',
      metadata: {
        updatedAt: daysAgo(7),
        domain: 'acme.com',
      },
    },
    {
      sourceId: 'mock-2',
      sourceName: 'mock',
      names: ['Bob Smith'],
      emails: ['bob@startup.io'],
      phones: [],
      socialHandles: {
        linkedin: 'https://linkedin.com/in/bobsmith',
        twitter: 'https://twitter.com/bobsmith',
      },
      title: 'CTO',
      organizationName: 'Startup Inc',
      metadata: {
        updatedAt: daysAgo(2),
        domain: 'startup.io',
      },
    },
    {
      sourceId: 'mock-3',
      sourceName: 'mock',
      names: ['Carol White'],
      emails: ['carol@techcorp.com', 'carol.white@gmail.com'],
      phones: ['+1-555-0103'],
      socialHandles: {},
      title: 'Security Architect',
      organizationName: 'TechCorp',
      metadata: {
        updatedAt: daysAgo(14),
        domain: 'techcorp.com',
      },
    },
  ];

  const interactions: CanonicalInteraction[] = [
    {
      sourceId: 'int-1',
      sourceName: 'mock',
      timestamp: daysAgo(7),
      participants: ['me@example.com', 'alice@acme.com'],
      channel: 'email',
      direction: '2-way',
      metadata: {
        subject: 'Re: Partnership Discussion',
        threadId: 'thread-1',
      },
    },
    {
      sourceId: 'int-2',
      sourceName: 'mock',
      timestamp: daysAgo(14),
      participants: ['me@example.com', 'alice@acme.com'],
      channel: 'meeting',
      metadata: {
        title: 'Weekly Sync',
        duration: 30,
      },
    },
    {
      sourceId: 'int-3',
      sourceName: 'mock',
      timestamp: daysAgo(2),
      participants: ['me@example.com', 'bob@startup.io'],
      channel: 'email',
      direction: '1-way',
      metadata: {
        subject: 'Introduction to Carol',
      },
    },
    {
      sourceId: 'int-4',
      sourceName: 'mock',
      timestamp: daysAgo(30),
      participants: ['me@example.com', 'bob@startup.io', 'alice@acme.com'],
      channel: 'meeting',
      metadata: {
        title: 'Conference Call',
        duration: 60,
      },
    },
    {
      sourceId: 'int-5',
      sourceName: 'mock',
      timestamp: daysAgo(45),
      participants: ['bob@startup.io', 'carol@techcorp.com'],
      channel: 'email',
      direction: '2-way',
      metadata: {
        subject: 'Security Review',
      },
    },
  ];

  return { contacts, interactions };
}
