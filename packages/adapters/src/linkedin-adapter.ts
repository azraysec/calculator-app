/**
 * LinkedIn adapter for fetching profile data
 *
 * SETUP REQUIRED:
 * 1. Register app at https://www.linkedin.com/developers/
 * 2. Set environment variables:
 *    - LINKEDIN_CLIENT_ID
 *    - LINKEDIN_CLIENT_SECRET
 *    - LINKEDIN_ACCESS_TOKEN (or implement OAuth flow)
 *
 * API Documentation: https://learn.microsoft.com/en-us/linkedin/
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

export interface LinkedInConfig {
  accessToken?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline?: string;
  vanityName?: string;
  profilePicture?: string;
}

export class LinkedInAdapter extends BaseAdapter implements SourceAdapter {
  readonly sourceName = 'linkedin';

  constructor(private config: LinkedInConfig = {}) {
    super();
  }

  async capabilities(): Promise<AdapterCapabilities> {
    return {
      contacts: true,
      organizations: false,
      interactions: false, // LinkedIn API doesn't expose this without connection permission
    };
  }

  /**
   * Fetch a LinkedIn profile by vanity name (username)
   * Example: 'john-doe' from linkedin.com/in/john-doe
   */
  async fetchProfileByVanityName(vanityName: string): Promise<CanonicalContact | null> {
    // Check if credentials are configured
    if (!this.config.accessToken) {
      throw new Error('LinkedIn access token not configured. Please set LINKEDIN_ACCESS_TOKEN environment variable.');
    }

    try {
      // LinkedIn API endpoint for profile data
      // Note: Actual endpoint varies based on API version and permissions
      const response = await fetch(
        `https://api.linkedin.com/v2/people/(vanityName:${vanityName})`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'LinkedIn-Version': '202301',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`LinkedIn API error: ${response.status} ${response.statusText}`);
      }

      const profile: LinkedInProfile = await response.json();

      // Convert to canonical format
      const now = new Date();
      return {
        sourceId: profile.id,
        sourceName: 'linkedin',
        names: [`${profile.firstName} ${profile.lastName}`],
        emails: [], // LinkedIn doesn't expose email in basic profile
        phones: [],
        socialHandles: {
          linkedin: `https://www.linkedin.com/in/${vanityName}`,
        },
        title: profile.headline,
        organizationName: undefined, // Would need separate API call
        metadata: {
          vanityName,
          profilePicture: profile.profilePicture,
        },
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async listContacts(_params: SyncParams): Promise<PaginatedResult<CanonicalContact>> {
    // Not implemented - LinkedIn doesn't provide bulk contact export
    return {
      items: [],
      nextCursor: undefined,
      hasMore: false,
    };
  }

  async listInteractions(_params: SyncParams): Promise<PaginatedResult<CanonicalInteraction>> {
    // Not implemented - LinkedIn doesn't expose interaction history
    return {
      items: [],
      nextCursor: undefined,
      hasMore: false,
    };
  }

  async validateConnection(): Promise<{ valid: boolean; error?: string }> {
    if (!this.config.accessToken) {
      return {
        valid: false,
        error: 'LinkedIn access token not configured',
      };
    }

    try {
      // Test the connection by fetching the authenticated user's profile
      const response = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      });

      if (!response.ok) {
        return {
          valid: false,
          error: `LinkedIn API error: ${response.status}`,
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
}

/**
 * Factory function to create LinkedIn adapter with environment config
 */
export function createLinkedInAdapter(): LinkedInAdapter {
  return new LinkedInAdapter({
    accessToken: process.env.LINKEDIN_ACCESS_TOKEN,
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  });
}
