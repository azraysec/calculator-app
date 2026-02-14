/**
 * CSV Import API
 * POST /api/import/csv
 *
 * Imports LinkedIn connections from a CSV file.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { CSVAdapter } from '@wig/adapters';

/** Maximum file size: 5MB */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const POST = withAuth(async (request: Request, { userId }) => {
  try {
    // Parse request as FormData
    const formData = await request.formData();
    const file = formData.get('file');

    // Validate file exists
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided', message: 'Please upload a CSV file' },
        { status: 400 }
      );
    }

    // Validate file type
    const isCSV =
      file.type === 'text/csv' ||
      file.type === 'application/vnd.ms-excel' ||
      file.name.endsWith('.csv');

    if (!isCSV) {
      return NextResponse.json(
        { error: 'Invalid file type', message: 'Please upload a CSV file' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large', message: 'Maximum file size is 5MB' },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();

    // Import using CSVAdapter
    const adapter = new CSVAdapter(prisma);
    const result = await adapter.importLinkedInConnections(userId, content);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to import CSV' },
      { status: 500 }
    );
  }
});
