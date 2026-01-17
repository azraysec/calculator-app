'use client';

/**
 * Intro Finder - Main interface for finding warm introduction paths
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ThreePanelLayout } from '@/components/layouts/three-panel-layout';
import { PersonSearch } from '@/components/people/person-search';
import { PathCard } from '@/components/paths/path-card';
import { GraphCanvas } from '@/components/graph/graph-canvas';
import { Skeleton } from '@/components/ui/skeleton';

interface Person {
  id: string;
  names: string[];
  emails: string[];
  title?: string;
  organization?: {
    name: string;
  };
}

interface Path {
  nodes: Person[];
  edges: Array<{
    id: string;
    strength: number;
    fromPersonId: string;
    toPersonId: string;
  }>;
  score: number;
  explanation: string;
}

interface PathfindingResult {
  paths: Path[];
  targetPerson: Person;
  searchMetadata: {
    nodesExplored: number;
    edgesEvaluated: number;
    duration: number;
  };
}

export default function IntroFinderPage() {
  const [targetPerson, setTargetPerson] = useState<Person | null>(null);
  const [selectedPath, setSelectedPath] = useState<Path | null>(null);

  // TODO: Replace with actual user ID from auth
  const currentUserId = 'me';

  const {
    data: pathsResult,
    isLoading,
    error,
  } = useQuery<PathfindingResult>({
    queryKey: ['paths', currentUserId, targetPerson?.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/people/${currentUserId}/paths?target=${targetPerson!.id}`
      );
      if (!res.ok) {
        throw new Error('Failed to find paths');
      }
      return res.json();
    },
    enabled: !!targetPerson,
  });

  // Auto-select first path when results arrive
  if (pathsResult?.paths && !selectedPath) {
    setSelectedPath(pathsResult.paths[0]);
  }

  return (
    <ThreePanelLayout
      leftPanel={
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Find Introduction</h2>
            <PersonSearch
              onSelect={(person) => {
                setTargetPerson(person);
                setSelectedPath(null);
              }}
              placeholder="Who do you want to meet?"
            />
          </div>

          {targetPerson && (
            <div className="p-3 bg-muted rounded-md">
              <div className="text-sm font-medium">Target:</div>
              <div className="text-sm">{targetPerson.names[0]}</div>
              {targetPerson.title && (
                <div className="text-xs text-muted-foreground">
                  {targetPerson.title}
                </div>
              )}
            </div>
          )}

          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {error && (
            <div className="p-4 border border-destructive rounded-md">
              <div className="font-medium text-destructive">Error</div>
              <div className="text-sm text-muted-foreground">
                Failed to find introduction paths
              </div>
            </div>
          )}

          {pathsResult && pathsResult.paths.length === 0 && (
            <div className="p-4 border rounded-md">
              <div className="font-medium">No paths found</div>
              <div className="text-sm text-muted-foreground">
                No warm introduction paths found to {targetPerson?.names[0]}.
                Try increasing max hops or connecting more data sources.
              </div>
            </div>
          )}

          {pathsResult?.paths.map((path, index) => (
            <PathCard
              key={`${path.nodes.map((n) => n.id).join('-')}-${index}`}
              path={path}
              isSelected={selectedPath === path}
              onSelect={() => setSelectedPath(path)}
            />
          ))}

          {pathsResult && (
            <div className="pt-4 border-t text-xs text-muted-foreground">
              <div>Searched {pathsResult.searchMetadata.nodesExplored} nodes</div>
              <div>
                Evaluated {pathsResult.searchMetadata.edgesEvaluated} connections
              </div>
              <div>
                Completed in {pathsResult.searchMetadata.duration.toFixed(0)}ms
              </div>
            </div>
          )}
        </div>
      }
      centerPanel={<GraphCanvas path={selectedPath} />}
      rightPanel={
        <div className="space-y-4">
          {selectedPath ? (
            <>
              <div>
                <h3 className="font-semibold mb-2">Path Details</h3>
                <div className="space-y-2">
                  {selectedPath.nodes.map((person, index) => (
                    <div key={person.id} className="text-sm">
                      <div className="font-medium">{person.names[0]}</div>
                      {person.title && (
                        <div className="text-muted-foreground text-xs">
                          {person.title}
                        </div>
                      )}
                      {index < selectedPath.nodes.length - 1 && (
                        <div className="text-xs text-muted-foreground ml-4 my-1">
                          ↓ {Math.round(selectedPath.edges[index].strength * 100)}
                          % connection strength
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-2">Next Steps</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {selectedPath.explanation}
                </p>
                <p className="text-xs text-muted-foreground">
                  Evidence viewer and outreach composer coming in next phase...
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a path to view details and generate introduction requests.
            </p>
          )}
        </div>
      }
    />
  );
}
