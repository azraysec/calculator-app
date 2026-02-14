/**
 * CSV Parser
 *
 * Generic CSV parsing utility that handles:
 * - CRLF and LF line endings
 * - Quoted fields
 * - Escaped quotes within quoted fields
 * - Commas within quoted fields
 */

/** Parsed row as key-value pairs where keys come from header */
export type ParsedRow = Record<string, string>;

/**
 * Parse a CSV string into an array of objects.
 *
 * @param content - Raw CSV content string
 * @returns Array of parsed rows with header keys
 * @throws Error if CSV is malformed
 */
export function parseCSV(content: string): ParsedRow[] {
  // Normalize line endings
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split into lines
  const lines = splitLines(normalized);

  // Need at least a header row
  if (lines.length === 0) {
    return [];
  }

  // Extract header row (first line)
  const headers = parseRow(lines[0]);

  // Parse data rows
  const results: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Skip completely empty rows
    if (lines[i].trim() === '') {
      continue;
    }

    const values = parseRow(lines[i]);

    // Map values to header keys
    const row: ParsedRow = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? '';
    }

    results.push(row);
  }

  return results;
}

/**
 * Split content into logical lines, handling quoted fields that contain newlines.
 */
function splitLines(content: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"') {
      // Check for escaped quote
      if (inQuotes && content[i + 1] === '"') {
        current += '""';
        i++; // Skip the next quote
      } else {
        inQuotes = !inQuotes;
        current += char;
      }
    } else if (char === '\n' && !inQuotes) {
      lines.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Don't forget the last line
  if (current.length > 0) {
    lines.push(current);
  }

  return lines;
}

/**
 * Parse a single CSV row into an array of values.
 * Handles quoted fields and escaped quotes.
 *
 * @param line - Single CSV row
 * @returns Array of parsed values
 * @throws Error if row is malformed
 */
function parseRow(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote
        if (line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        current += char;
        i++;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        if (current.length > 0) {
          throw new Error(`Malformed CSV: unexpected quote at position ${i}`);
        }
        inQuotes = true;
        i++;
      } else if (char === ',') {
        values.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
  }

  // Check for unclosed quotes
  if (inQuotes) {
    throw new Error('Malformed CSV: unclosed quote');
  }

  // Don't forget the last value
  values.push(current);

  return values;
}
