/**
 * LinkedIn CSV Format Parser
 *
 * Parses LinkedIn connections export CSV format into structured data.
 */

import { ParsedRow } from './parser';

/** Represents a parsed LinkedIn connection */
export interface LinkedInConnection {
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
  position: string | null;
  connectedOn: Date | null;
}

/**
 * Parse LinkedIn connection CSV rows into structured data.
 *
 * @param rows - Array of parsed CSV rows
 * @returns Array of LinkedInConnection objects
 */
export function parseLinkedInConnections(rows: ParsedRow[]): LinkedInConnection[] {
  return rows.map((row) => {
    const firstName = extractField(row, 'First Name') ?? '';
    const lastName = extractField(row, 'Last Name') ?? '';
    const email = extractField(row, 'Email Address');
    const company = extractField(row, 'Company');
    const position = extractField(row, 'Position');
    const connectedOnStr = extractField(row, 'Connected On');

    let connectedOn: Date | null = null;
    if (connectedOnStr) {
      const parsed = parseLinkedInDate(connectedOnStr);
      if (!isNaN(parsed.getTime())) {
        connectedOn = parsed;
      }
    }

    return {
      firstName,
      lastName,
      email,
      company,
      position,
      connectedOn,
    };
  });
}

/**
 * Extract a field value from a row, returning null for empty values.
 */
function extractField(row: ParsedRow, columnName: string): string | null {
  const value = row[columnName];
  if (value === undefined || value === null || value.trim() === '') {
    return null;
  }
  return value.trim();
}

/**
 * Parse LinkedIn date format.
 * LinkedIn exports dates in various formats:
 * - "01 Jan 2023"
 * - "1 Jan 2023"
 * - "Jan 1, 2023"
 */
function parseLinkedInDate(dateStr: string): Date {
  // Try common LinkedIn date formats
  const formats = [
    // "01 Jan 2023" or "1 Jan 2023"
    /^(\d{1,2})\s+(\w{3})\s+(\d{4})$/,
    // "Jan 1, 2023"
    /^(\w{3})\s+(\d{1,2}),?\s+(\d{4})$/,
  ];

  const monthMap: Record<string, number> = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3,
    'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7,
    'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
  };

  // Try "01 Jan 2023" format
  const match1 = dateStr.match(formats[0]);
  if (match1) {
    const day = parseInt(match1[1], 10);
    const month = monthMap[match1[2]];
    const year = parseInt(match1[3], 10);
    if (month !== undefined) {
      return new Date(year, month, day);
    }
  }

  // Try "Jan 1, 2023" format
  const match2 = dateStr.match(formats[1]);
  if (match2) {
    const month = monthMap[match2[1]];
    const day = parseInt(match2[2], 10);
    const year = parseInt(match2[3], 10);
    if (month !== undefined) {
      return new Date(year, month, day);
    }
  }

  // Fallback to Date.parse
  return new Date(dateStr);
}
