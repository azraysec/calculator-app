/**
 * Archive Inspector API
 * POST /api/admin/inspect-archive
 *
 * Diagnostic endpoint to inspect LinkedIn archive contents
 */

import { NextRequest, NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Save to temp file
    const buffer = Buffer.from(await file.arrayBuffer());
    tempFilePath = join(tmpdir(), `inspect-${Date.now()}.zip`);
    writeFileSync(tempFilePath, buffer);

    // Extract and inspect
    const zip = new AdmZip(tempFilePath);
    const entries = zip.getEntries();

    const fileList = entries.map((entry) => ({
      name: entry.entryName,
      size: entry.header.size,
      compressedSize: entry.header.compressedSize,
      isDirectory: entry.isDirectory,
    }));

    // Look for specific files
    const connectionsFile = entries.find((e) =>
      e.entryName.toLowerCase().includes('connections.csv')
    );
    const messagesFile = entries.find((e) =>
      e.entryName.toLowerCase().includes('messages.csv')
    );

    // If messages file exists, check its content
    let messagesPreview = null;
    let messagesLineCount = 0;
    if (messagesFile) {
      const content = zip.readAsText(messagesFile);
      const lines = content.split('\n');
      messagesLineCount = lines.length;
      messagesPreview = lines.slice(0, 10).join('\n');
    }

    // If connections file exists, check its content
    let connectionsPreview = null;
    let connectionsLineCount = 0;
    if (connectionsFile) {
      const content = zip.readAsText(connectionsFile);
      const lines = content.split('\n');
      connectionsLineCount = lines.length;
      connectionsPreview = lines.slice(0, 10).join('\n');
    }

    return NextResponse.json({
      fileName: file.name,
      fileSize: file.size,
      totalFiles: entries.length,
      files: fileList,
      connectionsFile: {
        found: !!connectionsFile,
        name: connectionsFile?.entryName,
        size: connectionsFile?.header.size,
        lineCount: connectionsLineCount,
        preview: connectionsPreview,
      },
      messagesFile: {
        found: !!messagesFile,
        name: messagesFile?.entryName,
        size: messagesFile?.header.size,
        lineCount: messagesLineCount,
        preview: messagesPreview,
      },
    });
  } catch (error) {
    console.error('Error inspecting archive:', error);
    return NextResponse.json(
      {
        error: 'Failed to inspect archive',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    // Clean up temp file
    if (tempFilePath) {
      try {
        unlinkSync(tempFilePath);
      } catch (error) {
        console.error('Failed to delete temp file:', error);
      }
    }
  }
}
