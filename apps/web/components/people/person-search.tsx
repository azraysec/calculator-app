'use client';

/**
 * Person search component with typeahead
 * Searches people by name, email, or title
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command';
import { isLinkedInUrl, getSearchQueryFromLinkedInUrl, formatLinkedInName } from '@/lib/linkedin-parser';

interface Person {
  id: string;
  names: string[];
  emails: string[];
  title?: string;
  organization?: {
    name: string;
  };
}

interface SearchResponse {
  results: Person[];
  metadata: {
    usedFuzzyMatch: boolean;
    query: string;
    count: number;
  };
}

interface PersonSearchProps {
  onSelect: (person: Person) => void;
  placeholder?: string;
}

export function PersonSearch({ onSelect, placeholder }: PersonSearchProps) {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLinkedIn, setIsLinkedIn] = useState(false);
  const [linkedInMessage, setLinkedInMessage] = useState<string>('');
  const [isFetchingLinkedIn, setIsFetchingLinkedIn] = useState(false);

  // Parse LinkedIn URLs and convert to search query
  useEffect(() => {
    if (isLinkedInUrl(query)) {
      setIsLinkedIn(true);
      const username = getSearchQueryFromLinkedInUrl(query);
      if (username) {
        // Convert LinkedIn username to readable name for search
        const searchName = formatLinkedInName(username);
        setSearchQuery(searchName);
      }
    } else {
      setIsLinkedIn(false);
      setSearchQuery(query);
    }
  }, [query]);

  const { data, isLoading } = useQuery<SearchResponse>({
    queryKey: ['people', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return { results: [], metadata: { usedFuzzyMatch: false, query: '', count: 0 } };
      const res = await fetch(`/api/people?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: searchQuery.length > 0,
  });

  const results = data?.results || [];
  const usedFuzzyMatch = data?.metadata?.usedFuzzyMatch || false;

  // Trigger LinkedIn fetch when no results and LinkedIn URL detected
  const handleLinkedInFetch = async () => {
    if (!isLinkedIn || !query) return;

    setIsFetchingLinkedIn(true);
    setLinkedInMessage('');

    try {
      const response = await fetch('/api/linkedin/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: query }),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.exists) {
          setLinkedInMessage('Found in database! Selecting...');
          onSelect(result.person);
          setQuery('');
        } else if (result.profile) {
          setLinkedInMessage('Profile found on LinkedIn but not in your network yet. Add them first to track introductions.');
        }
      } else if (response.status === 503) {
        setLinkedInMessage('LinkedIn integration not configured. Contact your administrator to set up API credentials.');
      } else {
        setLinkedInMessage(result.error || 'Failed to fetch LinkedIn profile');
      }
    } catch (error) {
      setLinkedInMessage('Network error while fetching LinkedIn profile');
    } finally {
      setIsFetchingLinkedIn(false);
    }
  };

  return (
    <div>
      <Command className="border rounded-md">
        <CommandInput
          placeholder={placeholder || 'Search by name or paste LinkedIn URL...'}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {isLinkedIn && (
            <div className="p-2 text-xs bg-blue-50 text-blue-700 border-b">
              Detected LinkedIn URL - Searching for: {searchQuery}
            </div>
          )}
          {usedFuzzyMatch && results.length > 0 && (
            <div className="p-2 text-xs bg-yellow-50 text-yellow-700 border-b">
              No exact matches found. Did you mean one of these?
            </div>
          )}
          {isLoading && (
            <div className="p-4 text-sm text-muted-foreground">Searching...</div>
          )}
          {!isLoading && query && (
            <>
              <CommandEmpty>
                {isLinkedIn ? (
                  <div className="p-4 space-y-3">
                    <p className="text-sm">No matches found in your network for this LinkedIn profile.</p>
                    {linkedInMessage && (
                      <div className="text-xs bg-yellow-50 text-yellow-700 p-2 rounded">
                        {linkedInMessage}
                      </div>
                    )}
                    <button
                      onClick={handleLinkedInFetch}
                      disabled={isFetchingLinkedIn}
                      className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {isFetchingLinkedIn ? 'Fetching from LinkedIn...' : 'Search LinkedIn'}
                    </button>
                  </div>
                ) : (
                  'No people found.'
                )}
              </CommandEmpty>
              {results?.map((person) => (
                <CommandItem
                  key={person.id}
                  onSelect={() => {
                    onSelect(person);
                    setQuery('');
                  }}
                >
                  <div className="flex flex-col">
                    <div className="font-medium">{person.names[0]}</div>
                    {person.title && (
                      <div className="text-sm text-muted-foreground">
                        {person.title}
                      </div>
                    )}
                    {person.organization && (
                      <div className="text-xs text-muted-foreground">
                        {person.organization.name}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </>
          )}
        </CommandList>
      </Command>
      <p className="text-xs text-muted-foreground mt-2">
        Tip: You can paste a LinkedIn URL (e.g., linkedin.com/in/username) to search
      </p>
    </div>
  );
}
