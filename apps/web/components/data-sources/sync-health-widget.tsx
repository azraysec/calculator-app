'use client';

/**
 * SyncHealthWidget Component
 * Displays overall sync health status
 */

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface SyncHealthWidgetProps {
  connectedCount: number;
  errorCount: number;
  lastSyncTime: Date;
}

export function SyncHealthWidget({
  connectedCount,
  errorCount,
  lastSyncTime,
}: SyncHealthWidgetProps) {
  const healthStatus =
    errorCount > 0 ? 'error' : connectedCount > 0 ? 'healthy' : 'none';

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold mb-1">Sync Health</h3>
          <div className="flex items-center gap-2">
            {healthStatus === 'healthy' && (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">
                  All sources synced successfully
                </span>
              </>
            )}
            {healthStatus === 'error' && (
              <>
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-muted-foreground">
                  {errorCount} {errorCount === 1 ? 'source' : 'sources'} with errors
                </span>
              </>
            )}
            {healthStatus === 'none' && (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">
                  No data sources connected
                </span>
              </>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold">{connectedCount}</div>
          <div className="text-xs text-muted-foreground">
            Connected {connectedCount === 1 ? 'Source' : 'Sources'}
          </div>
        </div>
      </div>
    </Card>
  );
}
