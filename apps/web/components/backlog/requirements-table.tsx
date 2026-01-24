'use client';

/**
 * Requirements Table Component
 * Displays product backlog with status and priority
 */

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface Requirement {
  id: string;
  requirement: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Planned' | 'In Progress' | 'In Review' | 'Done' | 'Blocked' | 'On Hold';
  category: string;
  notes?: string;
}

const REQUIREMENTS: Requirement[] = [
  {
    id: 'REQ-001',
    requirement: 'Add changelog tab to UI',
    priority: 'High',
    status: 'Done',
    category: 'Feature',
    notes: 'Display all requirements with status and priority',
  },
  {
    id: 'REQ-002',
    requirement: 'Support LinkedIn URL input',
    priority: 'High',
    status: 'Done',
    category: 'Feature',
    notes: 'Allow pasting LinkedIn profile URLs to search for people',
  },
  {
    id: 'REQ-003',
    requirement: 'Parse LinkedIn profile data',
    priority: 'Medium',
    status: 'Done',
    category: 'Feature',
    notes: 'Extract name, title, company from LinkedIn URL',
  },
  {
    id: 'REQ-004',
    requirement: 'Show all my connections in current graph/DB',
    priority: 'High',
    status: 'Done',
    category: 'Feature',
    notes: 'Display network overview with all people, connections, and statistics',
  },
  {
    id: 'REQ-005',
    requirement: 'Add version number, build, timestamp at top of screen',
    priority: 'Medium',
    status: 'Done',
    category: 'Feature',
    notes: 'Shows app version, git commit hash, and build time in header',
  },
  {
    id: 'REQ-006',
    requirement: 'LinkedIn URL search with connector integration',
    priority: 'High',
    status: 'Done',
    category: 'Feature',
    notes: 'Fetches LinkedIn profiles via API when not in network. Requires LINKEDIN_ACCESS_TOKEN env var',
  },
  {
    id: 'REQ-007',
    requirement: 'Show nearest name matches for unknown people',
    priority: 'Medium',
    status: 'Done',
    category: 'Feature',
    notes: 'Fuzzy string matching with Levenshtein distance. Shows "Did you mean..." suggestions',
  },
];

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
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2">Product Backlog</h2>
        <p className="text-sm text-muted-foreground">
          Feature requests, improvements, and requirements tracked for WIG
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2">
              <th className="text-left p-3 font-semibold">ID</th>
              <th className="text-left p-3 font-semibold">Requirement</th>
              <th className="text-left p-3 font-semibold">Priority</th>
              <th className="text-left p-3 font-semibold">Status</th>
              <th className="text-left p-3 font-semibold">Category</th>
              <th className="text-left p-3 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {REQUIREMENTS.map((req) => (
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
