"use client";

/**
 * Data Sources Manager Component
 *
 * Manages all data source connections:
 * - Lists all available data sources
 * - Shows connection status for each
 * - Allows connecting/disconnecting
 * - Allows configuring privacy settings
 */

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { DataSourceCard, type DataSourceConnection } from './data-source-card';
import { PrivacySettings } from './privacy-settings';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUser } from '@/contexts/user-context';

interface DataSource {
  sourceType: 'LINKEDIN' | 'FACEBOOK' | 'EMAIL';
  displayName: string;
  description: string;
  icon: string;
  type: 'oauth' | 'archive';
}

const DATA_SOURCES: DataSource[] = [
  {
    sourceType: 'EMAIL',
    displayName: 'Gmail',
    description: 'Connect Gmail to import email interactions',
    icon: '📧',
    type: 'oauth',
  },
  {
    sourceType: 'LINKEDIN',
    displayName: 'LinkedIn',
    description: 'Import connections and messages from LinkedIn data archive',
    icon: '🔗',
    type: 'archive',
  },
  {
    sourceType: 'FACEBOOK',
    displayName: 'Facebook',
    description: 'Import connections from Facebook (coming soon)',
    icon: '👥',
    type: 'oauth',
  },
];

export function DataSourcesManager() {
  const { refetch } = useUser();
  const [connections, setConnections] = useState<DataSourceConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConnection, setSelectedConnection] = useState<DataSourceConnection | null>(null);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);

  // Fetch data source connections
  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/data-sources');

      if (!response.ok) {
        throw new Error('Failed to fetch data sources');
      }

      const data = await response.json();
      setConnections(data.connections || []);
    } catch (error) {
      console.error('Error fetching data sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (sourceType: string) => {
    try {
      if (sourceType === 'EMAIL') {
        // Gmail OAuth flow
        await signIn('google', {
          callbackUrl: '/settings?gmailConnected=true',
        });
      } else if (sourceType === 'LINKEDIN') {
        // LinkedIn is archive-based, redirect to main page
        window.location.href = '/?tab=sources';
      } else {
        alert(`${sourceType} connection coming soon!`);
      }
    } catch (error) {
      console.error('Error connecting data source:', error);
      alert('Failed to connect. Please try again.');
    }
  };

  const handleGmailReset = () => {
    window.open('https://myaccount.google.com/permissions', '_blank');
  };

  const handleSync = async (sourceType: string, fullSync: boolean = true) => {
    try {
      if (sourceType === 'EMAIL') {
        const response = await fetch('/api/gmail/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullSync }),
        });

        if (response.ok) {
          alert('Gmail sync started in background! This will process all your emails. Check back in a few minutes.');
          await fetchConnections();
          await refetch();
        } else {
          const error = await response.json();
          alert(error.error || 'Failed to start sync. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error syncing data source:', error);
      alert('Failed to sync. Please try again.');
    }
  };

  const handleConfigure = (connection: DataSourceConnection) => {
    setSelectedConnection(connection);
    setPrivacyDialogOpen(true);
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this data source?')) {
      return;
    }

    try {
      const response = await fetch(`/api/data-sources/${connectionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Data source disconnected successfully');
        await fetchConnections();
        await refetch();
      } else {
        alert('Failed to disconnect. Please try again.');
      }
    } catch (error) {
      console.error('Error disconnecting data source:', error);
      alert('Failed to disconnect. Please try again.');
    }
  };

  const handleUpdatePrivacy = async (privacyLevel: 'PRIVATE' | 'CONNECTIONS_ONLY' | 'PUBLIC') => {
    if (!selectedConnection) return;

    try {
      const response = await fetch(`/api/data-sources/${selectedConnection.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ privacyLevel }),
      });

      if (response.ok) {
        alert('Privacy settings updated successfully');
        await fetchConnections();
        setPrivacyDialogOpen(false);
      } else {
        alert('Failed to update privacy settings. Please try again.');
      }
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      alert('Failed to update privacy settings. Please try again.');
    }
  };

  // Find connection for each data source
  const getConnection = (sourceType: string): DataSourceConnection | undefined => {
    return connections.find((c) => c.sourceType === sourceType);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-gray-200 rounded-lg"></div>
          <div className="h-40 bg-gray-200 rounded-lg"></div>
          <div className="h-40 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {DATA_SOURCES.map((source) => {
        const connection = getConnection(source.sourceType);
        // Gmail needs reset if there's a DISCONNECTED or ERROR status
        // (means user tried to connect but refresh_token wasn't saved)
        const needsReset = source.sourceType === 'EMAIL' &&
          (connection?.connectionStatus === 'DISCONNECTED' || connection?.connectionStatus === 'ERROR');
        return (
          <DataSourceCard
            key={source.sourceType}
            connection={connection}
            displayName={source.displayName}
            description={source.description}
            icon={source.icon}
            sourceType={source.sourceType}
            onConnect={() => handleConnect(source.sourceType)}
            onSync={connection?.connectionStatus === 'CONNECTED' ? () => handleSync(source.sourceType) : undefined}
            onConfigure={connection?.connectionStatus === 'CONNECTED' ? () => handleConfigure(connection) : undefined}
            onDisconnect={connection ? () => handleDisconnect(connection.id) : undefined}
            onReset={needsReset ? handleGmailReset : undefined}
            needsReset={needsReset}
          />
        );
      })}

      {/* Privacy Settings Dialog */}
      <Dialog open={privacyDialogOpen} onOpenChange={setPrivacyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure Privacy Settings</DialogTitle>
          </DialogHeader>
          {selectedConnection && (
            <PrivacySettings
              connection={selectedConnection}
              onUpdate={handleUpdatePrivacy}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
