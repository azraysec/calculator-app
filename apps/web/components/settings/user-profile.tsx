"use client";

/**
 * User Profile Component
 *
 * Displays user account information including:
 * - Profile picture and name
 * - Email address
 * - Account creation date
 * - Associated Person record (if linked)
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/contexts/user-context';

export function UserProfile() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="animate-pulse bg-gray-200 h-6 w-32 rounded"></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>User not found</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Get initials for avatar
  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return '?';
  };

  const initials = getInitials(user.name, user.email);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Account</CardTitle>
        <CardDescription>Manage your account information and preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
            {initials}
          </div>

          {/* User Info */}
          <div className="flex-1 space-y-3">
            {/* Name */}
            <div>
              <div className="text-lg font-semibold">{user.name || 'Anonymous User'}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>

            {/* Badges */}
            <div className="flex gap-2">
              {user.googleRefreshToken && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Gmail Connected
                </Badge>
              )}
              {user.person && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Profile Linked
                </Badge>
              )}
            </div>

            {/* Person Record Link */}
            {user.person && (
              <div className="pt-3 border-t">
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Linked Profile
                </div>
                <div className="text-sm">
                  <div className="font-medium">{user.person.names[0]}</div>
                  {user.person.title && (
                    <div className="text-muted-foreground">{user.person.title}</div>
                  )}
                  {user.person.organization && (
                    <div className="text-muted-foreground">
                      {user.person.organization.name}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Last Sync */}
            {user.lastGmailSyncAt && (
              <div className="pt-3 border-t">
                <div className="text-sm text-muted-foreground">
                  Last Gmail sync:{' '}
                  <span className="font-medium text-foreground">
                    {new Date(user.lastGmailSyncAt).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
