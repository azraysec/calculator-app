'use client';

/**
 * LinkedIn Upload History Component
 * Displays history of all LinkedIn archive uploads with statistics
 */

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UploadHistoryItem {
  id: string;
  status: string;
  uploadedAt: string;
  completedAt: string | null;
  duration: string | null;
  fileName: string;
  fileSize: string;
  stats: {
    connectionsProcessed: number;
    newConnectionsAdded: number;
    existingConnectionsUpdated: number;
    messagesProcessed: number;
    newMessagesAdded: number;
    newPersonsAdded: number;
    evidenceEventsCreated: number;
    edgesRescored: number;
  };
  errors: string[];
  error: string | null;
}

interface UploadHistory {
  history: UploadHistoryItem[];
  aggregate: {
    totalUploads: number;
    successful: number;
    failed: number;
    totalConnections: number;
    totalMessages: number;
    totalNewPersons: number;
  };
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return (
        <Badge className="bg-green-500 text-white">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      );
    case 'failed':
      return (
        <Badge className="bg-red-500 text-white">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>
      );
    case 'running':
      return (
        <Badge className="bg-blue-500 text-white">
          <Clock className="w-3 h-3 mr-1 animate-spin" />
          Running
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          {status}
        </Badge>
      );
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function LinkedInUploadHistory() {
  const [history, setHistory] = useState<UploadHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/linkedin/archive/history');
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const data = await response.json();
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Loading history...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-destructive">Error: {error}</div>
      </Card>
    );
  }

  if (!history || history.history.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          No upload history yet. Upload your first LinkedIn archive to get started.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Aggregate Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Uploads</div>
          <div className="text-2xl font-bold">{history.aggregate.totalUploads}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Successful</div>
          <div className="text-2xl font-bold text-green-600">{history.aggregate.successful}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Failed</div>
          <div className="text-2xl font-bold text-red-600">{history.aggregate.failed}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Connections</div>
          <div className="text-2xl font-bold">{history.aggregate.totalConnections.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Messages</div>
          <div className="text-2xl font-bold">{history.aggregate.totalMessages.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">New People</div>
          <div className="text-2xl font-bold">{history.aggregate.totalNewPersons.toLocaleString()}</div>
        </Card>
      </div>

      {/* Upload History List */}
      <Card>
        <div className="p-4 border-b">
          <h3 className="font-semibold">Upload History</h3>
        </div>
        <ScrollArea className="h-[500px]">
          <div className="divide-y">
            {history.history.map((item) => (
              <div key={item.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(item.status)}
                      <span className="text-sm font-medium">{item.fileName}</span>
                      <span className="text-xs text-muted-foreground">({item.fileSize})</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(item.uploadedAt)}
                      {item.duration && <span className="ml-2">• {item.duration}</span>}
                    </div>
                  </div>
                </div>

                {item.status === 'completed' && (
                  <div className="space-y-3 mt-3">
                    {/* Connections Breakdown */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Connections Total</div>
                        <div className="text-sm font-semibold">{item.stats.connectionsProcessed.toLocaleString()}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs text-muted-foreground">New</div>
                          <div className="text-sm font-semibold text-green-600">
                            +{item.stats.newConnectionsAdded.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Existing</div>
                          <div className="text-sm font-semibold text-blue-600">
                            {item.stats.existingConnectionsUpdated.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Messages Breakdown */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Messages Total</div>
                        <div className="text-sm font-semibold">{item.stats.messagesProcessed.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">New Evidence</div>
                        <div className="text-sm font-semibold text-green-600">
                          +{item.stats.newMessagesAdded.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Other Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">New People</div>
                        <div className="text-sm font-semibold text-green-600">
                          +{item.stats.newPersonsAdded.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Evidence Events</div>
                        <div className="text-sm font-semibold">{item.stats.evidenceEventsCreated.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Edges Scored</div>
                        <div className="text-sm font-semibold">{item.stats.edgesRescored.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                )}

                {item.errors.length > 0 && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <div className="flex items-center gap-1 text-yellow-800 font-medium mb-1">
                      <AlertCircle className="w-3 h-3" />
                      {item.errors.length} Warning{item.errors.length > 1 ? 's' : ''}
                    </div>
                    <ul className="text-yellow-700 space-y-0.5">
                      {item.errors.slice(0, 3).map((err, idx) => (
                        <li key={idx}>• {err}</li>
                      ))}
                      {item.errors.length > 3 && (
                        <li>• ...and {item.errors.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                )}

                {item.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    <div className="font-medium">Error:</div>
                    {item.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
