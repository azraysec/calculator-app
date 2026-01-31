"use client";

/**
 * Settings Page
 *
 * User settings including:
 * - User profile display
 * - Data source connection management
 * - Privacy settings configuration
 * - Account preferences
 */

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { UserProvider } from "@/contexts/user-context";
import { UserProfile } from "@/components/settings/user-profile";
import { DataSourcesManager } from "@/components/settings/data-sources-manager";
import { Button } from "@/components/ui/button";

function SettingsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/settings");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg text-gray-600">
          Loading settings...
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-gray-600">
              Manage your data sources, privacy, and account preferences
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">
              Back to Home
            </Button>
          </Link>
        </div>

        {/* User Profile */}
        <div className="mb-8">
          <UserProfile />
        </div>

        {/* Data Sources Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Data Sources
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Connect your accounts to build your network graph and discover
              warm introduction paths. All connections default to private.
            </p>
          </div>

          <DataSourcesManager />
        </div>

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <div className="text-blue-600 text-xl">ℹ️</div>
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Privacy & Security</p>
                <p>
                  Your data is encrypted and isolated to your account. By default,
                  all data sources are set to PRIVATE mode, meaning only you can
                  access your connections and messages. You can adjust privacy
                  settings for each data source individually.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <UserProvider>
      <SettingsContent />
    </UserProvider>
  );
}
