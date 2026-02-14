/**
 * CSV Adapter Service
 *
 * Imports CSV data (LinkedIn connections) into the database with multi-tenant isolation.
 */

import type { PrismaClient } from '@prisma/client';
import { parseCSV } from './parser';
import { parseLinkedInConnections, LinkedInConnection } from './linkedin-format';

/** Result of an import operation */
export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * CSV Adapter for importing connection data.
 */
export class CSVAdapter {
  constructor(private prisma: PrismaClient) {}

  /**
   * Import LinkedIn connections from CSV content.
   *
   * @param userId - User ID for multi-tenant isolation
   * @param content - Raw CSV content string
   * @returns Import result with counts and errors
   */
  async importLinkedInConnections(userId: string, content: string): Promise<ImportResult> {
    const result: ImportResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // Parse CSV
      const rows = parseCSV(content);

      // Handle empty CSV
      if (rows.length === 0) {
        return result;
      }

      // Parse LinkedIn format
      const connections = parseLinkedInConnections(rows);

      // Get or create the user's "me" Person
      const mePerson = await this.getOrCreateMePerson(userId);

      // Process each connection
      for (const connection of connections) {
        try {
          const personResult = await this.processConnection(userId, mePerson.id, connection);

          if (personResult.created) {
            result.created++;
          } else if (personResult.updated) {
            result.updated++;
          } else {
            result.skipped++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.errors.push(`Failed to import ${connection.firstName} ${connection.lastName}: ${errorMessage}`);
          result.skipped++;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`CSV parsing failed: ${errorMessage}`);
    }

    return result;
  }

  /**
   * Get or create the user's "me" Person record.
   */
  private async getOrCreateMePerson(userId: string): Promise<{ id: string }> {
    // Check if user already has a personId
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { personId: true, email: true, name: true },
    });

    if (user?.personId) {
      return { id: user.personId };
    }

    // Create "me" Person for this user
    const mePerson = await this.prisma.person.create({
      data: {
        userId,
        names: user?.name ? [user.name] : ['Me'],
        emails: user?.email ? [user.email] : [],
        phones: [],
        metadata: { isMe: true },
      },
    });

    // Link user to their Person
    await this.prisma.user.update({
      where: { id: userId },
      data: { personId: mePerson.id },
    });

    return { id: mePerson.id };
  }

  /**
   * Process a single connection: upsert Person and create Edge.
   */
  private async processConnection(
    userId: string,
    mePersonId: string,
    connection: LinkedInConnection
  ): Promise<{ created: boolean; updated: boolean }> {
    let person;
    let created = false;
    let updated = false;

    // Construct full name
    const fullName = `${connection.firstName} ${connection.lastName}`.trim();

    // If email exists, try to find existing person
    if (connection.email) {
      const existingPerson = await this.prisma.person.findFirst({
        where: {
          userId,
          emails: { has: connection.email },
        },
      });

      if (existingPerson) {
        // Update existing person with LinkedIn data
        person = await this.prisma.person.update({
          where: { id: existingPerson.id },
          data: {
            names: this.mergeNames(existingPerson.names, fullName),
            title: connection.position ?? existingPerson.title,
            metadata: this.mergeMetadata(existingPerson.metadata, connection),
          },
        });
        updated = true;
      } else {
        // Create new person with email
        person = await this.createPerson(userId, connection, fullName);
        created = true;
      }
    } else {
      // No email - check by name (less reliable)
      const existingPerson = await this.prisma.person.findFirst({
        where: {
          userId,
          names: { has: fullName },
        },
      });

      if (existingPerson) {
        // Update existing
        person = await this.prisma.person.update({
          where: { id: existingPerson.id },
          data: {
            title: connection.position ?? existingPerson.title,
            metadata: this.mergeMetadata(existingPerson.metadata, connection),
          },
        });
        updated = true;
      } else {
        // Create new person without email
        person = await this.createPerson(userId, connection, fullName);
        created = true;
      }
    }

    // Create or update Edge from me to this person
    await this.upsertEdge(mePersonId, person.id, connection);

    return { created, updated };
  }

  /**
   * Create a new Person record.
   */
  private async createPerson(
    userId: string,
    connection: LinkedInConnection,
    fullName: string
  ) {
    return this.prisma.person.create({
      data: {
        userId,
        names: [fullName],
        emails: connection.email ? [connection.email] : [],
        phones: [],
        title: connection.position,
        metadata: {
          linkedin: {
            company: connection.company,
            position: connection.position,
            connectedOn: connection.connectedOn?.toISOString(),
          },
        },
      },
    });
  }

  /**
   * Create or update Edge from me to connection.
   */
  private async upsertEdge(
    fromPersonId: string,
    toPersonId: string,
    connection: LinkedInConnection
  ): Promise<void> {
    const existingEdge = await this.prisma.edge.findFirst({
      where: {
        fromPersonId,
        toPersonId,
      },
    });

    const now = new Date();
    const connectedOn = connection.connectedOn ?? now;

    if (existingEdge) {
      // Update existing edge
      await this.prisma.edge.update({
        where: { id: existingEdge.id },
        data: {
          sources: this.addToArray(existingEdge.sources, 'linkedin'),
          channels: this.addToArray(existingEdge.channels, 'linkedin'),
          lastSeenAt: now,
        },
      });
    } else {
      // Create new edge
      await this.prisma.edge.create({
        data: {
          fromPersonId,
          toPersonId,
          relationshipType: 'PROFESSIONAL',
          strength: 0.5, // Default strength
          sources: ['linkedin'],
          channels: ['linkedin'],
          firstSeenAt: connectedOn,
          lastSeenAt: now,
          interactionCount: 1,
        },
      });
    }
  }

  /**
   * Merge names arrays, avoiding duplicates.
   */
  private mergeNames(existing: string[], newName: string): string[] {
    if (!newName || existing.includes(newName)) {
      return existing;
    }
    return [...existing, newName];
  }

  /**
   * Merge metadata objects.
   */
  private mergeMetadata(existing: any, connection: LinkedInConnection): any {
    const linkedin = {
      company: connection.company,
      position: connection.position,
      connectedOn: connection.connectedOn?.toISOString(),
    };

    return {
      ...(existing || {}),
      linkedin,
    };
  }

  /**
   * Add value to array if not already present.
   */
  private addToArray(array: string[], value: string): string[] {
    if (array.includes(value)) {
      return array;
    }
    return [...array, value];
  }
}
