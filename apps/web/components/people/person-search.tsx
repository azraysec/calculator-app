'use client';

/**
 * Person search component with typeahead
 * Searches people by name, email, or title
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command';

interface Person {
  id: string;
  names: string[];
  emails: string[];
  title?: string;
  organization?: {
    name: string;
  };
}

interface PersonSearchProps {
  onSelect: (person: Person) => void;
  placeholder?: string;
}

export function PersonSearch({ onSelect, placeholder }: PersonSearchProps) {
  const [query, setQuery] = useState('');

  const { data: results, isLoading } = useQuery({
    queryKey: ['people', query],
    queryFn: async () => {
      if (!query) return [];
      const res = await fetch(`/api/people?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json() as Promise<Person[]>;
    },
    enabled: query.length > 0,
  });

  return (
    <Command className="border rounded-md">
      <CommandInput
        placeholder={placeholder || 'Search people...'}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isLoading && (
          <div className="p-4 text-sm text-muted-foreground">Searching...</div>
        )}
        {!isLoading && query && (
          <>
            <CommandEmpty>No people found.</CommandEmpty>
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
  );
}
