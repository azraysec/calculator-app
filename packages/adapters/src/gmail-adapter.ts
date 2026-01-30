/**
 * Gmail adapter for fetching email data
 *
 * SETUP REQUIRED:
 * 1. Enable Gmail API in Google Cloud Console
 * 2. Configure OAuth 2.0 credentials
 * 3. Request scopes: gmail.readonly or gmail.modify
 * 4. Refresh tokens are stored in User.googleRefreshToken
 *
 * API Documentation: https://developers.google.com/gmail/api
 */

import { google } from 'googleapis';
import type {
  SourceAdapter,
  AdapterCapabilities,
  PaginatedResult,
  SyncParams,
  CanonicalContact,
  CanonicalInteraction,
} from '@wig/shared-types';
import { BaseAdapter } from './base-adapter';

export interface GmailConfig {
  refreshToken: string;
  accessToken?: string;
  clientId: string;
  clientSecret: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  payload?: {
    headers?: Array<{
      name: string;
      value: string;
    }>;
    parts?: any[];
  };
  internalDate?: string;
}

export class GmailAdapter extends BaseAdapter implements SourceAdapter {
  readonly sourceName = 'gmail';
  private gmail: any;
  private oauth2Client: any;

  constructor(private config: GmailConfig) {
    super();
    this.initializeClient();
  }

  private initializeClient() {
    // Initialize OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Set credentials
    this.oauth2Client.setCredentials({
      refresh_token: this.config.refreshToken,
      access_token: this.config.accessToken,
    });

    // Initialize Gmail API client
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  async capabilities(): Promise<AdapterCapabilities> {
    return {
      contacts: true, // Email addresses from sent/received
      organizations: false,
      interactions: true, // Email threads
    };
  }

  /**
   * Extract unique email addresses (contacts) from sent/received emails
   */
  async listContacts(params: SyncParams): Promise<PaginatedResult<CanonicalContact>> {
    try {
      const contacts = new Map<string, CanonicalContact>();

      // Fetch messages to extract participants
      const messagesResponse = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: params.limit || 100,
        pageToken: params.cursor,
      });

      const messages = messagesResponse.data.messages || [];

      // Extract email addresses from message headers
      for (const message of messages) {
        const full = await this.gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Cc'],
        });

        const headers = full.data.payload?.headers || [];
        const fromHeader = headers.find((h: any) => h.name === 'From')?.value;
        const toHeader = headers.find((h: any) => h.name === 'To')?.value;
        const ccHeader = headers.find((h: any) => h.name === 'Cc')?.value;

        const allEmails = [fromHeader, toHeader, ccHeader]
          .filter(Boolean)
          .flatMap((header) => this.parseEmailAddresses(header!));

        for (const email of allEmails) {
          if (!contacts.has(email)) {
            const now = new Date();
            contacts.set(email, {
              sourceId: email,
              sourceName: this.sourceName,
              names: [this.extractNameFromEmail(email)],
              emails: [email],
              phones: [],
              socialHandles: {},
              metadata: {
                extractedFrom: 'gmail',
              },
              createdAt: now,
              updatedAt: now,
            });
          }
        }
      }

      return {
        items: Array.from(contacts.values()),
        nextCursor: messagesResponse.data.nextPageToken,
        hasMore: !!messagesResponse.data.nextPageToken,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Fetch email threads as interactions
   */
  async listInteractions(params: SyncParams): Promise<PaginatedResult<CanonicalInteraction>> {
    try {
      const interactions: CanonicalInteraction[] = [];

      // Fetch messages
      const messagesResponse = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: params.limit || 100,
        pageToken: params.cursor,
        ...(params.since && { q: `after:${Math.floor(params.since.getTime() / 1000)}` }),
      });

      const messages = messagesResponse.data.messages || [];

      // Process each message
      for (const message of messages) {
        const full = await this.gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date'],
        });

        const headers = full.data.payload?.headers || [];
        const fromHeader = headers.find((h: any) => h.name === 'From')?.value;
        const toHeader = headers.find((h: any) => h.name === 'To')?.value;
        const ccHeader = headers.find((h: any) => h.name === 'Cc')?.value;
        const subjectHeader = headers.find((h: any) => h.name === 'Subject')?.value;
        const dateHeader = headers.find((h: any) => h.name === 'Date')?.value;

        const participants = [fromHeader, toHeader, ccHeader]
          .filter(Boolean)
          .flatMap((header) => this.parseEmailAddresses(header!));

        const timestamp = dateHeader
          ? new Date(dateHeader)
          : new Date(parseInt(full.data.internalDate || '0'));

        const now = new Date();
        interactions.push({
          sourceId: full.data.id!,
          sourceName: this.sourceName,
          timestamp,
          participants,
          channel: 'email',
          direction: 'bidirectional',
          metadata: {
            threadId: full.data.threadId,
            subject: subjectHeader,
            snippet: full.data.snippet,
            labels: full.data.labelIds || [],
          },
          createdAt: now,
          updatedAt: now,
        });
      }

      return {
        items: interactions,
        nextCursor: messagesResponse.data.nextPageToken,
        hasMore: !!messagesResponse.data.nextPageToken,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async validateConnection(): Promise<{ valid: boolean; error?: string }> {
    try {
      // Test the connection by fetching user profile
      const response = await this.gmail.users.getProfile({
        userId: 'me',
      });

      if (!response.data) {
        return {
          valid: false,
          error: 'Could not fetch Gmail profile',
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Parse email addresses from a header value
   * Handles formats like "Name <email@domain.com>, Other <other@domain.com>"
   */
  private parseEmailAddresses(headerValue: string): string[] {
    const emailRegex = /<?([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)>?/g;
    const matches = headerValue.matchAll(emailRegex);
    return Array.from(matches, (m) => m[1]);
  }

  /**
   * Extract name from email address
   * Example: "John Doe <john@example.com>" -> "John Doe"
   */
  private extractNameFromEmail(headerValue: string): string {
    const nameMatch = headerValue.match(/^([^<]+)</);
    if (nameMatch) {
      return nameMatch[1].trim().replace(/^"(.*)"$/, '$1');
    }

    // Fallback: use email username
    const emailMatch = headerValue.match(/([^@]+)@/);
    if (emailMatch) {
      return emailMatch[1]
        .split('.')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }

    return headerValue;
  }
}

/**
 * Factory function to create Gmail adapter with user credentials
 */
export function createGmailAdapter(config: GmailConfig): GmailAdapter {
  return new GmailAdapter(config);
}
