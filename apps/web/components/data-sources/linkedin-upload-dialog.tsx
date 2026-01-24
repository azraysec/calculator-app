'use client';

/**
 * LinkedInUploadDialog Component
 * Handles LinkedIn archive ZIP upload with progress tracking and visible logs
 */

import { useState, useRef, useEffect } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogs([]);

      // Validate file type
      if (!file.name.endsWith('.zip')) {
        setError('Please select a ZIP file');
        addLog('❌ Error: File must be a ZIP archive');
        return;
      }

      // Validate file size (max 100MB)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('File size must be less than 100MB');
        addLog('❌ Error: File size exceeds 100MB limit');
        return;
      }

      setSelectedFile(file);
      setError(null);
      addLog(`✓ Selected file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  };

  const pollJobStatus = async (currentJobId: string) => {
    try {
      const response = await fetch(`/api/linkedin/archive/jobs/${currentJobId}`);
      if (!response.ok) {
        throw new Error('Failed to get job status');
      }

      const job = await response.json();

      // Update progress
      setProgress(job.progress || 0);

      // Add log if there's a new message
      if (job.logs) {
        addLog(job.logs);
      }

      // Check status
      if (job.status === 'completed') {
        addLog('✓ Processing completed successfully!');
        setUploadState('success');
        setProgress(100);

        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }

        setTimeout(() => {
          onUploadComplete(currentJobId);
          resetDialog();
        }, 2000);
      } else if (job.status === 'failed') {
        addLog(`❌ Processing failed: ${job.error || 'Unknown error'}`);
        setError(job.error || 'Processing failed');
        setUploadState('error');

        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      }
    } catch (err) {
      console.error('Poll job status error:', err);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadState('uploading');
    setError(null);
    setProgress(0);
    setLogs([]);

    try {
      addLog('📤 Starting file upload...');

      // Create form data
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('userId', 'me'); // TODO: Get from auth

      // Upload file
      addLog('📡 Uploading to server...');
      const uploadResponse = await fetch('/api/linkedin/archive/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        addLog(`❌ Upload failed: ${errorData.error || 'Unknown error'}`);
        addLog(`Details: ${errorData.details || 'No additional details'}`);
        throw new Error(errorData.error || 'Upload failed');
      }

      const { jobId: newJobId } = await uploadResponse.json();
      setJobId(newJobId);
      addLog(`✓ File uploaded successfully (Job ID: ${newJobId})`);
      setProgress(10);

      setUploadState('processing');
      addLog('⚙️ Starting processing...');

      // Start processing
      const processResponse = await fetch(
        `/api/linkedin/archive/jobs/${newJobId}/process`,
        { method: 'POST' }
      );

      if (!processResponse.ok) {
        addLog('❌ Failed to start processing');
        throw new Error('Processing failed to start');
      }

      addLog('✓ Processing started');
      setProgress(15);

      // Start polling for job status
      pollIntervalRef.current = setInterval(() => {
        pollJobStatus(newJobId);
      }, 1000); // Poll every second

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      setUploadState('error');
      addLog(`❌ Error: ${errorMessage}`);
    }
  };

  const resetDialog = () => {
    setUploadState('idle');
    setSelectedFile(null);
    setJobId(null);
    setError(null);
    setProgress(0);
    setLogs([]);

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

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

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
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

          {/* Progress Bar */}
          {(uploadState === 'uploading' || uploadState === 'processing') && (
            <div className="space-y-3">
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  <div>
                    <p className="font-medium">
                      {uploadState === 'uploading' ? 'Uploading archive...' : 'Processing data...'}
                    </p>
                    <p className="text-sm text-muted-foreground">{progress}% complete</p>
                  </div>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            </div>
          )}

          {/* Success State */}
          {uploadState === 'success' && (
            <div className="border border-green-200 bg-green-50 rounded-lg p-6 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="font-medium mb-1">Upload successful!</p>
              <p className="text-sm text-muted-foreground">
                Your LinkedIn data has been processed.
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

          {/* Logs Panel */}
          {logs.length > 0 && (
            <div className="border rounded-lg">
              <div className="p-3 border-b bg-muted/50">
                <p className="text-sm font-semibold">Activity Log</p>
              </div>
              <ScrollArea className="h-40 p-3">
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className="text-xs font-mono">
                      {log}
                    </div>
                  ))}
                </div>
              </ScrollArea>
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
