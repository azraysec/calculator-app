'use client';

/**
 * Requirements Table Component
 * Displays product backlog with status, priority, dates, sorting, and search
 */

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface Requirement {
  id: string;
  requirement: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Planned' | 'In Progress' | 'In Review' | 'Done' | 'Blocked' | 'On Hold';
  category: string;
  notes?: string;
  dateAdded: string;
  dateStarted?: string;
  dateCompleted?: string;
}

const REQUIREMENTS: Requirement[] = [
  {
    id: 'REQ-001',
    requirement: 'Add changelog tab to UI',
    priority: 'High',
    status: 'Done',
    category: 'Feature',
    notes: 'Display all requirements with status and priority',
    dateAdded: '2026-01-20',
    dateStarted: '2026-01-20',
    dateCompleted: '2026-01-20',
  },
  {
    id: 'REQ-002',
    requirement: 'Support LinkedIn URL input',
    priority: 'High',
    status: 'Done',
    category: 'Feature',
    notes: 'Allow pasting LinkedIn profile URLs to search for people',
    dateAdded: '2026-01-20',
    dateStarted: '2026-01-20',
    dateCompleted: '2026-01-21',
  },
  {
    id: 'REQ-003',
    requirement: 'Parse LinkedIn profile data',
    priority: 'Medium',
    status: 'Done',
    category: 'Feature',
    notes: 'Extract name, title, company from LinkedIn URL',
    dateAdded: '2026-01-21',
    dateStarted: '2026-01-21',
    dateCompleted: '2026-01-21',
  },
  {
    id: 'REQ-004',
    requirement: 'Show all my connections in current graph/DB',
    priority: 'High',
    status: 'Done',
    category: 'Feature',
    notes: 'Display network overview with all people, connections, and statistics',
    dateAdded: '2026-01-21',
    dateStarted: '2026-01-21',
    dateCompleted: '2026-01-21',
  },
  {
    id: 'REQ-005',
    requirement: 'Add version number, build, timestamp at top of screen',
    priority: 'Medium',
    status: 'Done',
    category: 'Feature',
    notes: 'Shows app version, git commit hash, and build time in header',
    dateAdded: '2026-01-21',
    dateStarted: '2026-01-21',
    dateCompleted: '2026-01-21',
  },
  {
    id: 'REQ-006',
    requirement: 'LinkedIn URL search with connector integration',
    priority: 'High',
    status: 'Done',
    category: 'Feature',
    notes: 'Fetches LinkedIn profiles via API when not in network. Requires LINKEDIN_ACCESS_TOKEN env var',
    dateAdded: '2026-01-22',
    dateStarted: '2026-01-22',
    dateCompleted: '2026-01-22',
  },
  {
    id: 'REQ-007',
    requirement: 'Show nearest name matches for unknown people',
    priority: 'Medium',
    status: 'Done',
    category: 'Feature',
    notes: 'Fuzzy string matching with Levenshtein distance. Shows "Did you mean..." suggestions',
    dateAdded: '2026-01-22',
    dateStarted: '2026-01-22',
    dateCompleted: '2026-01-22',
  },
  {
    id: 'REQ-008',
    requirement: 'LinkedIn archive upload and parsing',
    priority: 'Critical',
    status: 'Done',
    category: 'Feature',
    notes: 'Upload LinkedIn ZIP archives, parse Connections.csv and messages.csv, create evidence events',
    dateAdded: '2026-01-23',
    dateStarted: '2026-01-24',
    dateCompleted: '2026-01-24',
  },
  {
    id: 'REQ-009',
    requirement: 'Data Sources page implementation',
    priority: 'Critical',
    status: 'Done',
    category: 'Feature',
    notes: 'Manage data source connections, view sync status, upload archives. Full E2E test coverage.',
    dateAdded: '2026-01-23',
    dateStarted: '2026-01-24',
    dateCompleted: '2026-01-24',
  },
  {
    id: 'REQ-010',
    requirement: 'Evidence-based relationship tracking',
    priority: 'High',
    status: 'Done',
    category: 'Infrastructure',
    notes: 'EvidenceEvent model, Conversation and Message tracking, audit trail for all evidence',
    dateAdded: '2026-01-24',
    dateStarted: '2026-01-24',
    dateCompleted: '2026-01-24',
  },
  {
    id: 'REQ-011',
    requirement: 'Job-based ingestion pipeline',
    priority: 'High',
    status: 'Done',
    category: 'Infrastructure',
    notes: 'Async processing with IngestJob tracking, progress reporting, error handling',
    dateAdded: '2026-01-24',
    dateStarted: '2026-01-24',
    dateCompleted: '2026-01-24',
  },
  {
    id: 'REQ-012',
    requirement: 'LinkedIn relationship strength scoring',
    priority: 'High',
    status: 'Done',
    category: 'Feature',
    notes: 'Score edges using LinkedIn signals: connection age, message recency, frequency, reciprocity',
    dateAdded: '2026-01-24',
    dateStarted: '2026-01-24',
    dateCompleted: '2026-01-24',
  },
  {
    id: 'REQ-013',
    requirement: 'Evidence viewer in Details panel',
    priority: 'Medium',
    status: 'Done',
    category: 'Feature',
    notes: 'Show evidence cards grouped by path edge with source badges and confidence indicators',
    dateAdded: '2026-01-24',
    dateStarted: '2026-01-24',
    dateCompleted: '2026-01-24',
  },
  {
    id: 'REQ-014',
    requirement: 'Review Queue for identity resolution',
    priority: 'High',
    status: 'Planned',
    category: 'Feature',
    notes: 'Manual review and approval of suggested person merges with side-by-side comparison',
    dateAdded: '2026-01-24',
  },
  {
    id: 'REQ-015',
    requirement: 'Comprehensive test coverage',
    priority: 'Critical',
    status: 'Done',
    category: 'Quality',
    notes: '29 E2E tests passing, 10 unit tests for parser. All Phase 3 features tested.',
    dateAdded: '2026-01-24',
    dateStarted: '2026-01-24',
    dateCompleted: '2026-01-24',
  },
  {
    id: 'TASK-016',
    requirement: 'Fix TypeScript strict mode errors for Vercel deployment',
    priority: 'Critical',
    status: 'Done',
    category: 'Bug Fix',
    notes: 'Fixed scoring module structure, removed unused imports, fixed unused parameters',
    dateAdded: '2026-01-24',
    dateStarted: '2026-01-24',
    dateCompleted: '2026-01-24',
  },
  {
    id: 'TASK-017',
    requirement: 'Integrate Data Sources back into main page',
    priority: 'High',
    status: 'Done',
    category: 'Enhancement',
    notes: 'Moved from separate /data-sources page to tab in main interface. Updated navigation and tests.',
    dateAdded: '2026-01-24',
    dateStarted: '2026-01-24',
    dateCompleted: '2026-01-24',
  },
  {
    id: 'TASK-018',
    requirement: 'Implement Vercel Blob Storage for file uploads',
    priority: 'Critical',
    status: 'Done',
    category: 'Infrastructure',
    notes: 'Replaced local filesystem with Vercel Blob Storage. LinkedIn archives now work in serverless environment.',
    dateAdded: '2026-01-24',
    dateStarted: '2026-01-24',
    dateCompleted: '2026-01-24',
  },
  {
    id: 'TASK-019',
    requirement: 'Enhanced changelog with sorting, search, and dates',
    priority: 'Medium',
    status: 'Done',
    category: 'Enhancement',
    notes: 'Added date tracking, sortable columns, search functionality. Auto-track all development tasks.',
    dateAdded: '2026-01-24',
    dateStarted: '2026-01-24',
    dateCompleted: '2026-01-24',
  },
  {
    id: 'TASK-020',
    requirement: 'LinkedIn upload progress bar and activity logs',
    priority: 'High',
    status: 'Done',
    category: 'Enhancement',
    notes: 'Real-time progress tracking, timestamped activity logs, job status polling, detailed error messages. Radix UI Progress and ScrollArea components.',
    dateAdded: '2026-01-24',
    dateStarted: '2026-01-24',
    dateCompleted: '2026-01-24',
  },
  {
    id: 'BUG-021',
    requirement: 'Fix LinkedIn upload timeout in serverless environment',
    priority: 'Critical',
    status: 'Done',
    category: 'Bug Fix',
    notes: 'Moved LinkedIn archive processing to Inngest background worker. Serverless functions timeout at 60s, but large archives take 20+ min. Now processes in background with no timeout limits.',
    dateAdded: '2026-01-24',
    dateStarted: '2026-01-24',
    dateCompleted: '2026-01-24',
  },
  {
    id: 'BUG-022',
    requirement: 'Fix Inngest event sending - missing eventKey configuration',
    priority: 'Critical',
    status: 'Done',
    category: 'Bug Fix',
    notes: 'inngest.send() was failing with "Failed to start processing". Inngest client needs eventKey configured to send events. Added process.env.INNGEST_EVENT_KEY to client constructor.',
    dateAdded: '2026-01-24 20:52:00',
    dateStarted: '2026-01-24 20:52:00',
    dateCompleted: '2026-01-24 20:58:00',
  },
  {
    id: 'BUG-023',
    requirement: 'Fix LinkedIn messages not processing (zero messages bug)',
    priority: 'Critical',
    status: 'Done',
    category: 'Bug Fix',
    notes: 'findFile() method used endsWith() which matched guide_messages.csv (113 bytes, empty) instead of messages.csv (4MB, full of data). Fixed to use exact filename matching with path support. Added 15 unit tests to prevent regression.',
    dateAdded: '2026-01-29',
    dateStarted: '2026-01-29',
    dateCompleted: '2026-01-29',
  },
  {
    id: 'BUG-024',
    requirement: 'Fix duplicate persons created on LinkedIn re-upload',
    priority: 'Critical',
    status: 'Done',
    category: 'Bug Fix',
    notes: 'upsertPerson() only searched by email, but 97% of connections had no email. Each re-upload created ~4,200 duplicate persons (8,491 total from 3 uploads). Fixed to search by name when no email, and update emails when person found by name. Added comprehensive unit tests.',
    dateAdded: '2026-01-29',
    dateStarted: '2026-01-29',
    dateCompleted: '2026-01-29',
  },
  {
    id: 'TASK-024',
    requirement: 'Clean up existing 8,491 duplicate persons from database',
    priority: 'High',
    status: 'Done',
    category: 'Infrastructure',
    notes: 'Created cleanup scripts to remove duplicate persons while preserving data integrity. Used CASCADE delete strategy where foreign keys automatically delete related edges. Successfully cleaned up 8,491 duplicate person records.',
    dateAdded: '2026-01-29',
    dateStarted: '2026-01-29',
    dateCompleted: '2026-01-29',
  },
  {
    id: 'REQ-024',
    requirement: 'Connections browser with filtering and sorting',
    priority: 'Medium',
    status: 'Done',
    category: 'Feature',
    notes: 'Built full data grid using TanStack Table with server-side pagination, filtering by name/email/title/company, sortable columns, and connection/interaction counts. Added new "Connections" tab in main interface.',
    dateAdded: '2026-01-29',
    dateStarted: '2026-01-29',
    dateCompleted: '2026-01-29',
  },
  {
    id: 'REQ-025',
    requirement: 'Upload history with new vs existing breakdown',
    priority: 'Medium',
    status: 'Done',
    category: 'Feature',
    notes: 'Shows detailed breakdown of each LinkedIn archive upload: connections (total, new, existing), messages (total, new, existing), and aggregate statistics across all uploads. Tracks new vs existing records in ingest job metadata.',
    dateAdded: '2026-01-29',
    dateStarted: '2026-01-29',
    dateCompleted: '2026-01-29',
  },
  {
    id: 'TASK-025',
    requirement: 'Steve CEO Manager workflow system',
    priority: 'High',
    status: 'Done',
    category: 'Infrastructure',
    notes: 'Created Steve as single point of contact for all development work. Implements 6-step workflow: check requirements, load procedure, execute, quality gate, version/changelog, deploy/report. Systematic and procedure-based approach for all requests.',
    dateAdded: '2026-01-29',
    dateStarted: '2026-01-29',
    dateCompleted: '2026-01-29',
  },
  {
    id: 'TASK-026',
    requirement: 'Procedure-based system for all request types',
    priority: 'High',
    status: 'Done',
    category: 'Infrastructure',
    notes: 'Created 7 procedures: MASTER-PROCEDURE (universal workflow), bug-fix, new-feature, database-migration, deployment-fix, investigation, performance-optimization. Each includes agent assignments, quality checks, and deployment steps. Ensures systematic execution of all work.',
    dateAdded: '2026-01-29',
    dateStarted: '2026-01-29',
    dateCompleted: '2026-01-29',
  },
  {
    id: 'TASK-027',
    requirement: 'Requirements tracking system with YAML',
    priority: 'High',
    status: 'Done',
    category: 'Infrastructure',
    notes: 'Created .claude/requirements.yaml to track all requirements with planning, design, spec, implementation, bugs, and deployment status. Steve checks this file first on every request. Later replaced with GitHub Issues for easier user management.',
    dateAdded: '2026-01-29',
    dateStarted: '2026-01-29',
    dateCompleted: '2026-01-29',
  },
  {
    id: 'TASK-028',
    requirement: 'Add version management and changelog updates to all procedures',
    priority: 'High',
    status: 'Done',
    category: 'Enhancement',
    notes: 'Steve now automatically bumps version (patch/minor/major based on change type), adds changelog entries, and reports version number in all completion messages. Set up GitHub Issues as primary requirement tracker with priority labels (P0-Critical through P3-Low). Created github-issues-management.md procedure.',
    dateAdded: '2026-01-30',
    dateStarted: '2026-01-30',
    dateCompleted: '2026-01-30',
  },
  {
    id: 'BUG-029',
    requirement: 'Fix pathfinding not working after finding a contact (P0-Critical)',
    priority: 'Critical',
    status: 'Done',
    category: 'Bug Fix',
    notes: 'Root cause: currentUserId was hardcoded to "me" (not a valid UUID), causing API to fail. Created /api/me endpoint that returns current user\'s person record (identified by metadata.isMe = true). Updated frontend to fetch current user from /api/me before running pathfinding queries. Pathfinding now works correctly.',
    dateAdded: '2026-01-30',
    dateStarted: '2026-01-30',
    dateCompleted: '2026-01-30',
  },
  {
    id: 'REQ-030',
    requirement: 'Click-to-graph from connections browser',
    priority: 'High',
    status: 'Done',
    category: 'Feature',
    notes: 'Added "Find Path" button to each row in connections grid. Clicking opens Intro Finder tab with that person as target, showing graph visualization with all paths and relationship strength. Seamless integration between browsing contacts and finding intro paths. Controlled tabs with programmatic switching.',
    dateAdded: '2026-01-30',
    dateStarted: '2026-01-30',
    dateCompleted: '2026-01-30',
  },
];

type SortField = keyof Requirement;
type SortDirection = 'asc' | 'desc';

function getPriorityColor(priority: Requirement['priority']) {
  switch (priority) {
    case 'Critical':
      return 'bg-red-500 text-white';
    case 'High':
      return 'bg-orange-500 text-white';
    case 'Medium':
      return 'bg-yellow-500 text-black';
    case 'Low':
      return 'bg-gray-400 text-white';
  }
}

function getStatusColor(status: Requirement['status']) {
  switch (status) {
    case 'Done':
      return 'bg-green-500 text-white';
    case 'In Progress':
      return 'bg-blue-500 text-white';
    case 'In Review':
      return 'bg-purple-500 text-white';
    case 'Planned':
      return 'bg-gray-500 text-white';
    case 'Blocked':
      return 'bg-red-600 text-white';
    case 'On Hold':
      return 'bg-gray-600 text-white';
  }
}

export function RequirementsTable() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedRequirements = useMemo(() => {
    // Filter by search query
    let filtered = REQUIREMENTS.filter((req) => {
      const query = searchQuery.toLowerCase();
      return (
        req.id.toLowerCase().includes(query) ||
        req.requirement.toLowerCase().includes(query) ||
        req.category.toLowerCase().includes(query) ||
        req.notes?.toLowerCase().includes(query) ||
        req.status.toLowerCase().includes(query) ||
        req.priority.toLowerCase().includes(query)
      );
    });

    // Sort by selected field
    filtered.sort((a, b) => {
      const aValue = a[sortField] || '';
      const bValue = b[sortField] || '';

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [searchQuery, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-50" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 inline ml-1" />
    );
  };

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2">Development Changelog</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Feature requests, improvements, bug fixes, and all development tasks tracked for WIG
        </p>

        {/* Search Box */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by ID, requirement, category, status, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {searchQuery && (
          <div className="mt-2 text-sm text-muted-foreground">
            Showing {filteredAndSortedRequirements.length} of {REQUIREMENTS.length} items
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2">
              <th
                className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('id')}
              >
                ID <SortIcon field="id" />
              </th>
              <th
                className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('requirement')}
              >
                Requirement <SortIcon field="requirement" />
              </th>
              <th
                className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('priority')}
              >
                Priority <SortIcon field="priority" />
              </th>
              <th
                className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('status')}
              >
                Status <SortIcon field="status" />
              </th>
              <th
                className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('category')}
              >
                Category <SortIcon field="category" />
              </th>
              <th
                className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('dateAdded')}
              >
                Date Added <SortIcon field="dateAdded" />
              </th>
              <th
                className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('dateStarted')}
              >
                Date Started <SortIcon field="dateStarted" />
              </th>
              <th
                className="text-left p-3 font-semibold cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('dateCompleted')}
              >
                Date Completed <SortIcon field="dateCompleted" />
              </th>
              <th className="text-left p-3 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRequirements.map((req) => (
              <tr key={req.id} className="border-b hover:bg-muted/50">
                <td className="p-3 font-mono text-sm">{req.id}</td>
                <td className="p-3">{req.requirement}</td>
                <td className="p-3">
                  <Badge className={getPriorityColor(req.priority)}>
                    {req.priority}
                  </Badge>
                </td>
                <td className="p-3">
                  <Badge className={getStatusColor(req.status)}>
                    {req.status}
                  </Badge>
                </td>
                <td className="p-3">
                  <span className="text-sm text-muted-foreground">
                    {req.category}
                  </span>
                </td>
                <td className="p-3 text-sm">{req.dateAdded}</td>
                <td className="p-3 text-sm">{req.dateStarted || '-'}</td>
                <td className="p-3 text-sm">{req.dateCompleted || '-'}</td>
                <td className="p-3 text-sm text-muted-foreground max-w-md">
                  {req.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 pt-6 border-t">
        <h3 className="font-semibold mb-2">Status Definitions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <div>
            <Badge className="bg-gray-500 text-white mr-2">Planned</Badge>
            <span className="text-muted-foreground">Not started</span>
          </div>
          <div>
            <Badge className="bg-blue-500 text-white mr-2">In Progress</Badge>
            <span className="text-muted-foreground">Currently implementing</span>
          </div>
          <div>
            <Badge className="bg-purple-500 text-white mr-2">In Review</Badge>
            <span className="text-muted-foreground">Under review</span>
          </div>
          <div>
            <Badge className="bg-green-500 text-white mr-2">Done</Badge>
            <span className="text-muted-foreground">Shipped to production</span>
          </div>
          <div>
            <Badge className="bg-red-600 text-white mr-2">Blocked</Badge>
            <span className="text-muted-foreground">Cannot proceed</span>
          </div>
          <div>
            <Badge className="bg-gray-600 text-white mr-2">On Hold</Badge>
            <span className="text-muted-foreground">Deprioritized</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
