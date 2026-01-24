'use client';

/**
 * Evidence Viewer Component
 * Displays evidence events for selected path edges
 * Per UI Design Spec Section 4.1
 */

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Clock, Link as LinkIcon, MessageCircle, Mail, Calendar, User } from 'lucide-react';

interface EvidenceEvent {
  id: string;
  type: string;
  timestamp: Date;
  source: string;
  metadata?: Record<string, any>;
}

interface EvidenceViewerProps {
  pathEdges?: Array<{
    fromPersonName: string;
    toPersonName: string;
    evidence: EvidenceEvent[];
  }>;
}

function getEvidenceIcon(type: string) {
  switch (type) {
    case 'linkedin_connection':
      return <LinkIcon className="w-4 h-4" />;
    case 'linkedin_message_sent':
    case 'linkedin_message_received':
      return <MessageCircle className="w-4 h-4" />;
    case 'email_sent':
    case 'email_received':
      return <Mail className="w-4 h-4" />;
    case 'calendar_meeting':
      return <Calendar className="w-4 h-4" />;
    case 'human_confirmed_connection':
      return <User className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

function getEvidenceLabel(type: string): string {
  switch (type) {
    case 'linkedin_connection':
      return 'LinkedIn Connection';
    case 'linkedin_message_sent':
      return 'LinkedIn Message (Sent)';
    case 'linkedin_message_received':
      return 'LinkedIn Message (Received)';
    case 'email_sent':
      return 'Email (Sent)';
    case 'email_received':
      return 'Email (Received)';
    case 'calendar_meeting':
      return 'Calendar Meeting';
    case 'human_confirmed_connection':
      return 'Human Confirmed';
    default:
      return type.replace(/_/g, ' ');
  }
}

function getSourceBadge(source: string) {
  let color = 'bg-gray-500';
  let label = source;

  if (source.startsWith('linkedin')) {
    color = 'bg-blue-500';
    label = 'LinkedIn';
  } else if (source === 'gmail') {
    color = 'bg-red-500';
    label = 'Gmail';
  } else if (source === 'calendar') {
    color = 'bg-green-500';
    label = 'Calendar';
  }

  return (
    <Badge className={`${color} text-white text-xs`}>{label}</Badge>
  );
}

function getConfidenceBadge(source: string) {
  // Simplified confidence logic
  let confidence = 'Medium';
  let color = 'bg-yellow-500';

  if (source.startsWith('linkedin') || source === 'human_confirmed') {
    confidence = 'High';
    color = 'bg-green-500';
  } else if (source === 'manual_note') {
    confidence = 'Low';
    color = 'bg-orange-500';
  }

  return (
    <Badge variant="outline" className={`${color} border-0 text-white text-xs`}>
      {confidence}
    </Badge>
  );
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

function EvidenceCard({ evidence }: { evidence: EvidenceEvent }) {
  return (
    <Card className="p-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="mt-1 text-muted-foreground">
          {getEvidenceIcon(evidence.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">
              {getEvidenceLabel(evidence.type)}
            </span>
            {getSourceBadge(evidence.source)}
            {getConfidenceBadge(evidence.source)}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTimestamp(evidence.timestamp)}
          </div>
          {evidence.metadata && Object.keys(evidence.metadata).length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              {evidence.metadata.connectedOn && (
                <div>Connected: {new Date(evidence.metadata.connectedOn).toLocaleDateString()}</div>
              )}
              {evidence.metadata.company && (
                <div>Company: {evidence.metadata.company}</div>
              )}
              {evidence.metadata.contentLength && (
                <div>Message length: {evidence.metadata.contentLength} chars</div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function EvidenceViewer({ pathEdges }: EvidenceViewerProps) {
  if (!pathEdges || pathEdges.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>Select a path to view evidence details</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pathEdges.map((edge, index) => (
        <div key={index}>
          <div className="mb-3">
            <h3 className="text-sm font-semibold">
              {edge.fromPersonName} → {edge.toPersonName}
            </h3>
            <div className="text-xs text-muted-foreground">
              {edge.evidence.length} evidence event{edge.evidence.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="space-y-2">
            {edge.evidence.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3 border rounded-md">
                No evidence found for this connection
              </p>
            ) : (
              edge.evidence.map((ev) => (
                <EvidenceCard key={ev.id} evidence={ev} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
