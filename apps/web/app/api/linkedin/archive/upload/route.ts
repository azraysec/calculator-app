/**
 * LinkedIn Archive Upload API
 * POST /api/linkedin/archive/upload
 *
 * Accepts multipart/form-data with LinkedIn archive ZIP file
 * Creates IngestJob record and stores file for processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { prisma } from '@/lib/prisma';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'linkedin');

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.zip')) {
      return NextResponse.json(
        { error: 'File must be a ZIP archive' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 100MB limit' },
        { status: 400 }
      );
    }

    // Create IngestJob record
    const job = await prisma.ingestJob.create({
      data: {
        userId,
        sourceName: 'linkedin_archive',
        status: 'queued',
        fileMetadata: {
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        },
        progress: 0,
      },
    });

    // Ensure upload directory exists
    const jobDir = join(UPLOAD_DIR, job.id);
    await mkdir(jobDir, { recursive: true });

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = join(jobDir, file.name);
    await writeFile(filePath, buffer);

    // Update job with file path
    await prisma.ingestJob.update({
      where: { id: job.id },
      data: {
        fileMetadata: {
          ...job.fileMetadata as object,
          storagePath: filePath,
        },
      },
    });

    return NextResponse.json({
      jobId: job.id,
      status: 'queued',
      message: 'File uploaded successfully. Ready for processing.',
    });
  } catch (error) {
    console.error('LinkedIn archive upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload archive',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
