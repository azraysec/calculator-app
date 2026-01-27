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

      // Debug: Log all entry names
      console.log('[Parser] Archive contains files:');
      entries.forEach(e => console.log(`  - ${e.entryName}`));

      // Find CSV files (case-insensitive)
      const connectionsFile = this.findFile(entries, 'connections.csv');
      const messagesFile = this.findFile(entries, 'messages.csv');

      console.log('[Parser] Found connectionsFile:', connectionsFile?.entryName || 'NOT FOUND');
      console.log('[Parser] Found messagesFile:', messagesFile?.entryName || 'NOT FOUND');

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
      // LinkedIn CSVs have a "Notes:" header section - skip it
      let cleanedContent = csvContent;
      if (csvContent.startsWith('Notes:')) {
        // Skip lines until we find the actual CSV headers (contains "First Name")
        const lines = csvContent.split('\n');
        const headerIndex = lines.findIndex(line =>
          line.includes('First Name') || line.includes('first name')
        );
        if (headerIndex !== -1) {
          cleanedContent = lines.slice(headerIndex).join('\n');
        }
      }

      const records = parseCsv(cleanedContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as Array<Record<string, string>>;

      console.log(`[Parser] Parsed ${records.length} connection records from CSV`);
      if (records.length > 0) {
        console.log('[Parser] First connection record keys:', Object.keys(records[0]));
        console.log('[Parser] First connection record sample:', JSON.stringify(records[0]).substring(0, 200));
      }

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

          // Build full name, avoiding double spaces
          const nameParts = [firstName, lastName].filter(Boolean);
          const fullName = nameParts.join(' ').trim();

          if (!fullName) {
            continue; // Skip if no valid name
          }

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
            firstSeenAt: connectedOn ? this.parseDate(connectedOn) : new Date(),
          });

          // Create evidence event
          await this.prisma.evidenceEvent.create({
            data: {
              subjectPersonId: mePerson.id,
              objectPersonId: person.person.id,
              type: 'linkedin_connection',
              timestamp: connectedOn ? this.parseDate(connectedOn) : new Date(),
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
      // LinkedIn CSVs may have a "Notes:" header section - skip it
      let cleanedContent = csvContent;
      if (csvContent.startsWith('Notes:')) {
        const lines = csvContent.split('\n');
        const headerIndex = lines.findIndex(line =>
          line.includes('CONVERSATION ID') || line.includes('conversation id')
        );
        if (headerIndex !== -1) {
          cleanedContent = lines.slice(headerIndex).join('\n');
        }
      }

      const records = parseCsv(cleanedContent, {
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
          // Get unique participants from all messages in this conversation
          const participantNames = new Set<string>();
          for (const msg of messages) {
            const fromName = msg['FROM'] || msg['from'];
            const toName = msg['TO'] || msg['to'];
            if (fromName) participantNames.add(fromName);
            if (toName) participantNames.add(toName);
          }

          // Upsert conversation record
          const conversation = await this.prisma.conversation.upsert({
            where: {
              sourceName_externalId: {
                sourceName: 'linkedin',
                externalId: conversationId,
              },
            },
            create: {
              externalId: conversationId,
              sourceName: 'linkedin',
              participants: Array.from(participantNames),
              metadata: {
                messageCount: messages.length,
              },
            },
            update: {
              participants: Array.from(participantNames),
              metadata: {
                messageCount: messages.length,
              },
            },
          });

          // Process messages
          for (const msg of messages) {
            const fromName = msg['FROM'] || msg['from'];
            const toName = msg['TO'] || msg['to'];
            const fromProfileUrl = msg['SENDER PROFILE URL'] || msg['sender profile url'];
            const toProfileUrls = msg['RECIPIENT PROFILE URLS'] || msg['recipient profile urls'];
            const date = msg['DATE'] || msg['date'];
            const content = msg['CONTENT'] || msg['content'];
            const subject = msg['SUBJECT'] || msg['subject'];

            if (!fromName || !toName) {
              continue; // Skip messages without sender/recipient
            }

            // Determine if this is a sent or received message by comparing with mePerson
            // LinkedIn exports show your actual name, not "me"
            const isSentByMe = mePerson.names.some(name =>
              fromName.toLowerCase().includes(name.toLowerCase()) ||
              name.toLowerCase().includes(fromName.toLowerCase())
            );

            // Get or create the other person (not me)
            const otherPersonName = isSentByMe ? toName : fromName;
            const otherPersonProfileUrl = isSentByMe ? toProfileUrls : fromProfileUrl;

            // Try to find or create the other person
            let otherPerson = await this.prisma.person.findFirst({
              where: {
                names: {
                  has: otherPersonName,
                },
                deletedAt: null,
              },
            });

            if (!otherPerson) {
              // Create new person for message participant
              otherPerson = await this.prisma.person.create({
                data: {
                  names: [otherPersonName],
                  emails: [],
                  metadata: {
                    linkedin: {
                      profileUrl: otherPersonProfileUrl,
                    },
                  },
                },
              });
            }

            // Create or update edge between me and other person
            await this.upsertEdge(
              isSentByMe ? mePerson.id : otherPerson.id,
              isSentByMe ? otherPerson.id : mePerson.id,
              {
                relationshipType: 'messaged',
                sources: ['linkedin_archive'],
                firstSeenAt: date ? this.parseDate(date) : new Date(),
              }
            );

            // Create evidence event
            await this.prisma.evidenceEvent.create({
              data: {
                subjectPersonId: isSentByMe ? mePerson.id : otherPerson.id,
                objectPersonId: isSentByMe ? otherPerson.id : mePerson.id,
                type: isSentByMe ? 'linkedin_message_sent' : 'linkedin_message_received',
                timestamp: date ? this.parseDate(date) : new Date(),
                source: 'linkedin_archive',
                metadata: {
                  conversationId,
                  from: fromName,
                  to: toName,
                  subject: subject || null,
                  contentLength: content?.length || 0,
                  content: content?.substring(0, 500) || '', // Store first 500 chars
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
   * Parse LinkedIn date formats
   * Handles formats like "12 Jan 2026" and "2026-01-12 22:44:18 UTC"
   */
  private parseDate(dateString: string): Date {
    try {
      // Try parsing as-is first
      const parsed = new Date(dateString);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }

      // Handle LinkedIn's "DD Mon YYYY" format (e.g., "12 Jan 2026")
      const monthMap: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      };

      const parts = dateString.trim().split(/\s+/);
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = monthMap[parts[1].toLowerCase()];
        const year = parseInt(parts[2], 10);

        if (!isNaN(day) && month !== undefined && !isNaN(year)) {
          return new Date(year, month, day);
        }
      }

      // Fallback to current date
      console.warn(`[Parser] Could not parse date: ${dateString}, using current date`);
      return new Date();
    } catch (error) {
      console.warn(`[Parser] Error parsing date: ${dateString}`, error);
      return new Date();
    }
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
