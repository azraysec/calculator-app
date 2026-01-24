'use client';

/**
 * Intro Finder - Main interface for finding warm introduction paths
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ThreePanelLayout } from '@/components/layouts/three-panel-layout';
import { PersonSearch } from '@/components/people/person-search';
import { PathCard } from '@/components/paths/path-card';
import { GraphCanvas } from '@/components/graph/graph-canvas';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RequirementsTable } from '@/components/backlog/requirements-table';
import { NetworkOverview } from '@/components/network/network-overview';
import { VersionDisplay } from '@/components/common/version-display';
import { EvidenceViewer } from '@/components/evidence/evidence-viewer';
import { SourceCard } from '@/components/data-sources/source-card';
import { SyncHealthWidget } from '@/components/data-sources/sync-health-widget';
import { LinkedInUploadDialog } from '@/components/data-sources/linkedin-upload-dialog';
import { Card } from '@/components/ui/card';

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

interface DataSource {
  id: string;
  name: string;
  displayName: string;
  type: 'oauth' | 'archive' | 'api';
  status: 'not_connected' | 'connected' | 'syncing' | 'error';
  lastSync?: Date;
  recordCount?: {
    connections?: number;
    messages?: number;
    interactions?: number;
  };
  error?: string;
  icon: React.ReactNode;
  description: string;
}

const DATA_SOURCES: DataSource[] = [
  {
    id: 'linkedin',
    name: 'linkedin',
    displayName: 'LinkedIn',
    type: 'archive',
    status: 'not_connected',
    icon: '🔗',
    description: 'Import connections and messages from LinkedIn data archive',
  },
  {
    id: 'gmail',
    name: 'gmail',
    displayName: 'Gmail',
    type: 'oauth',
    status: 'not_connected',
    icon: '📧',
    description: 'Connect Gmail to import email interactions',
  },
  {
    id: 'hubspot',
    name: 'hubspot',
    displayName: 'HubSpot',
    type: 'oauth',
    status: 'not_connected',
    icon: '🎯',
    description: 'Sync contacts and interactions from HubSpot CRM',
  },
  {
    id: 'calendar',
    name: 'calendar',
    displayName: 'Google Calendar',
    type: 'oauth',
    status: 'not_connected',
    icon: '📅',
    description: 'Import meeting history and attendees',
  },
  {
    id: 'csv',
    name: 'csv',
    displayName: 'CSV Import',
    type: 'archive',
    status: 'not_connected',
    icon: '📄',
    description: 'Upload contacts from CSV file',
  },
];

export default function IntroFinderPage() {
  const [targetPerson, setTargetPerson] = useState<Person | null>(null);
  const [selectedPath, setSelectedPath] = useState<Path | null>(null);
  const [sources, setSources] = useState<DataSource[]>(DATA_SOURCES);
  const [linkedInDialogOpen, setLinkedInDialogOpen] = useState(false);

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
  useEffect(() => {
    if (pathsResult?.paths && pathsResult.paths.length > 0 && !selectedPath) {
      setSelectedPath(pathsResult.paths[0]);
    }
  }, [pathsResult, selectedPath]);

  // Data sources handlers
  const handleConnect = (sourceId: string) => {
    const source = sources.find((s) => s.id === sourceId);
    if (!source) return;

    if (source.type === 'archive') {
      if (sourceId === 'linkedin') {
        setLinkedInDialogOpen(true);
      }
    } else {
      // OAuth flow would be triggered here
      console.log('Triggering OAuth for', sourceId);
    }
  };

  const handleSync = (sourceId: string) => {
    setSources((prev) =>
      prev.map((s) =>
        s.id === sourceId ? { ...s, status: 'syncing' as const } : s
      )
    );
    // Trigger sync API call
    console.log('Syncing', sourceId);
  };

  const handleUploadComplete = (_jobId: string) => {
    // Update LinkedIn source status
    setSources((prev) =>
      prev.map((s) =>
        s.id === 'linkedin'
          ? { ...s, status: 'syncing' as const, lastSync: new Date() }
          : s
      )
    );
    setLinkedInDialogOpen(false);
  };

  const connectedSources = sources.filter((s) => s.status !== 'not_connected');
  const errorSources = sources.filter((s) => s.status === 'error');

  const introFinderContent = (
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
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                <TabsTrigger value="evidence" className="flex-1">Evidence</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4">
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
                    Outreach composer coming in next phase...
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="evidence" className="mt-4">
                <EvidenceViewer />
              </TabsContent>
            </Tabs>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a path to view details and generate introduction requests.
            </p>
          )}
        </div>
      }
    />
  );

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Warm Intro Graph</h1>
            <p className="text-muted-foreground">
              Find warm introduction paths through your professional network
            </p>
          </div>
          <VersionDisplay />
        </div>
      </div>

      <Tabs defaultValue="finder" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="finder">Intro Finder</TabsTrigger>
          <TabsTrigger value="network">My Network</TabsTrigger>
          <TabsTrigger value="sources">Data Sources</TabsTrigger>
          <TabsTrigger value="changelog">Changelog</TabsTrigger>
        </TabsList>

        <TabsContent value="finder" className="mt-0">
          {introFinderContent}
        </TabsContent>

        <TabsContent value="network" className="mt-0">
          <NetworkOverview />
        </TabsContent>

        <TabsContent value="sources" className="mt-0">
          <div className="space-y-6">
            {/* Sync Health Summary */}
            <SyncHealthWidget
              connectedCount={connectedSources.length}
              errorCount={errorSources.length}
              lastSyncTime={connectedSources[0]?.lastSync || new Date()}
            />

            {/* Source Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sources.map((source) => (
                <SourceCard
                  key={source.id}
                  source={source}
                  onConnect={() => handleConnect(source.id)}
                  onSync={() => handleSync(source.id)}
                />
              ))}
            </div>

            {/* Recent Sync Runs */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Sync Runs</h2>
              <div className="space-y-3">
                {connectedSources.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No data sources connected yet. Connect a source above to start building
                    your network graph.
                  </p>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Sync history will appear here after connecting data sources.
                  </div>
                )}
              </div>
            </Card>

            {/* LinkedIn Upload Dialog */}
            <LinkedInUploadDialog
              open={linkedInDialogOpen}
              onOpenChange={setLinkedInDialogOpen}
              onUploadComplete={handleUploadComplete}
            />
          </div>
        </TabsContent>

        <TabsContent value="changelog" className="mt-0">
          <RequirementsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
