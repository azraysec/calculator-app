'use client';

/**
 * Person Detail View
 * Displays complete person data with all evidence, connections, and interactions
 */

import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  MessageCircle,
  Users,
  Activity,
  Database,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PersonDetailViewProps {
  personId: string;
  onClose: () => void;
}

export function PersonDetailView({ personId, onClose }: PersonDetailViewProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['person-detail', personId],
    queryFn: async () => {
      const res = await fetch(`/api/people/${personId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch person details');
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <p className="text-red-500">Error loading person details</p>
        <Button onClick={onClose} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const { person, connections, evidence, conversations, stats } = data;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">{person.names[0]}</h1>
          </div>
          {person.title && (
            <p className="text-lg text-muted-foreground">{person.title}</p>
          )}
          {person.organization && (
            <p className="text-md text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {person.organization.name}
            </p>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.totalConnections}</p>
              <p className="text-sm text-muted-foreground">Connections</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats.totalEvidence}</p>
              <p className="text-sm text-muted-foreground">Evidence Events</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{stats.totalConversations}</p>
              <p className="text-sm text-muted-foreground">Conversations</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{stats.sources.length}</p>
              <p className="text-sm text-muted-foreground">Data Sources</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Contact Info */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
        <div className="space-y-3">
          {person.emails.length > 0 && (
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                {person.emails.map((email: string, i: number) => (
                  <p key={i} className="text-sm">{email}</p>
                ))}
              </div>
            </div>
          )}
          {person.phones.length > 0 && (
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                {person.phones.map((phone: string, i: number) => (
                  <p key={i} className="text-sm">{phone}</p>
                ))}
              </div>
            </div>
          )}
          {person.socialHandles && (
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex flex-wrap gap-2">
                {Object.entries(person.socialHandles).map(([platform, handle]) => (
                  <Badge key={platform} variant="outline">
                    {platform}: {String(handle)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Tabs for detailed data */}
      <Tabs defaultValue="evidence" className="w-full">
        <TabsList>
          <TabsTrigger value="evidence">Evidence ({stats.totalEvidence})</TabsTrigger>
          <TabsTrigger value="connections">Connections ({stats.totalConnections})</TabsTrigger>
          <TabsTrigger value="conversations">Conversations ({stats.totalConversations})</TabsTrigger>
        </TabsList>

        <TabsContent value="evidence" className="mt-4 space-y-4">
          {evidence.all.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">No evidence events found</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {evidence.all.map((ev: any) => (
                <Card key={ev.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>{ev.type.replace(/_/g, ' ')}</Badge>
                        <Badge variant="outline">{ev.source}</Badge>
                      </div>
                      {ev.metadata && (
                        <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto">
                          {JSON.stringify(ev.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(ev.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="connections" className="mt-4 space-y-4">
          {connections.outgoing.length === 0 && connections.incoming.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">No connections found</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {connections.outgoing.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Outgoing Connections ({connections.outgoing.length})</h3>
                  <div className="space-y-2">
                    {connections.outgoing.map((conn: any) => (
                      <Card key={conn.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{conn.person.names[0]}</p>
                            {conn.person.title && (
                              <p className="text-sm text-muted-foreground">{conn.person.title}</p>
                            )}
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline">{conn.relationshipType.replace(/_/g, ' ')}</Badge>
                              <Badge>Strength: {(conn.strength * 100).toFixed(0)}%</Badge>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>{conn.interactionCount} interactions</p>
                            <p>Last: {new Date(conn.lastSeenAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              {connections.incoming.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Incoming Connections ({connections.incoming.length})</h3>
                  <div className="space-y-2">
                    {connections.incoming.map((conn: any) => (
                      <Card key={conn.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{conn.person.names[0]}</p>
                            {conn.person.title && (
                              <p className="text-sm text-muted-foreground">{conn.person.title}</p>
                            )}
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline">{conn.relationshipType.replace(/_/g, ' ')}</Badge>
                              <Badge>Strength: {(conn.strength * 100).toFixed(0)}%</Badge>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>{conn.interactionCount} interactions</p>
                            <p>Last: {new Date(conn.lastSeenAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="conversations" className="mt-4 space-y-4">
          {conversations.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">No conversations found</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {conversations.map((conv: any) => (
                <Card key={conv.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5" />
                        <Badge variant="outline">{conv.sourceName}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {conv.participants.length} participants
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Updated: {new Date(conv.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {conv.recentMessages.length > 0 && (
                      <div className="bg-muted p-3 rounded space-y-2">
                        <p className="text-xs font-semibold">Recent Messages:</p>
                        {conv.recentMessages.slice(0, 3).map((msg: any) => (
                          <div key={msg.id} className="text-xs">
                            <span className="text-muted-foreground">
                              {new Date(msg.timestamp).toLocaleDateString()}
                            </span>
                            {msg.content && (
                              <p className="mt-1 line-clamp-2">{msg.content}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
