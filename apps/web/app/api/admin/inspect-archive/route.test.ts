/**
 * Tests for Archive Inspector API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock AdmZip - must capture callbacks in factory
let mockZipInstance: any = {
  getEntries: vi.fn(),
  readAsText: vi.fn(),
};

vi.mock('adm-zip', () => {
  return {
    default: class MockAdmZip {
      constructor() {
        return mockZipInstance;
      }
    },
  };
});

// Mock fs
vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

import { writeFileSync, unlinkSync } from 'fs';

describe('Archive Inspector API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockZipInstance.getEntries.mockReset();
    mockZipInstance.readAsText.mockReset();
  });

  describe('POST /api/admin/inspect-archive', () => {
    const createFormDataRequest = (file: File | null) => {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      return new Request('http://localhost/api/admin/inspect-archive', {
        method: 'POST',
        body: formData,
      });
    };

    it('should return 400 when no file provided', async () => {
      const formData = new FormData();
      const request = new Request('http://localhost/api/admin/inspect-archive', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No file provided');
    });

    it('should inspect archive and return file list', async () => {
      const mockEntries = [
        {
          entryName: 'Connections.csv',
          header: { size: 1000, compressedSize: 500 },
          isDirectory: false,
        },
        {
          entryName: 'Messages.csv',
          header: { size: 5000, compressedSize: 2000 },
          isDirectory: false,
        },
        {
          entryName: 'folder/',
          header: { size: 0, compressedSize: 0 },
          isDirectory: true,
        },
      ];

      mockZipInstance.getEntries.mockReturnValue(mockEntries);
      mockZipInstance.readAsText.mockImplementation((entry: any) => {
        if (entry.entryName.toLowerCase().includes('connections')) {
          return 'First Name,Last Name,Email\nJohn,Doe,john@example.com';
        }
        if (entry.entryName.toLowerCase().includes('messages')) {
          return 'Date,From,To,Content\n2024-01-01,Alice,Bob,Hello';
        }
        return '';
      });

      const file = new File(['zip content'], 'archive.zip', { type: 'application/zip' });
      const response = await POST(createFormDataRequest(file));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.fileName).toBe('archive.zip');
      expect(data.totalFiles).toBe(3);
      expect(data.connectionsFile.found).toBe(true);
      expect(data.messagesFile.found).toBe(true);
    });

    it('should handle archive without connections file', async () => {
      mockZipInstance.getEntries.mockReturnValue([
        {
          entryName: 'other-file.txt',
          header: { size: 100, compressedSize: 50 },
          isDirectory: false,
        },
      ]);

      const file = new File(['zip content'], 'archive.zip', { type: 'application/zip' });
      const response = await POST(createFormDataRequest(file));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.connectionsFile.found).toBe(false);
      expect(data.messagesFile.found).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockZipInstance.getEntries.mockImplementation(() => {
        throw new Error('Invalid archive format');
      });

      const file = new File(['invalid content'], 'bad.zip', { type: 'application/zip' });
      const response = await POST(createFormDataRequest(file));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to inspect archive');
      expect(data.details).toBe('Invalid archive format');
    });

    it('should clean up temp file after processing', async () => {
      mockZipInstance.getEntries.mockReturnValue([]);

      const file = new File(['zip content'], 'archive.zip', { type: 'application/zip' });
      await POST(createFormDataRequest(file));

      expect(writeFileSync).toHaveBeenCalled();
      expect(unlinkSync).toHaveBeenCalled();
    });

    it('should clean up temp file even on error', async () => {
      mockZipInstance.getEntries.mockImplementation(() => {
        throw new Error('Error');
      });

      const file = new File(['content'], 'archive.zip', { type: 'application/zip' });
      await POST(createFormDataRequest(file));

      expect(unlinkSync).toHaveBeenCalled();
    });

    it('should limit preview to first 10 lines', async () => {
      const mockEntries = [
        {
          entryName: 'Connections.csv',
          header: { size: 1000, compressedSize: 500 },
          isDirectory: false,
        },
      ];

      mockZipInstance.getEntries.mockReturnValue(mockEntries);
      mockZipInstance.readAsText.mockReturnValue(
        Array.from({ length: 20 }, (_, i) => `Line ${i + 1}`).join('\n')
      );

      const file = new File(['zip content'], 'archive.zip', { type: 'application/zip' });
      const response = await POST(createFormDataRequest(file));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.connectionsFile.preview).toBe(
        Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`).join('\n')
      );
    });
  });
});
