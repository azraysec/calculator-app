'use client';

/**
 * ActionPanel - Display action panel for selected introduction path
 *
 * Shows path details and provides tools to generate and copy intro request drafts.
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Copy, Users, Target, ArrowRight, Sparkles } from 'lucide-react';

export interface PathResultWithNames {
  /** Node IDs in the path */
  path: string[];
  /** Score (0-1) */
  score: number;
  /** Human-readable explanation */
  explanation: string;
  /** Rank among other paths */
  rank: number;
  /** Node names, matching path order */
  names: string[];
}

export interface ActionPanelProps {
  /** Selected path with names, null if no path selected */
  path: PathResultWithNames | null;
  /** Optional callback when intro is requested */
  onRequestIntro?: (draft: string) => void;
}

/**
 * Generate an introduction draft message
 */
export function generateIntroDraft(path: PathResultWithNames): string {
  if (path.names.length < 2) {
    return '';
  }

  const targetName = path.names[path.names.length - 1];

  // Direct connection (no intermediary)
  if (path.names.length === 2) {
    return `Hi ${targetName},

I noticed we're connected and I'd love to schedule some time to chat. I'm interested in learning more about your work.

Would you be open to a quick coffee chat or video call?

Best regards`;
  }

  // With intermediary(ies)
  const intermediaries = path.names.slice(1, -1);
  const firstIntermediary = intermediaries[0];

  return `Hi ${firstIntermediary},

I hope this message finds you well! I noticed you're connected with ${targetName}, and I'd love an introduction if you think it would be appropriate.

I'm particularly interested in connecting with ${targetName} because ${path.explanation || 'I believe we could have a valuable conversation'}.

Would you be willing to make an introduction? I'd be happy to draft an intro email for you to make it easier.

Thanks so much for considering this!

Best regards`;
}

export function ActionPanel({ path, onRequestIntro: _onRequestIntro }: ActionPanelProps) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<string>('');
  const [showDraft, setShowDraft] = useState(false);

  // Generate draft when path changes
  const generatedDraft = useMemo(() => {
    if (!path) return '';
    return generateIntroDraft(path);
  }, [path]);

  // Handle generating draft
  const handleGenerateDraft = useCallback(() => {
    setDraft(generatedDraft);
    setShowDraft(true);
  }, [generatedDraft]);

  // Handle copying draft
  const handleCopyDraft = useCallback(async () => {
    const textToCopy = draft || generatedDraft;
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: 'Copied!',
        description: 'Introduction draft copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Unable to copy to clipboard',
        variant: 'destructive',
      });
    }
  }, [draft, generatedDraft, toast]);

  // Don't render if no path
  if (!path) {
    return null;
  }

  const targetName = path.names[path.names.length - 1];
  const intermediaries = path.names.slice(1, -1);
  const scorePercent = Math.round(path.score * 100);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Introduction Path
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Target */}
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Target:</span>
          <span className="font-medium">{targetName}</span>
        </div>

        {/* Path visualization */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">You</Badge>
          {intermediaries.length > 0 ? (
            <>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              {intermediaries.map((name, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    {name}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </>
          ) : (
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Badge variant="default" className="text-xs">{targetName}</Badge>
        </div>

        {/* Path strength */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Path strength</span>
            <span className="font-medium">{scorePercent}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${scorePercent}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="default"
            className="flex-1"
            onClick={handleGenerateDraft}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Request Intro
          </Button>
          {showDraft && (
            <Button
              variant="outline"
              onClick={handleCopyDraft}
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Draft textarea */}
        {showDraft && (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Introduction draft..."
              rows={8}
              className="resize-none text-sm"
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCopyDraft}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy to Clipboard
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ActionPanel;
