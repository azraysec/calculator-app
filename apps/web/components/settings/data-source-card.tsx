"use client";

/**
 * Data Source Card Component
 *
 * Displays a single data source connection with:
 * - Connection status
 * - Last sync time
 * - Privacy level
 * - Actions (connect, sync, disconnect, configure)
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
}: DataSourceCardProps) {
  const [loading, setLoading] = useState(false);

  const isConnected = connection?.connectionStatus === 'CONNECTED';
  const hasError = connection?.connectionStatus === 'ERROR';

  const handleAction = async (action: () => void) => {
    setLoading(true);
    try {
      await action();
    } finally {
      setLoading(false);
    }
  };

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
                    disabled={loading}
                    variant="outline"
                  >
                    {loading ? 'Syncing...' : 'Sync Now'}
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
