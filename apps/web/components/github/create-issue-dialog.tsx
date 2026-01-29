'use client';

/**
 * Create GitHub Issue Dialog
 * Opens with Ctrl+F keyboard shortcut for fast feedback
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export function CreateIssueDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('P2-Medium');
  const [labels, setLabels] = useState<string[]>(['enhancement']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ issueNumber: number; issueUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Global keyboard listener for Ctrl+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/github/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          labels,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create issue');
      }

      setSuccess({
        issueNumber: data.issueNumber,
        issueUrl: data.issueUrl,
      });

      // Clear form after 3 seconds
      setTimeout(() => {
        setTitle('');
        setDescription('');
        setPriority('P2-Medium');
        setLabels(['enhancement']);
        setSuccess(null);
        setIsOpen(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLabel = (label: string) => {
    if (labels.includes(label)) {
      setLabels(labels.filter((l) => l !== label));
    } else {
      setLabels([...labels, label]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create GitHub Issue</DialogTitle>
          <DialogDescription>
            Press <kbd className="px-2 py-1 text-xs bg-muted rounded">Ctrl+F</kbd> anytime to open this dialog
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">Issue created successfully!</p>
              <a
                href={success.issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-700 hover:underline"
              >
                View Issue #{success.issueNumber}
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the issue or feature"
                autoFocus
                disabled={isSubmitting}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details, context, or requirements"
                className="w-full min-h-[100px] px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isSubmitting}
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium mb-2">Priority</label>
              <div className="flex gap-2">
                {['P0-Critical', 'P1-High', 'P2-Medium', 'P3-Low'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`px-3 py-1 text-sm rounded-md border ${
                      priority === p
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:bg-muted'
                    }`}
                    disabled={isSubmitting}
                  >
                    {p.replace('P0-', '').replace('P1-', '').replace('P2-', '').replace('P3-', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Labels */}
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <div className="flex gap-2">
                {['bug', 'enhancement', 'feature', 'documentation'].map((label) => (
                  <Badge
                    key={label}
                    variant={labels.includes(label) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => !isSubmitting && toggleLabel(label)}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-900">{error}</p>
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !title.trim()}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Issue'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
