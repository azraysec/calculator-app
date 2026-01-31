"use client";

/**
 * User Context Provider
 *
 * Provides authenticated user data throughout the application.
 * Handles fetching and caching user session information including:
 * - User identity (id, email, name)
 * - Gmail connection status
 * - Associated Person record
 * - Last sync timestamps
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export interface UserPerson {
  id: string;
  names: string[];
  emails: string[];
  title?: string;
  organization?: {
    id: string;
    name: string;
  };
}

export interface UserContextData {
  id: string;
  email: string;
  name?: string;
  googleRefreshToken: boolean;
  lastGmailSyncAt?: Date;
  person?: UserPerson;
}

interface UserContextValue {
  user: UserContextData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserContextData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    if (!session?.user?.id) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/me');

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      setUser(data);
    } catch (err) {
      console.error('Error fetching user:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchUser();
    } else if (status === 'unauthenticated') {
      setUser(null);
      setLoading(false);
    }
  }, [session, status]);

  const value: UserContextValue = {
    user,
    loading,
    error,
    refetch: fetchUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

/**
 * Hook to access user context
 * Must be used within UserProvider
 */
export function useUser() {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }

  return context;
}
