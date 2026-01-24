'use client';

/**
 * LinkedInUploadDialog Component
 * Handles LinkedIn archive ZIP upload
 */

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface LinkedInUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: (jobId: string) => void;
}

type UploadState = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export function LinkedInUploadDialog({
  open,
  onOpenChange,
  onUploadComplete,
}: LinkedInUploadDialogProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [_jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.zip')) {
        setError('Please select a ZIP file');
        return;
      }

      // Validate file size (max 100MB)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('File size must be less than 100MB');
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadState('uploading');
    setError(null);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('userId', 'me'); // TODO: Get from auth

      // Upload file
      const uploadResponse = await fetch('/api/linkedin/archive/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const { jobId: newJobId } = await uploadResponse.json();
      setJobId(newJobId);
      setUploadState('processing');

      // Start processing
      const processResponse = await fetch(
        `/api/linkedin/archive/jobs/${newJobId}/process`,
        { method: 'POST' }
      );

      if (!processResponse.ok) {
        throw new Error('Processing failed to start');
      }

      setUploadState('success');
      setTimeout(() => {
        onUploadComplete(newJobId);
        resetDialog();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploadState('error');
    }
  };

  const resetDialog = () => {
    setUploadState('idle');
    setSelectedFile(null);
    setJobId(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (uploadState !== 'uploading' && uploadState !== 'processing') {
      resetDialog();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload LinkedIn Data Archive</DialogTitle>
          <DialogDescription>
            Upload your LinkedIn data export ZIP file to import connections and messages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="font-semibold mb-2">How to get your LinkedIn data:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Go to LinkedIn Settings &amp; Privacy</li>
              <li>Click &quot;Get a copy of your data&quot;</li>
              <li>Select &quot;Connections&quot; and &quot;Messages&quot;</li>
              <li>Request archive and download when ready</li>
              <li>Upload the ZIP file here</li>
            </ol>
          </div>

          {/* File Upload Area */}
          {uploadState === 'idle' && (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                className="hidden"
                id="linkedin-archive-upload"
              />
              <label
                htmlFor="linkedin-archive-upload"
                className="cursor-pointer block"
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">
                  {selectedFile ? selectedFile.name : 'Click to select ZIP file'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Maximum file size: 100MB
                </p>
              </label>
            </div>
          )}

          {/* Upload Progress */}
          {(uploadState === 'uploading' || uploadState === 'processing') && (
            <div className="border rounded-lg p-6 text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-500" />
              <p className="font-medium mb-1">
                {uploadState === 'uploading'
                  ? 'Uploading archive...'
                  : 'Processing data...'}
              </p>
              <p className="text-sm text-muted-foreground">
                This may take a few minutes
              </p>
            </div>
          )}

          {/* Success State */}
          {uploadState === 'success' && (
            <div className="border border-green-200 bg-green-50 rounded-lg p-6 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="font-medium mb-1">Upload successful!</p>
              <p className="text-sm text-muted-foreground">
                Processing your LinkedIn data in the background.
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="border border-red-200 bg-red-50 rounded-lg p-4 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Upload failed</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={uploadState === 'uploading' || uploadState === 'processing'}
          >
            {uploadState === 'success' ? 'Close' : 'Cancel'}
          </Button>
          {uploadState === 'idle' && (
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadState !== 'idle'}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload & Process
            </Button>
          )}
          {uploadState === 'error' && (
            <Button onClick={() => setUploadState('idle')}>Try Again</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
