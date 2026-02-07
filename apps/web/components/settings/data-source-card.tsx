"use client";

/**
 * Data Source Card Component
 *
 * Displays a single data source connection with:
 * - Connection status
 * - Last sync time
 * - Privacy level
 * - Actions (connect, sync, disconnect, configure)
 * - Real-time sync progress
 */

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export interface DataSourceConnection {
  id: string;
  sourceType: 'LINKEDIN' | 'FACEBOOK' | 'EMAIL';
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  privacyLevel: 'PRIVATE' | 'CONNECTIONS_ONLY' | 'PUBLIC';
  lastSyncedAt?: Date;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

interface SyncStatus {
  syncing: boolean;
  job?: {
    id: string;
    status: string;
    progress: number;
    logs: string;
    startedAt?: string;
    completedAt?: string;
    error?: string;
    result?: {
      messagesProcessed?: number;
      newContacts?: number;
      pagesProcessed?: number;
    };
  };
}

interface DataSourceCardProps {
  connection?: DataSourceConnection;
  displayName: string;
  description: string;
  icon: string;
  sourceType?: string;
  onConnect: () => void;
  onSync?: () => void;
  onConfigure?: () => void;
  onDisconnect?: () => void;
  onReset?: () => void;
  needsReset?: boolean;
  onSyncComplete?: () => void;
}

export function DataSourceCard({
  connection,
  displayName,
  description,
  icon,
  sourceType,
  onConnect,
  onSync,
  onConfigure,
  onDisconnect,
  onReset,
  needsReset,
  onSyncComplete,
}: DataSourceCardProps) {
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [polling, setPolling] = useState(false);

  const isConnected = connection?.connectionStatus === 'CONNECTED';
  const hasError = connection?.connectionStatus === 'ERROR';

  // Poll for sync status when syncing Gmail
  const fetchSyncStatus = useCallback(async () => {
    if (sourceType !== 'EMAIL') return;

    try {
      const response = await fetch('/api/gmail/sync');
      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data);

        // If sync just completed, notify parent
        if (data.job?.status === 'completed' && polling) {
          setPolling(false);
          onSyncComplete?.();
        }
        // If sync failed, stop polling
        if (data.job?.status === 'failed') {
          setPolling(false);
        }

        return data.syncing;
      }
    } catch (error) {
      console.error('Error fetching sync status:', error);
    }
    return false;
  }, [sourceType, polling, onSyncComplete]);

  // Start polling when component mounts (for Gmail only)
  useEffect(() => {
    if (sourceType !== 'EMAIL' || !isConnected) return;

    // Initial fetch
    fetchSyncStatus().then((isSyncing) => {
      if (isSyncing) setPolling(true);
    });
  }, [sourceType, isConnected, fetchSyncStatus]);

  // Poll every 3 seconds while syncing
  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(async () => {
      const stillSyncing = await fetchSyncStatus();
      if (!stillSyncing) {
        setPolling(false);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [polling, fetchSyncStatus]);

  const handleAction = async (action: () => void) => {
    setLoading(true);
    try {
      await action();
      // Start polling after sync action for Gmail
      if (sourceType === 'EMAIL') {
        setPolling(true);
        await fetchSyncStatus();
      }
    } finally {
      setLoading(false);
    }
  };

  // Check if currently syncing
  const isSyncing = syncStatus?.syncing || syncStatus?.job?.status === 'running' || syncStatus?.job?.status === 'queued';

  const getStatusBadge = () => {
    if (!connection || connection.connectionStatus === 'DISCONNECTED') {
      return <Badge variant="secondary">Not Connected</Badge>;
    }
    if (connection.connectionStatus === 'ERROR') {
      return <Badge variant="destructive">Error</Badge>;
    }
    return <Badge variant="default" className="bg-green-600">Connected</Badge>;
  };

  const getPrivacyBadge = () => {
    if (!connection) return null;

    const privacyMap = {
      PRIVATE: { label: 'Private', variant: 'secondary' as const },
      CONNECTIONS_ONLY: { label: 'Connections Only', variant: 'outline' as const },
      PUBLIC: { label: 'Public', variant: 'outline' as const },
    };

    const { label, variant } = privacyMap[connection.privacyLevel];
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <Card className={hasError ? 'border-destructive' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{icon}</div>
            <div>
              <CardTitle>{displayName}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {getStatusBadge()}
            {getPrivacyBadge()}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Last Sync Time */}
          {connection?.lastSyncedAt && (
            <div className="text-sm text-muted-foreground">
              Last synced: {new Date(connection.lastSyncedAt).toLocaleString()}
            </div>
          )}

          {/* Metadata */}
          {connection?.metadata && (
            <div className="text-sm text-muted-foreground">
              {connection.metadata.recordCount && (
                <div>
                  Records: {connection.metadata.recordCount.connections || 0} connections,{' '}
                  {connection.metadata.recordCount.messages || 0} messages
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {hasError && connection?.metadata?.error && (
            <div className="text-sm text-destructive">
              Error: {connection.metadata.error}
            </div>
          )}

          {/* Gmail Sync Progress */}
          {sourceType === 'EMAIL' && syncStatus?.job && (
            <div className="space-y-2">
              {isSyncing && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {syncStatus.job.status === 'queued' ? 'Starting sync...' : 'Syncing emails...'}
                    </span>
                    <span className="font-medium">{syncStatus.job.progress || 0}%</span>
                  </div>
                  <Progress value={syncStatus.job.progress || 0} className="h-2" />
                  {syncStatus.job.logs && (
                    <p className="text-xs text-muted-foreground truncate">{syncStatus.job.logs}</p>
                  )}
                </>
              )}
              {syncStatus.job.status === 'completed' && syncStatus.job.result && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <p className="font-medium text-green-800 mb-1">Sync completed!</p>
                  <ul className="text-green-700 text-xs space-y-0.5">
                    <li>• {syncStatus.job.result.messagesProcessed || 0} emails processed</li>
                    <li>• {syncStatus.job.result.newContacts || 0} new contacts found</li>
                    <li>• {syncStatus.job.result.pagesProcessed || 0} pages processed</li>
                  </ul>
                </div>
              )}
              {syncStatus.job.status === 'failed' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                  <p className="font-medium text-red-800">Sync failed</p>
                  <p className="text-red-700 text-xs">{syncStatus.job.error || 'Unknown error'}</p>
                </div>
              )}
            </div>
          )}

          {/* Gmail Reset Instructions */}
          {needsReset && sourceType === 'EMAIL' && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Gmail Access Needs Reset</h4>
              <p className="text-sm text-yellow-700 mb-3">
                To connect Gmail, you need to re-authorize access. This is a one-time fix.
              </p>
              <ol className="text-sm text-yellow-700 list-decimal ml-4 space-y-1 mb-4">
                <li>Click &quot;Open Google Permissions&quot; below</li>
                <li>Find this app and click &quot;Remove Access&quot;</li>
                <li>Come back here and click &quot;Connect&quot;</li>
              </ol>
              <div className="flex gap-3">
                {onReset && (
                  <Button
                    onClick={onReset}
                    variant="outline"
                    className="bg-yellow-600 text-white hover:bg-yellow-700"
                  >
                    Open Google Permissions ↗
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!isConnected && !hasError && (
              <Button
                onClick={() => handleAction(onConnect)}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Connecting...' : 'Connect'}
              </Button>
            )}

            {isConnected && (
              <>
                {onSync && (
                  <Button
                    onClick={() => handleAction(onSync)}
                    disabled={loading || isSyncing}
                    variant="outline"
                  >
                    {loading || isSyncing ? 'Syncing...' : 'Sync Now'}
                  </Button>
                )}
                {onConfigure && (
                  <Button
                    onClick={() => handleAction(onConfigure)}
                    disabled={loading}
                    variant="outline"
                  >
                    Configure
                  </Button>
                )}
                {onDisconnect && (
                  <Button
                    onClick={() => handleAction(onDisconnect)}
                    disabled={loading}
                    variant="destructive"
                  >
                    Disconnect
                  </Button>
                )}
              </>
            )}

            {hasError && (
              <>
                <Button
                  onClick={() => handleAction(onConnect)}
                  disabled={loading}
                  variant="default"
                >
                  Retry Connection
                </Button>
                {onDisconnect && (
                  <Button
                    onClick={() => handleAction(onDisconnect)}
                    disabled={loading}
                    variant="outline"
                  >
                    Remove
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
