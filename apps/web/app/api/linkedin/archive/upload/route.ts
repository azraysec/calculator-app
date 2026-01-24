/**
 * LinkedIn Archive Upload API
 * POST /api/linkedin/archive/upload
 *
 * Accepts multipart/form-data with LinkedIn archive ZIP file
 * Creates IngestJob record and stores file to Vercel Blob Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  try {
    console.log('[LinkedIn Upload] Starting upload process');

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    console.log('[LinkedIn Upload] Received file:', file?.name, 'Size:', file?.size);

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

    // Upload file to Vercel Blob Storage
    console.log('[LinkedIn Upload] Uploading to Vercel Blob Storage');
    const blobPath = `linkedin-archives/${userId}/${Date.now()}-${file.name}`;

    try {
      const blob = await put(blobPath, file, {
        access: 'public',
        addRandomSuffix: false,
      });

      console.log('[LinkedIn Upload] File uploaded to blob:', blob.url);

      // Create IngestJob record with blob URL
      const job = await prisma.ingestJob.create({
        data: {
          userId,
          sourceName: 'linkedin_archive',
          status: 'queued',
          fileMetadata: {
            fileName: file.name,
            fileSize: file.size,
            uploadedAt: new Date().toISOString(),
            blobUrl: blob.url,
            blobPath: blobPath,
          },
          progress: 0,
        },
      });

      return NextResponse.json({
        jobId: job.id,
        status: 'queued',
        message: 'File uploaded successfully. Ready for processing.',
      });
    } catch (uploadError) {
      console.error('[LinkedIn Upload] Failed to upload to blob:', uploadError);
      throw new Error(`Failed to upload file: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
    }
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
