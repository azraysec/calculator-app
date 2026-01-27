/**
 * LinkedIn Archive Parser
 * Extracts and parses LinkedIn data export ZIP files
 * Per LinkedIn Adapter Design Spec Section 9
 */

import AdmZip from 'adm-zip';
import { parse as parseCsv } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';

export interface ParserProgress {
  stage: string;
  progress: number;
  message: string;
}

export interface ParserResult {
  connectionsProcessed: number;
  messagesProcessed: number;
  evidenceEventsCreated: number;
  newPersonsAdded: number;
  errors: string[];
}

export class LinkedInArchiveParser {
  private prisma: PrismaClient;
  private userId: string;
  private onProgress?: (progress: ParserProgress) => void;

  constructor(
    prisma: PrismaClient,
    userId: string,
    onProgress?: (progress: ParserProgress) => void
  ) {
    this.prisma = prisma;
    this.userId = userId;
    this.onProgress = onProgress;
  }

  /**
   * Parse LinkedIn archive ZIP file
   */
  async parseArchive(filePath: string): Promise<ParserResult> {
    const result: ParserResult = {
      connectionsProcessed: 0,
      messagesProcessed: 0,
      evidenceEventsCreated: 0,
      newPersonsAdded: 0,
      errors: [],
    };

    try {
      // Extract ZIP
      this.reportProgress('extracting', 10, 'Extracting archive...');
      const zip = new AdmZip(filePath);
      const entries = zip.getEntries();

      // Find CSV files (case-insensitive)
      const connectionsFile = this.findFile(entries, 'connections.csv');
      const messagesFile = this.findFile(entries, 'messages.csv');

      // Parse Connections.csv
      if (connectionsFile) {
        this.reportProgress('parsing_connections', 30, 'Parsing connections...');
        const connectionsResult = await this.parseConnections(
          zip.readAsText(connectionsFile)
        );
        result.connectionsProcessed = connectionsResult.count;
        result.newPersonsAdded += connectionsResult.newPersons;
        result.evidenceEventsCreated += connectionsResult.evidenceEvents;
        result.errors.push(...connectionsResult.errors);
      } else {
        result.errors.push('Connections.csv not found in archive');
      }

      // Parse messages.csv
      if (messagesFile) {
        this.reportProgress('parsing_messages', 60, 'Parsing messages...');
        const messagesResult = await this.parseMessages(
          zip.readAsText(messagesFile)
        );
        result.messagesProcessed = messagesResult.count;
        result.evidenceEventsCreated += messagesResult.evidenceEvents;
        result.errors.push(...messagesResult.errors);
      } else {
        result.errors.push('messages.csv not found in archive');
      }

      this.reportProgress('complete', 100, 'Processing complete');
      return result;
    } catch (error) {
      result.errors.push(
        `Archive parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return result;
    }
  }

  /**
   * Parse Connections.csv file
   */
  private async parseConnections(csvContent: string): Promise<{
    count: number;
    newPersons: number;
    evidenceEvents: number;
    errors: string[];
  }> {
    const result = {
      count: 0,
      newPersons: 0,
      evidenceEvents: 0,
      errors: [] as string[],
    };

    try {
      const records = parseCsv(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as Array<Record<string, string>>;

      // Get or create "me" person
      let mePerson = await this.prisma.person.findFirst({
        where: {
          emails: { has: this.userId },
          deletedAt: null,
        },
      });

      if (!mePerson) {
        // Create the user's Person record if it doesn't exist
        mePerson = await this.prisma.person.create({
          data: {
            names: [this.userId], // Temporary name, user can update later
            emails: [this.userId],
            metadata: {
              isMe: true,
              source: 'linkedin_archive',
              createdAt: new Date().toISOString(),
            },
          },
        });
      }

      // Process each connection
      for (const record of records) {
        try {
          const firstName = record['First Name'] || record['first name'];
          const lastName = record['Last Name'] || record['last name'];
          const email = record['Email Address'] || record['email'];
          const company = record['Company'] || record['company'];
          const position = record['Position'] || record['position'];
          const connectedOn = record['Connected On'] || record['connected on'];

          if (!firstName && !lastName) {
            continue; // Skip empty rows
          }

          const fullName = `${firstName || ''} ${lastName || ''}`.trim();

          // Upsert person
          const person = await this.upsertPerson({
            names: [fullName],
            emails: email ? [email] : [],
            title: position || undefined,
            company: company || undefined,
          });

          if (person.wasCreated) {
            result.newPersons++;
          }

          // Create edge: ME -> Person
          await this.upsertEdge(mePerson.id, person.person.id, {
            relationshipType: 'connected_to',
            sources: ['linkedin_archive'],
            firstSeenAt: connectedOn ? new Date(connectedOn) : new Date(),
          });

          // Create evidence event
          await this.prisma.evidenceEvent.create({
            data: {
              subjectPersonId: mePerson.id,
              objectPersonId: person.person.id,
              type: 'linkedin_connection',
              timestamp: connectedOn ? new Date(connectedOn) : new Date(),
              source: 'linkedin_archive',
              metadata: {
                connectedOn,
                company,
                position,
              },
            },
          });

          result.evidenceEvents++;
          result.count++;
        } catch (error) {
          result.errors.push(
            `Failed to process connection: ${error instanceof Error ? error.message : 'Unknown'}`
          );
        }
      }
    } catch (error) {
      result.errors.push(
        `CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }

    return result;
  }

  /**
   * Parse messages.csv file
   */
  private async parseMessages(csvContent: string): Promise<{
    count: number;
    evidenceEvents: number;
    errors: string[];
  }> {
    const result = {
      count: 0,
      evidenceEvents: 0,
      errors: [] as string[],
    };

    try {
      const records = parseCsv(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as Array<Record<string, string>>;

      // Get or create "me" person
      let mePerson = await this.prisma.person.findFirst({
        where: {
          emails: { has: this.userId },
          deletedAt: null,
        },
      });

      if (!mePerson) {
        // Create the user's Person record if it doesn't exist
        mePerson = await this.prisma.person.create({
          data: {
            names: [this.userId], // Temporary name, user can update later
            emails: [this.userId],
            metadata: {
              isMe: true,
              source: 'linkedin_archive',
              createdAt: new Date().toISOString(),
            },
          },
        });
      }

      // Group messages by conversation
      const conversationMap = new Map<string, any[]>();

      for (const record of records) {
        const conversationId =
          record['CONVERSATION ID'] || record['conversation id'] || 'default';
        if (!conversationMap.has(conversationId)) {
          conversationMap.set(conversationId, []);
        }
        conversationMap.get(conversationId)!.push(record);
      }

      // Process each conversation
      for (const [conversationId, messages] of conversationMap.entries()) {
        try {
          // Create conversation record
          await this.prisma.conversation.create({
            data: {
              externalId: conversationId,
              sourceName: 'linkedin',
              participants: [], // Will be updated as we process messages
              metadata: {},
            },
          });

          // Process messages
          for (const msg of messages) {
            const fromName = msg['FROM'] || msg['from'];
            const toName = msg['TO'] || msg['to'];
            const date = msg['DATE'] || msg['date'];
            const content = msg['CONTENT'] || msg['content'];

            // Create evidence event for each message
            await this.prisma.evidenceEvent.create({
              data: {
                subjectPersonId: mePerson.id,
                objectPersonId: mePerson.id, // Simplified - should resolve actual person
                type:
                  fromName === 'me'
                    ? 'linkedin_message_sent'
                    : 'linkedin_message_received',
                timestamp: date ? new Date(date) : new Date(),
                source: 'linkedin_archive',
                metadata: {
                  conversationId,
                  from: fromName,
                  to: toName,
                  contentLength: content?.length || 0,
                },
              },
            });

            result.evidenceEvents++;
            result.count++;
          }
        } catch (error) {
          result.errors.push(
            `Failed to process conversation ${conversationId}: ${error instanceof Error ? error.message : 'Unknown'}`
          );
        }
      }
    } catch (error) {
      result.errors.push(
        `Messages CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }

    return result;
  }

  /**
   * Upsert person record
   */
  private async upsertPerson(data: {
    names: string[];
    emails: string[];
    title?: string;
    company?: string;
  }): Promise<{ person: any; wasCreated: boolean }> {
    // Try to find existing person by email
    if (data.emails.length > 0) {
      const existing = await this.prisma.person.findFirst({
        where: {
          emails: { hasSome: data.emails },
          deletedAt: null,
        },
      });

      if (existing) {
        return { person: existing, wasCreated: false };
      }
    }

    // Create new person
    const person = await this.prisma.person.create({
      data: {
        names: data.names,
        emails: data.emails,
        title: data.title,
        metadata: {
          linkedin: {
            company: data.company,
          },
        },
      },
    });

    return { person, wasCreated: true };
  }

  /**
   * Upsert edge between two people
   */
  private async upsertEdge(
    fromPersonId: string,
    toPersonId: string,
    data: {
      relationshipType: string;
      sources: string[];
      firstSeenAt: Date;
    }
  ) {
    const existing = await this.prisma.edge.findFirst({
      where: {
        fromPersonId,
        toPersonId,
      },
    });

    if (existing) {
      // Update existing edge
      return await this.prisma.edge.update({
        where: { id: existing.id },
        data: {
          sources: Array.from(new Set([...existing.sources, ...data.sources])),
          lastSeenAt: new Date(),
          interactionCount: existing.interactionCount + 1,
        },
      });
    } else {
      // Create new edge
      return await this.prisma.edge.create({
        data: {
          fromPersonId,
          toPersonId,
          relationshipType: data.relationshipType as any,
          strength: 0.5, // Default strength - will be recalculated
          sources: data.sources,
          channels: [],
          firstSeenAt: data.firstSeenAt,
          lastSeenAt: new Date(),
          interactionCount: 1,
        },
      });
    }
  }

  /**
   * Find file in ZIP entries (case-insensitive)
   */
  private findFile(entries: AdmZip.IZipEntry[], fileName: string): AdmZip.IZipEntry | null {
    return (
      entries.find(
        (entry) => entry.entryName.toLowerCase().endsWith(fileName.toLowerCase())
      ) || null
    );
  }

  /**
   * Report progress
   */
  private reportProgress(stage: string, progress: number, message: string) {
    if (this.onProgress) {
      this.onProgress({ stage, progress, message });
    }
  }
}
