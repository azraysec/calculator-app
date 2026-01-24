'use client';

/**
 * Network Overview Component
 * Displays all people and connections in the graph
 */

import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface Person {
  id: string;
  names: string[];
  emails: string[];
  phones: string[];
  title?: string;
  organization?: {
    id: string;
    name: string;
  };
  socialHandles?: Record<string, string>;
}

interface Edge {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  relationshipType: string;
  strength: number;
  channels: string[];
  interactionCount: number;
  lastSeenAt: Date;
}

interface NetworkData {
  people: Person[];
  edges: Edge[];
  stats: {
    totalPeople: number;
    totalConnections: number;
    averageConnectionsPerPerson: number;
    strongConnections: number;
    mediumConnections: number;
    weakConnections: number;
  };
  organizationGroups: Array<{
    name: string;
    count: number;
  }>;
}

function getStrengthColor(strength: number) {
  if (strength >= 0.7) return 'bg-green-500 text-white';
  if (strength >= 0.4) return 'bg-yellow-500 text-black';
  return 'bg-gray-400 text-white';
}


export function NetworkOverview() {
  const { data, isLoading, error } = useQuery<NetworkData>({
    queryKey: ['network'],
    queryFn: async () => {
      const res = await fetch('/api/network');
      if (!res.ok) throw new Error('Failed to fetch network');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-destructive">Failed to load network data</div>
      </Card>
    );
  }

  if (!data) return null;

  // Create a map of person connections
  const connectionMap = new Map<string, Edge[]>();
  data.edges.forEach(edge => {
    if (!connectionMap.has(edge.fromPersonId)) {
      connectionMap.set(edge.fromPersonId, []);
    }
    connectionMap.get(edge.fromPersonId)!.push(edge);
  });

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Network Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <div className="text-3xl font-bold text-blue-600">
              {data.stats.totalPeople}
            </div>
            <div className="text-sm text-muted-foreground">Total People</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-600">
              {data.stats.totalConnections}
            </div>
            <div className="text-sm text-muted-foreground">Total Connections</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600">
              {data.stats.strongConnections}
            </div>
            <div className="text-sm text-muted-foreground">Strong Connections</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-yellow-600">
              {data.stats.mediumConnections}
            </div>
            <div className="text-sm text-muted-foreground">Medium Connections</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-600">
              {data.stats.weakConnections}
            </div>
            <div className="text-sm text-muted-foreground">Weak Connections</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-indigo-600">
              {data.stats.averageConnectionsPerPerson.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">Avg Connections</div>
          </div>
        </div>
      </Card>

      {/* Organization Groups */}
      {data.organizationGroups.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Organizations</h2>
          <div className="flex flex-wrap gap-2">
            {data.organizationGroups.map(group => (
              <Badge key={group.name} variant="outline" className="text-sm">
                {group.name} ({group.count})
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* People List */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">
          All People ({data.people.length})
        </h2>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {data.people.map(person => {
            const connections = connectionMap.get(person.id) || [];
            const strongConnections = connections.filter(e => e.strength >= 0.7).length;

            return (
              <div
                key={person.id}
                className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50"
              >
                <Avatar className="h-12 w-12">
                  <div className="h-full w-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold">
                    {person.names[0]?.charAt(0) || '?'}
                  </div>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold">{person.names[0]}</div>
                    {strongConnections > 0 && (
                      <Badge className="bg-green-500 text-white text-xs">
                        {strongConnections} strong
                      </Badge>
                    )}
                  </div>

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

                  {person.emails.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {person.emails[0]}
                    </div>
                  )}

                  {connections.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {connections.length} connection{connections.length !== 1 ? 's' : ''}
                      </span>
                      <div className="flex gap-1">
                        {connections.slice(0, 3).map(conn => (
                          <Badge
                            key={conn.id}
                            className={`${getStrengthColor(conn.strength)} text-xs`}
                          >
                            {Math.round(conn.strength * 100)}%
                          </Badge>
                        ))}
                        {connections.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{connections.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Connection Strength Legend */}
      <Card className="p-4">
        <h3 className="font-semibold mb-2 text-sm">Connection Strength</h3>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500 text-white">Strong</Badge>
            <span className="text-muted-foreground">≥ 70%</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-yellow-500 text-black">Medium</Badge>
            <span className="text-muted-foreground">40-69%</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-gray-400 text-white">Weak</Badge>
            <span className="text-muted-foreground">{'< 40%'}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
