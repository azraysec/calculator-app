'use client';

/**
 * Data Sources Page
 * Manage data source connections and sync status
 * Per UI Design Spec Section 4.2
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { SourceCard } from '@/components/data-sources/source-card';
import { SyncHealthWidget } from '@/components/data-sources/sync-health-widget';
import { LinkedInUploadDialog } from '@/components/data-sources/linkedin-upload-dialog';

interface DataSource {
  id: string;
  name: string;
  displayName: string;
  type: 'oauth' | 'archive' | 'api';
  status: 'not_connected' | 'connected' | 'syncing' | 'error';
  lastSync?: Date;
  recordCount?: {
    connections?: number;
    messages?: number;
    interactions?: number;
  };
  error?: string;
  icon: React.ReactNode;
  description: string;
}

const DATA_SOURCES: DataSource[] = [
  {
    id: 'linkedin',
    name: 'linkedin',
    displayName: 'LinkedIn',
    type: 'archive',
    status: 'not_connected',
    icon: '🔗',
    description: 'Import connections and messages from LinkedIn data archive',
  },
  {
    id: 'gmail',
    name: 'gmail',
    displayName: 'Gmail',
    type: 'oauth',
    status: 'not_connected',
    icon: '📧',
    description: 'Connect Gmail to import email interactions',
  },
  {
    id: 'hubspot',
    name: 'hubspot',
    displayName: 'HubSpot',
    type: 'oauth',
    status: 'not_connected',
    icon: '🎯',
    description: 'Sync contacts and interactions from HubSpot CRM',
  },
  {
    id: 'calendar',
    name: 'calendar',
    displayName: 'Google Calendar',
    type: 'oauth',
    status: 'not_connected',
    icon: '📅',
    description: 'Import meeting history and attendees',
  },
  {
    id: 'csv',
    name: 'csv',
    displayName: 'CSV Import',
    type: 'archive',
    status: 'not_connected',
    icon: '📄',
    description: 'Upload contacts from CSV file',
  },
];

export default function DataSourcesPage() {
  const [sources, setSources] = useState<DataSource[]>(DATA_SOURCES);
  const [linkedInDialogOpen, setLinkedInDialogOpen] = useState(false);

  const handleConnect = (sourceId: string) => {
    const source = sources.find((s) => s.id === sourceId);
    if (!source) return;

    if (source.type === 'archive') {
      if (sourceId === 'linkedin') {
        setLinkedInDialogOpen(true);
      }
    } else {
      // OAuth flow would be triggered here
      console.log('Triggering OAuth for', sourceId);
    }
  };

  const handleSync = (sourceId: string) => {
    setSources((prev) =>
      prev.map((s) =>
        s.id === sourceId ? { ...s, status: 'syncing' as const } : s
      )
    );
    // Trigger sync API call
    console.log('Syncing', sourceId);
  };

  const handleUploadComplete = (_jobId: string) => {
    // Update LinkedIn source status
    setSources((prev) =>
      prev.map((s) =>
        s.id === 'linkedin'
          ? { ...s, status: 'syncing' as const, lastSync: new Date() }
          : s
      )
    );
    setLinkedInDialogOpen(false);
  };

  const connectedSources = sources.filter((s) => s.status !== 'not_connected');
  const errorSources = sources.filter((s) => s.status === 'error');

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Data Sources</h1>
        <p className="text-muted-foreground">
          Connect your professional data sources to build your warm intro graph
        </p>
      </div>

      {/* Sync Health Summary */}
      <div className="mb-6">
        <SyncHealthWidget
          connectedCount={connectedSources.length}
          errorCount={errorSources.length}
          lastSyncTime={
            connectedSources[0]?.lastSync || new Date()
          }
        />
      </div>

      {/* Source Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {sources.map((source) => (
          <SourceCard
            key={source.id}
            source={source}
            onConnect={() => handleConnect(source.id)}
            onSync={() => handleSync(source.id)}
          />
        ))}
      </div>

      {/* Recent Sync Runs */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Sync Runs</h2>
        <div className="space-y-3">
          {connectedSources.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No data sources connected yet. Connect a source above to start building
              your network graph.
            </p>
          ) : (
            <div className="text-sm text-muted-foreground">
              Sync history will appear here after connecting data sources.
            </div>
          )}
        </div>
      </Card>

      {/* LinkedIn Upload Dialog */}
      <LinkedInUploadDialog
        open={linkedInDialogOpen}
        onOpenChange={setLinkedInDialogOpen}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}
