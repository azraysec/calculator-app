'use client';

/**
 * Connections Grid Component
 * Full-featured data grid for browsing connections with filtering and sorting
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PersonDetailView } from '@/components/people/person-detail-view';
import { ArrowUpDown, Search, X, GitBranch, Eye, Filter, ChevronDown, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Connection {
  id: string;
  names: string[];
  emails: string[];
  title: string | null;
  company: string | null;
  sources: string[];
  connectionCount: number;
  interactionCount: number;
  messageCount?: number;
  connectionEvidence?: number;
  totalEvidence?: number;
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
  availableSources: string[];
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

export const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

/** Build URL search params for the connections API */
export function buildConnectionsParams(options: {
  page: number;
  pageSize: number;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  sourceFilter: string;
}): URLSearchParams {
  const params = new URLSearchParams({
    page: options.page.toString(),
    pageSize: options.pageSize.toString(),
  });

  if (options.sorting.length > 0) {
    params.set('sortBy', options.sorting[0].id);
    params.set('sortOrder', options.sorting[0].desc ? 'desc' : 'asc');
  }

  options.columnFilters.forEach((filter) => {
    if (filter.value) {
      params.set(filter.id, filter.value as string);
    }
  });

  if (options.sourceFilter) {
    params.set('source', options.sourceFilter);
  }

  return params;
}

/** Determine the next page param for infinite query pagination */
export function getNextPageParam(lastPage: ConnectionsResponse): number | undefined {
  const { page, totalPages } = lastPage.pagination;
  return page < totalPages ? page + 1 : undefined;
}

/** Get footer text based on current loading/data state */
export function getFooterText(options: {
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  totalCount: number;
  loadedCount: number;
}): string {
  if (options.isFetchingNextPage) return 'Loading more...';
  if (!options.hasNextPage && options.totalCount > 0)
    return `All ${options.totalCount} connections loaded`;
  return `Showing ${options.loadedCount} of ${options.totalCount} connections`;
}

export function ConnectionsGrid({ onFindPath }: ConnectionsGridProps) {
  const [pageSize, setPageSize] = useState(50);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    scrollContainerRef.current?.scrollTo(0, 0);
  }, []);

  const fetchConnectionsPage = async ({ pageParam = 1 }: { pageParam?: number }): Promise<ConnectionsResponse> => {
    const params = buildConnectionsParams({
      page: pageParam,
      pageSize,
      sorting,
      columnFilters,
      sourceFilter,
    });

    const response = await fetch(`/api/connections?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch connections');
    }

    return response.json();
  };

  const {
    data: queryData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['connections', pageSize, sorting, columnFilters, sourceFilter],
    queryFn: fetchConnectionsPage,
    initialPageParam: 1,
    getNextPageParam,
  });

  const allConnections = queryData?.pages.flatMap((p) => p.connections) ?? [];
  const totalCount = queryData?.pages[0]?.pagination.totalCount ?? 0;
  const availableSources = queryData?.pages[0]?.availableSources ?? [];

  // Intersection Observer for infinite scroll — uses scroll container as root
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const scrollContainer = scrollContainerRef.current;
    if (!sentinel || !scrollContainer) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: scrollContainer, rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, scrollContainerRef.current]);

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
      accessorKey: 'messageCount',
      header: ({ column }) => (
        <div className="flex items-center gap-2">
          <span>Messages</span>
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
        <div className="text-center text-sm">
          {row.original.messageCount || 0}
        </div>
      ),
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
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedPersonId(row.original.id)}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
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
    data: allConnections,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

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
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            {totalCount} total connections
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {pageSize} per batch
                <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Batch Size</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {PAGE_SIZE_OPTIONS.map((size) => (
                <DropdownMenuItem
                  key={size}
                  onClick={() => handlePageSizeChange(size)}
                  className={pageSize === size ? 'bg-accent' : ''}
                >
                  {size} per batch
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Column Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
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
        {/* Source Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {sourceFilter || 'All Sources'}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[200px]">
            <DropdownMenuLabel>Filter by Source</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setSourceFilter('')}
              className={!sourceFilter ? 'bg-accent' : ''}
            >
              All Sources
            </DropdownMenuItem>
            {availableSources.map((source) => (
              <DropdownMenuItem
                key={source}
                onClick={() => setSourceFilter(source)}
                className={sourceFilter === source ? 'bg-accent' : ''}
              >
                {source}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Data Table */}
      <Card className="flex flex-col">
        <div
          ref={scrollContainerRef}
          className="relative overflow-auto min-h-[300px]"
          style={{ maxHeight: 'calc(100vh - 320px)' }}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
          )}
          <table className="w-full caption-bottom text-sm">
            <TableHeader className="sticky top-0 z-10 bg-background">
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
          </table>

          {/* Scroll sentinel — inside scroll container */}
          <div ref={sentinelRef} className="flex items-center justify-center py-4">
            {isFetchingNextPage && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading more...
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {getFooterText({
                isFetchingNextPage,
                hasNextPage: hasNextPage ?? false,
                totalCount,
                loadedCount: allConnections.length,
              })}
            </div>
          </div>
          {totalCount > 0 && (
            <Progress value={(allConnections.length / totalCount) * 100} className="h-1" />
          )}
        </div>
      </Card>

      {/* Person Detail Dialog */}
      <Dialog open={selectedPersonId !== null} onOpenChange={(open) => !open && setSelectedPersonId(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Person Details</DialogTitle>
          </DialogHeader>
          {selectedPersonId && (
            <PersonDetailView
              personId={selectedPersonId}
              onClose={() => setSelectedPersonId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
