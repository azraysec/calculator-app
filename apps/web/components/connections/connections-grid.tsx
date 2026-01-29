'use client';

/**
 * Connections Grid Component
 * Full-featured data grid for browsing connections with filtering and sorting
 */

import { useEffect, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, ChevronLeft, ChevronRight, Search, X, GitBranch } from 'lucide-react';

interface Connection {
  id: string;
  names: string[];
  emails: string[];
  title: string | null;
  company: string | null;
  sources: string[];
  connectionCount: number;
  interactionCount: number;
  createdAt: string;
  updatedAt: string;
  metadata: any;
}

interface ConnectionsResponse {
  connections: Connection[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

interface Person {
  id: string;
  names: string[];
  emails: string[];
  title?: string;
  organization?: {
    name: string;
  };
}

interface ConnectionsGridProps {
  onFindPath?: (person: Person) => void;
}

export function ConnectionsGrid({ onFindPath }: ConnectionsGridProps) {
  const [data, setData] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    totalCount: 0,
    totalPages: 0,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Column definitions
  const columns: ColumnDef<Connection>[] = [
    {
      accessorKey: 'names',
      header: ({ column }) => (
        <div className="flex items-center gap-2">
          <span>Name</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <ArrowUpDown className="h-3 w-3" />
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.original.names[0] || 'Unknown'}</div>
      ),
      filterFn: (row, _id, value) => {
        return row.original.names.some((name) =>
          name.toLowerCase().includes(value.toLowerCase())
        );
      },
    },
    {
      accessorKey: 'emails',
      header: ({ column }) => (
        <div className="flex items-center gap-2">
          <span>Email</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <ArrowUpDown className="h-3 w-3" />
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {row.original.emails[0] || '-'}
        </div>
      ),
      filterFn: (row, _id, value) => {
        return row.original.emails.some((email) =>
          email.toLowerCase().includes(value.toLowerCase())
        );
      },
    },
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <div className="flex items-center gap-2">
          <span>Title</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <ArrowUpDown className="h-3 w-3" />
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-sm">{row.original.title || '-'}</div>
      ),
    },
    {
      accessorKey: 'company',
      header: ({ column }) => (
        <div className="flex items-center gap-2">
          <span>Company</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <ArrowUpDown className="h-3 w-3" />
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-sm">{row.original.company || '-'}</div>
      ),
    },
    {
      accessorKey: 'sources',
      header: 'Sources',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.sources.map((source) => (
            <Badge key={source} variant="outline" className="text-xs">
              {source}
            </Badge>
          ))}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'connectionCount',
      header: ({ column }) => (
        <div className="flex items-center gap-2">
          <span>Connections</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <ArrowUpDown className="h-3 w-3" />
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-center text-sm">{row.original.connectionCount}</div>
      ),
    },
    {
      accessorKey: 'interactionCount',
      header: ({ column }) => (
        <div className="flex items-center gap-2">
          <span>Interactions</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <ArrowUpDown className="h-3 w-3" />
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-center text-sm">{row.original.interactionCount}</div>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onFindPath) {
                const person: Person = {
                  id: row.original.id,
                  names: row.original.names,
                  emails: row.original.emails,
                  title: row.original.title || undefined,
                  organization: row.original.company ? { name: row.original.company } : undefined,
                };
                onFindPath(person);
              }
            }}
          >
            <GitBranch className="h-4 w-4 mr-1" />
            Find Path
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  // Fetch data
  const fetchConnections = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      // Add sorting
      if (sorting.length > 0) {
        params.set('sortBy', sorting[0].id);
        params.set('sortOrder', sorting[0].desc ? 'desc' : 'asc');
      }

      // Add column filters
      columnFilters.forEach((filter) => {
        if (filter.value) {
          params.set(filter.id, filter.value as string);
        }
      });

      const response = await fetch(`/api/connections?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch connections');
      }

      const result: ConnectionsResponse = await response.json();
      setData(result.connections);
      setPagination(result.pagination);
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.pageSize, sorting, columnFilters]);

  return (
    <div className="space-y-4">
      {/* Global Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search all columns..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
          {globalFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
              onClick={() => setGlobalFilter('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {pagination.totalCount} total connections
        </div>
      </div>

      {/* Column Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Input
          placeholder="Filter by name..."
          value={(table.getColumn('names')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('names')?.setFilterValue(e.target.value)}
        />
        <Input
          placeholder="Filter by email..."
          value={(table.getColumn('emails')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('emails')?.setFilterValue(e.target.value)}
        />
        <Input
          placeholder="Filter by title..."
          value={(table.getColumn('title')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('title')?.setFilterValue(e.target.value)}
        />
        <Input
          placeholder="Filter by company..."
          value={(table.getColumn('company')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('company')?.setFilterValue(e.target.value)}
        />
      </div>

      {/* Data Table */}
      <Card>
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
          )}
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(
              pagination.page * pagination.pageSize,
              pagination.totalCount
            )}{' '}
            of {pagination.totalCount} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              <span className="text-sm">
                Page {pagination.page} of {pagination.totalPages}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              disabled={pagination.page === pagination.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
