"use client";

/**
 * Settings Page
 *
 * User settings including:
 * - Gmail connection management
 * - Data source configuration
 * - Account preferences
 */

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { GmailConnection } from "@/components/settings/gmail-connection";

export default function SettingsPage() {
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">
            Manage your data sources and account preferences
          </p>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account</h2>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-blue-600">
                {session.user?.name?.[0] || session.user?.email?.[0] || "?"}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {session.user?.name || "User"}
              </p>
              <p className="text-sm text-gray-600">{session.user?.email}</p>
            </div>
          </div>
        </div>

        {/* Data Sources */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Data Sources
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Connect your accounts to build your network graph and discover
              warm intro paths.
            </p>
          </div>

          {/* Gmail Connection */}
          <GmailConnection />

          {/* LinkedIn Note (Already uploaded via archives) */}
          <div className="border rounded-lg p-6 bg-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-700"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    LinkedIn
                  </h3>
                  <p className="text-sm text-gray-600">
                    Import via archive upload on main page
                  </p>
                </div>
              </div>

              <div className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                Archive Upload
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p>
                LinkedIn data is imported via archive files. Go to the main page
                to upload your LinkedIn archive.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
