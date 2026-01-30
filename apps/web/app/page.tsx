'use client';

/**
 * Intro Finder - Main interface for finding warm introduction paths
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
import { LinkedInUploadHistory } from '@/components/data-sources/linkedin-upload-history';
import { ConnectionsGrid } from '@/components/connections/connections-grid';
import { CreateIssueDialog } from '@/components/github/create-issue-dialog';

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
  progress?: number; // Progress percentage (0-100)
  jobId?: string; // Current processing job ID
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
  const [activeTab, setActiveTab] = useState('finder');

  // Fetch current user's person record
  const { data: currentUser } = useQuery<Person>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await fetch('/api/me');
      if (!res.ok) {
        throw new Error('Failed to fetch current user');
      }
      return res.json();
    },
  });

  const {
    data: pathsResult,
    isLoading: isLoadingPaths,
    error,
  } = useQuery<PathfindingResult>({
    queryKey: ['paths', currentUser?.id, targetPerson?.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/people/${currentUser!.id}/paths?target=${targetPerson!.id}`
      );
      if (!res.ok) {
        throw new Error('Failed to find paths');
      }
      return res.json();
    },
    enabled: !!currentUser && !!targetPerson,
  });

  const isLoading = isLoadingPaths;

  // Fetch evidence for selected path
  const { data: evidenceData } = useQuery<{
    edges: Array<{
      edgeId: string;
      fromPersonName: string;
      toPersonName: string;
      evidence: Array<{
        id: string;
        type: string;
        timestamp: Date;
        source: string;
        metadata?: Record<string, any>;
      }>;
    }>;
  }>({
    queryKey: ['evidence', selectedPath?.edges.map((e) => e.id).join(',')],
    queryFn: async () => {
      if (!selectedPath || selectedPath.edges.length === 0) {
        return { edges: [] };
      }
      const edgeIds = selectedPath.edges.map((e) => e.id).join(',');
      const res = await fetch(`/api/evidence?edgeIds=${edgeIds}`);
      if (!res.ok) {
        throw new Error('Failed to fetch evidence');
      }
      return res.json();
    },
    enabled: !!selectedPath && selectedPath.edges.length > 0,
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

  const handleUploadComplete = (jobId: string) => {
    // Update LinkedIn source status and start polling
    setSources((prev) =>
      prev.map((s) =>
        s.id === 'linkedin'
          ? { ...s, status: 'syncing' as const, jobId, progress: 0, lastSync: new Date() }
          : s
      )
    );
    setLinkedInDialogOpen(false);

    // Start polling for job progress
    pollJobProgress(jobId);
  };

  const pollJobProgress = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/linkedin/archive/jobs/${jobId}`);
        if (!response.ok) {
          clearInterval(pollInterval);
          setSources(prev =>
            prev.map(s =>
              s.id === 'linkedin' && s.jobId === jobId
                ? { ...s, status: 'error' as const, error: 'Failed to fetch job status' }
                : s
            )
          );
          return;
        }

        const job = await response.json();

        // Update progress
        setSources(prev =>
          prev.map(s =>
            s.id === 'linkedin' && s.jobId === jobId
              ? { ...s, progress: job.progress || 0 }
              : s
          )
        );

        // Check if completed
        if (job.status === 'completed') {
          clearInterval(pollInterval);
          setSources(prev =>
            prev.map(s =>
              s.id === 'linkedin' && s.jobId === jobId
                ? {
                    ...s,
                    status: 'connected' as const,
                    progress: 100,
                    recordCount: {
                      connections: job.resultMetadata?.connectionsProcessed || 0,
                      messages: job.resultMetadata?.messagesProcessed || 0,
                    },
                  }
                : s
            )
          );
        } else if (job.status === 'failed') {
          clearInterval(pollInterval);
          setSources(prev =>
            prev.map(s =>
              s.id === 'linkedin' && s.jobId === jobId
                ? { ...s, status: 'error' as const, error: job.error || 'Processing failed' }
                : s
            )
          );
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        clearInterval(pollInterval);
        setSources(prev =>
          prev.map(s =>
            s.id === 'linkedin' && s.jobId === jobId
              ? { ...s, status: 'error' as const, error: 'Failed to check job status' }
              : s
          )
        );
      }
    }, 2000); // Poll every 2 seconds

    // Cleanup after 5 minutes max
    setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000);
  };

  const connectedSources = sources.filter((s) => s.status !== 'not_connected');
  const errorSources = sources.filter((s) => s.status === 'error');

  // Handle finding path to a person from connections grid
  const handleFindPath = (person: Person) => {
    setTargetPerson(person);
    setSelectedPath(null);
    setActiveTab('finder');
  };

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
                <EvidenceViewer pathEdges={evidenceData?.edges} />
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
          <div className="flex items-center gap-4">
            <Link
              href="/settings"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Settings
            </Link>
            <VersionDisplay />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="finder">Intro Finder</TabsTrigger>
          <TabsTrigger value="network">My Network</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="sources">Data Sources</TabsTrigger>
          <TabsTrigger value="changelog">Changelog</TabsTrigger>
        </TabsList>

        <TabsContent value="finder" className="mt-0">
          {introFinderContent}
        </TabsContent>

        <TabsContent value="network" className="mt-0">
          <NetworkOverview />
        </TabsContent>

        <TabsContent value="connections" className="mt-0">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Connections</h2>
              <p className="text-muted-foreground">
                Browse and filter all connections in your network
              </p>
            </div>
            <ConnectionsGrid onFindPath={handleFindPath} />
          </div>
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

            {/* LinkedIn Upload History */}
            <div>
              <h2 className="text-xl font-semibold mb-4">LinkedIn Upload History</h2>
              <LinkedInUploadHistory />
            </div>

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

      {/* Global Create Issue Dialog (Ctrl+F) */}
      <CreateIssueDialog />
    </div>
  );
}
