"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";

interface SyncStatus {
  syncing: boolean;
  lastSync: string | null;
  job: {
    id: string;
    status: string;
    progress: number;
    logs: string;
    startedAt: string | null;
    completedAt: string | null;
    error: string | null;
    result: {
      messagesProcessed?: number;
      newContacts?: number;
      pagesProcessed?: number;
    } | null;
  } | null;
}

interface GmailConnectionProps {
  onConnectionChange?: (connected: boolean) => void;
}

/**
 * Gmail Connection Component
 *
 * Displays Gmail connection status and allows users to:
 * - Connect their Gmail account via OAuth
 * - View sync progress in real-time
 * - Trigger full sync with all messages
 * - See sync statistics
 */
export function GmailConnection({ onConnectionChange }: GmailConnectionProps) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [polling, setPolling] = useState(false);

  // Fetch user data
  useEffect(() => {
    async function fetchUser() {
      if (!session?.user?.id) return;

      try {
        const response = await fetch('/api/me');
        if (response.ok) {
          const data = await response.json();
          setUser(data);
          onConnectionChange?.(!!data.googleRefreshToken);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    }

    if (status === 'authenticated') {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [session, status, onConnectionChange]);

  // Fetch sync status
  const fetchSyncStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/gmail/sync');
      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data);
        return data;
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
    return null;
  }, []);

  // Initial sync status fetch
  useEffect(() => {
    if (user?.googleRefreshToken) {
      fetchSyncStatus();
    }
  }, [user, fetchSyncStatus]);

  // Poll for sync status when syncing
  useEffect(() => {
    if (!syncStatus?.syncing || polling) return;

    setPolling(true);
    const interval = setInterval(async () => {
      const status = await fetchSyncStatus();
      if (!status?.syncing) {
        clearInterval(interval);
        setPolling(false);
      }
    }, 2000); // Poll every 2 seconds

    return () => {
      clearInterval(interval);
      setPolling(false);
    };
  }, [syncStatus?.syncing, polling, fetchSyncStatus]);

  const handleConnect = async () => {
    await signIn('google', {
      callbackUrl: '/settings?gmailConnected=true',
    });
  };

  const handleSync = async (fullSync: boolean = false) => {
    try {
      setLoading(true);
      const response = await fetch('/api/gmail/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullSync }),
      });

      if (response.ok) {
        // Immediately fetch status to start showing progress
        await fetchSyncStatus();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to start sync. Please try again.');
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Failed to start sync. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  const isConnected = !!user?.googleRefreshToken;
  const isSyncing = syncStatus?.syncing || false;
  const lastSyncAt = syncStatus?.lastSync
    ? new Date(syncStatus.lastSync)
    : user?.lastGmailSyncAt
    ? new Date(user.lastGmailSyncAt)
    : null;

  return (
    <div className="border rounded-lg p-6 bg-white">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
            </svg>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900">Gmail</h3>
            <p className="text-sm text-gray-600">
              {isSyncing
                ? 'Syncing your emails...'
                : isConnected
                ? 'Connected - Email evidence is being synced'
                : 'Connect to import email interactions'}
            </p>
          </div>
        </div>

        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            isSyncing
              ? 'bg-blue-100 text-blue-800'
              : isConnected
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {isSyncing ? 'Syncing...' : isConnected ? 'Connected' : 'Not Connected'}
        </div>
      </div>

      {/* Sync Progress Bar */}
      {isSyncing && syncStatus?.job && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{syncStatus.job.logs}</span>
            <span className="text-gray-900 font-medium">{syncStatus.job.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${syncStatus.job.progress}%` }}
            ></div>
          </div>
          {syncStatus.job.result && (
            <div className="flex gap-4 text-xs text-gray-500">
              {syncStatus.job.result.messagesProcessed !== undefined && (
                <span>{syncStatus.job.result.messagesProcessed} messages</span>
              )}
              {syncStatus.job.result.newContacts !== undefined && (
                <span>{syncStatus.job.result.newContacts} new contacts</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sync Completed Status */}
      {!isSyncing && syncStatus?.job?.status === 'completed' && syncStatus.job.result && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 text-green-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Last sync complete</span>
          </div>
          <div className="mt-1 text-sm text-green-700">
            {syncStatus.job.result.messagesProcessed} messages processed,{' '}
            {syncStatus.job.result.newContacts} new contacts found
          </div>
        </div>
      )}

      {/* Sync Error Status */}
      {!isSyncing && syncStatus?.job?.status === 'failed' && (
        <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 text-red-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="font-medium">Sync failed</span>
          </div>
          <div className="mt-1 text-sm text-red-700">
            {syncStatus.job.error || 'An error occurred during sync'}
          </div>
        </div>
      )}

      {isConnected ? (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Last synced:</span>
            <span className="text-gray-900 font-medium">
              {lastSyncAt ? lastSyncAt.toLocaleString() : 'Never'}
            </span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleSync(false)}
              disabled={loading || isSyncing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSyncing ? 'Syncing...' : 'Sync New Emails'}
            </button>

            <button
              onClick={() => handleSync(true)}
              disabled={loading || isSyncing}
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Full Sync
            </button>

            <button
              onClick={handleConnect}
              disabled={isSyncing}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Reconnect
            </button>
          </div>

          <p className="text-xs text-gray-500">
            <strong>Sync New Emails:</strong> Fetches emails since last sync.{' '}
            <strong>Full Sync:</strong> Re-imports all emails (may take longer).
          </p>
        </div>
      ) : user && !isConnected ? (
        // User is logged in with Google but Gmail not connected - needs to revoke and reconnect
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">Gmail Access Needs Reset</h4>
            <p className="text-sm text-yellow-700 mb-3">
              To connect Gmail, you need to re-authorize access. This is a one-time fix.
            </p>
            <ol className="text-sm text-yellow-700 list-decimal ml-4 space-y-1 mb-4">
              <li>Click &quot;Open Google Permissions&quot; below</li>
              <li>Find this app and click &quot;Remove Access&quot;</li>
              <li>Come back here and click &quot;Connect Gmail&quot;</li>
            </ol>
            <div className="flex gap-3">
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
              >
                Open Google Permissions ↗
              </a>
              <button
                onClick={handleConnect}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Connect Gmail
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <button
            onClick={handleConnect}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Connect Gmail Account
          </button>

          <div className="mt-4 text-sm text-gray-600">
            <p className="font-medium mb-2">What we&apos;ll access:</p>
            <ul className="space-y-1 ml-4">
              <li className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Read-only access to your emails
              </li>
              <li className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Email metadata (subject, participants, timestamp)
              </li>
              <li className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                We do NOT store email content
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
