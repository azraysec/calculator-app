"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";

interface GmailConnectionProps {
  onConnectionChange?: (connected: boolean) => void;
}

/**
 * Gmail Connection Component
 *
 * Displays Gmail connection status and allows users to:
 * - Connect their Gmail account via OAuth
 * - View last sync time
 * - Trigger manual sync
 * - Disconnect their Gmail account
 */
export function GmailConnection({ onConnectionChange }: GmailConnectionProps) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const handleConnect = async () => {
    await signIn('google', {
      callbackUrl: '/settings?gmailConnected=true',
    });
  };

  const handleSync = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cron/gmail-sync', {
        method: 'POST',
      });

      if (response.ok) {
        alert('Gmail sync started! This may take a few minutes.');
      } else {
        alert('Failed to start sync. Please try again.');
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
  const lastSyncAt = user?.lastGmailSyncAt
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
              {isConnected
                ? 'Connected - Email evidence is being synced'
                : 'Connect to import email interactions'}
            </p>
          </div>
        </div>

        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            isConnected
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {isConnected ? 'Connected' : 'Not Connected'}
        </div>
      </div>

      {isConnected ? (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Last synced:</span>
            <span className="text-gray-900 font-medium">
              {lastSyncAt
                ? lastSyncAt.toLocaleString()
                : 'Never'}
            </span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSync}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Syncing...' : 'Sync Now'}
            </button>

            <button
              onClick={handleConnect}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reconnect
            </button>
          </div>

          <p className="text-xs text-gray-500">
            Automatic sync runs every 15 minutes. Manual sync will fetch the
            latest emails immediately.
          </p>
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
