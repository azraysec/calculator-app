'use client';

/**
 * SourceCard Component
 * Displays data source connection status and actions
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Upload, CheckCircle2, XCircle, Clock, Settings } from 'lucide-react';

interface SourceCardProps {
  source: {
    id: string;
    displayName: string;
    type: 'oauth' | 'archive' | 'api';
    status: 'not_connected' | 'connected' | 'syncing' | 'error';
    progress?: number; // Progress percentage (0-100)
    lastSync?: Date;
    recordCount?: {
      connections?: number;
      messages?: number;
      interactions?: number;
    };
    error?: string;
    icon: React.ReactNode;
    description: string;
  };
  onConnect: () => void;
  onSync: () => void;
  onClick?: () => void;
}

function getStatusBadge(status: SourceCardProps['source']['status']) {
  switch (status) {
    case 'connected':
      return (
        <Badge className="bg-green-500 text-white">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Connected
        </Badge>
      );
    case 'syncing':
      return (
        <Badge className="bg-blue-500 text-white">
          <Clock className="w-3 h-3 mr-1 animate-spin" />
          Syncing
        </Badge>
      );
    case 'error':
      return (
        <Badge className="bg-red-500 text-white">
          <XCircle className="w-3 h-3 mr-1" />
          Error
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Not Connected
        </Badge>
      );
  }
}

function formatLastSync(date?: Date): string {
  if (!date) return 'Never';

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function SourceCard({ source, onConnect, onSync, onClick }: SourceCardProps) {
  const isConnected = source.status !== 'not_connected';
  const isSyncing = source.status === 'syncing';

  return (
    <Card
      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{source.icon}</div>
          <div>
            <h3 className="font-semibold">{source.displayName}</h3>
            {getStatusBadge(source.status)}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4">{source.description}</p>

      {/* Progress Bar (shown when syncing) */}
      {isSyncing && source.progress !== undefined && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Processing...</span>
            <span className="text-xs font-medium">{source.progress}%</span>
          </div>
          <Progress value={source.progress} className="h-2" />
        </div>
      )}

      {/* Stats */}
      {isConnected && source.recordCount && (
        <div className="mb-4 p-3 bg-muted rounded-md">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {source.recordCount.connections !== undefined && (
              <div>
                <div className="text-muted-foreground">Connections</div>
                <div className="font-semibold">{source.recordCount.connections}</div>
              </div>
            )}
            {source.recordCount.messages !== undefined && (
              <div>
                <div className="text-muted-foreground">Messages</div>
                <div className="font-semibold">{source.recordCount.messages}</div>
              </div>
            )}
            {source.recordCount.interactions !== undefined && (
              <div>
                <div className="text-muted-foreground">Interactions</div>
                <div className="font-semibold">{source.recordCount.interactions}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Last Sync - Show even when not connected if there was a previous sync */}
      {source.lastSync && (
        <div className={`text-xs mb-3 ${isConnected ? 'text-muted-foreground' : 'text-amber-600'}`}>
          {isConnected
            ? `Last sync: ${formatLastSync(source.lastSync)}`
            : `Previously connected (${formatLastSync(source.lastSync)})`}
        </div>
      )}

      {/* Error Message */}
      {source.status === 'error' && source.error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {source.error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!isConnected ? (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onConnect();
            }}
            className="w-full"
            size="sm"
          >
            {source.type === 'archive' ? (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Archive
              </>
            ) : (
              <>Connect</>
            )}
          </Button>
        ) : (
          <>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onSync();
              }}
              variant="outline"
              size="sm"
              disabled={isSyncing}
              className="flex-1"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                // Open settings
              }}
              variant="ghost"
              size="sm"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
