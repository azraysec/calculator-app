'use client';

/**
 * Version Display Component
 * Shows app version, build info, and timestamp
 */

import { Badge } from '@/components/ui/badge';

// These will be injected at build time
const VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString();
const GIT_COMMIT = process.env.NEXT_PUBLIC_GIT_COMMIT || 'local';

export function VersionDisplay() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Badge variant="outline" className="font-mono">
        v{VERSION}
      </Badge>
      <Badge variant="outline" className="font-mono">
        {GIT_COMMIT.substring(0, 7)}
      </Badge>
      <span className="hidden sm:inline">
        Built: {new Date(BUILD_TIME).toLocaleDateString()} {new Date(BUILD_TIME).toLocaleTimeString()}
      </span>
    </div>
  );
}
