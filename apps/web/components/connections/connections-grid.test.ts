/**
 * Connections Grid - Infinite Scroll Tests
 *
 * Tests the extracted logic functions for the infinite scroll implementation:
 * - URL param construction for the connections API
 * - Pagination getNextPageParam logic
 * - Footer text state machine
 * - Page size options validation
 */

import { describe, it, expect } from 'vitest';
import {
  buildConnectionsParams,
  getNextPageParam,
  getFooterText,
  PAGE_SIZE_OPTIONS,
} from './connections-grid';

// ---------------------------------------------------------------------------
// buildConnectionsParams
// ---------------------------------------------------------------------------
describe('buildConnectionsParams', () => {
  it('should include page and pageSize as required params', () => {
    const params = buildConnectionsParams({
      page: 1,
      pageSize: 50,
      sorting: [],
      columnFilters: [],
      sourceFilter: '',
    });

    expect(params.get('page')).toBe('1');
    expect(params.get('pageSize')).toBe('50');
  });

  it('should handle different page numbers', () => {
    const params = buildConnectionsParams({
      page: 5,
      pageSize: 100,
      sorting: [],
      columnFilters: [],
      sourceFilter: '',
    });

    expect(params.get('page')).toBe('5');
    expect(params.get('pageSize')).toBe('100');
  });

  it('should add sortBy and sortOrder when sorting is provided (asc)', () => {
    const params = buildConnectionsParams({
      page: 1,
      pageSize: 50,
      sorting: [{ id: 'names', desc: false }],
      columnFilters: [],
      sourceFilter: '',
    });

    expect(params.get('sortBy')).toBe('names');
    expect(params.get('sortOrder')).toBe('asc');
  });

  it('should add sortBy and sortOrder when sorting is provided (desc)', () => {
    const params = buildConnectionsParams({
      page: 1,
      pageSize: 50,
      sorting: [{ id: 'connectionCount', desc: true }],
      columnFilters: [],
      sourceFilter: '',
    });

    expect(params.get('sortBy')).toBe('connectionCount');
    expect(params.get('sortOrder')).toBe('desc');
  });

  it('should only use the first sorting entry (primary sort)', () => {
    const params = buildConnectionsParams({
      page: 1,
      pageSize: 50,
      sorting: [
        { id: 'names', desc: false },
        { id: 'company', desc: true },
      ],
      columnFilters: [],
      sourceFilter: '',
    });

    expect(params.get('sortBy')).toBe('names');
    expect(params.get('sortOrder')).toBe('asc');
  });

  it('should not include sort params when sorting is empty', () => {
    const params = buildConnectionsParams({
      page: 1,
      pageSize: 50,
      sorting: [],
      columnFilters: [],
      sourceFilter: '',
    });

    expect(params.has('sortBy')).toBe(false);
    expect(params.has('sortOrder')).toBe(false);
  });

  it('should add column filters with non-empty values', () => {
    const params = buildConnectionsParams({
      page: 1,
      pageSize: 50,
      sorting: [],
      columnFilters: [
        { id: 'names', value: 'john' },
        { id: 'company', value: 'acme' },
      ],
      sourceFilter: '',
    });

    expect(params.get('names')).toBe('john');
    expect(params.get('company')).toBe('acme');
  });

  it('should skip column filters with empty/falsy values', () => {
    const params = buildConnectionsParams({
      page: 1,
      pageSize: 50,
      sorting: [],
      columnFilters: [
        { id: 'names', value: '' },
        { id: 'company', value: null },
        { id: 'title', value: undefined },
      ],
      sourceFilter: '',
    });

    expect(params.has('names')).toBe(false);
    expect(params.has('company')).toBe(false);
    expect(params.has('title')).toBe(false);
  });

  it('should add source filter when provided', () => {
    const params = buildConnectionsParams({
      page: 1,
      pageSize: 50,
      sorting: [],
      columnFilters: [],
      sourceFilter: 'linkedin',
    });

    expect(params.get('source')).toBe('linkedin');
  });

  it('should not add source param when sourceFilter is empty', () => {
    const params = buildConnectionsParams({
      page: 1,
      pageSize: 50,
      sorting: [],
      columnFilters: [],
      sourceFilter: '',
    });

    expect(params.has('source')).toBe(false);
  });

  it('should combine all params correctly', () => {
    const params = buildConnectionsParams({
      page: 3,
      pageSize: 100,
      sorting: [{ id: 'connectionCount', desc: true }],
      columnFilters: [{ id: 'company', value: 'google' }],
      sourceFilter: 'gmail',
    });

    expect(params.get('page')).toBe('3');
    expect(params.get('pageSize')).toBe('100');
    expect(params.get('sortBy')).toBe('connectionCount');
    expect(params.get('sortOrder')).toBe('desc');
    expect(params.get('company')).toBe('google');
    expect(params.get('source')).toBe('gmail');
  });

  it('should produce a valid URL query string', () => {
    const params = buildConnectionsParams({
      page: 1,
      pageSize: 25,
      sorting: [],
      columnFilters: [],
      sourceFilter: '',
    });

    const url = `/api/connections?${params.toString()}`;
    expect(url).toContain('page=1');
    expect(url).toContain('pageSize=25');
  });
});

// ---------------------------------------------------------------------------
// getNextPageParam
// ---------------------------------------------------------------------------
describe('getNextPageParam', () => {
  it('should return next page number when more pages exist', () => {
    const result = getNextPageParam({
      connections: [],
      pagination: { page: 1, pageSize: 50, totalCount: 200, totalPages: 4 },
      availableSources: [],
    });

    expect(result).toBe(2);
  });

  it('should return undefined on the last page', () => {
    const result = getNextPageParam({
      connections: [],
      pagination: { page: 4, pageSize: 50, totalCount: 200, totalPages: 4 },
      availableSources: [],
    });

    expect(result).toBeUndefined();
  });

  it('should return undefined when there is only one page', () => {
    const result = getNextPageParam({
      connections: [],
      pagination: { page: 1, pageSize: 50, totalCount: 30, totalPages: 1 },
      availableSources: [],
    });

    expect(result).toBeUndefined();
  });

  it('should return undefined when totalPages is 0 (empty dataset)', () => {
    const result = getNextPageParam({
      connections: [],
      pagination: { page: 1, pageSize: 50, totalCount: 0, totalPages: 0 },
      availableSources: [],
    });

    expect(result).toBeUndefined();
  });

  it('should return the correct next page for middle pages', () => {
    const result = getNextPageParam({
      connections: [],
      pagination: { page: 3, pageSize: 25, totalCount: 150, totalPages: 6 },
      availableSources: [],
    });

    expect(result).toBe(4);
  });

  it('should handle page equal to totalPages exactly', () => {
    const result = getNextPageParam({
      connections: [],
      pagination: { page: 10, pageSize: 10, totalCount: 100, totalPages: 10 },
      availableSources: [],
    });

    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getFooterText
// ---------------------------------------------------------------------------
describe('getFooterText', () => {
  it('should show "Loading more..." when fetching next page', () => {
    const text = getFooterText({
      isFetchingNextPage: true,
      hasNextPage: true,
      totalCount: 200,
      loadedCount: 50,
    });

    expect(text).toBe('Loading more...');
  });

  it('should prioritize "Loading more..." over other states', () => {
    // Even if hasNextPage is false, loading takes priority
    const text = getFooterText({
      isFetchingNextPage: true,
      hasNextPage: false,
      totalCount: 200,
      loadedCount: 200,
    });

    expect(text).toBe('Loading more...');
  });

  it('should show "All N connections loaded" when all loaded', () => {
    const text = getFooterText({
      isFetchingNextPage: false,
      hasNextPage: false,
      totalCount: 150,
      loadedCount: 150,
    });

    expect(text).toBe('All 150 connections loaded');
  });

  it('should show "Showing X of Y connections" when more pages exist', () => {
    const text = getFooterText({
      isFetchingNextPage: false,
      hasNextPage: true,
      totalCount: 200,
      loadedCount: 50,
    });

    expect(text).toBe('Showing 50 of 200 connections');
  });

  it('should show "Showing 0 of 0 connections" for empty dataset', () => {
    const text = getFooterText({
      isFetchingNextPage: false,
      hasNextPage: false,
      totalCount: 0,
      loadedCount: 0,
    });

    // totalCount is 0, so !hasNextPage && totalCount > 0 is false
    expect(text).toBe('Showing 0 of 0 connections');
  });

  it('should show partial progress correctly', () => {
    const text = getFooterText({
      isFetchingNextPage: false,
      hasNextPage: true,
      totalCount: 1000,
      loadedCount: 250,
    });

    expect(text).toBe('Showing 250 of 1000 connections');
  });
});

// ---------------------------------------------------------------------------
// PAGE_SIZE_OPTIONS
// ---------------------------------------------------------------------------
describe('PAGE_SIZE_OPTIONS', () => {
  it('should contain expected batch sizes', () => {
    expect(PAGE_SIZE_OPTIONS).toEqual([25, 50, 100, 200]);
  });

  it('should be sorted in ascending order', () => {
    for (let i = 1; i < PAGE_SIZE_OPTIONS.length; i++) {
      expect(PAGE_SIZE_OPTIONS[i]).toBeGreaterThan(PAGE_SIZE_OPTIONS[i - 1]);
    }
  });

  it('should contain only positive integers', () => {
    PAGE_SIZE_OPTIONS.forEach((size) => {
      expect(size).toBeGreaterThan(0);
      expect(Number.isInteger(size)).toBe(true);
    });
  });
});
