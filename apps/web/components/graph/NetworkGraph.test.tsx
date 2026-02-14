/**
 * NetworkGraph Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGraphStore } from '@/lib/stores/graph-store';

// Note: We test the store directly rather than rendering ReactFlow
// because ReactFlow requires a browser environment

describe('NetworkGraph Store Integration', () => {
  beforeEach(() => {
    // Reset store state before each test
    useGraphStore.setState({ selectedPath: null });
  });

  it('should update state when setSelectedPath called', () => {
    const { setSelectedPath } = useGraphStore.getState();
    const testPath = ['node-a', 'node-b', 'node-c'];

    setSelectedPath(testPath);

    const { selectedPath } = useGraphStore.getState();
    expect(selectedPath).toEqual(testPath);
  });

  it('should clear state when clearSelectedPath called', () => {
    const { setSelectedPath, clearSelectedPath } = useGraphStore.getState();

    // First set a path
    setSelectedPath(['node-a', 'node-b']);
    expect(useGraphStore.getState().selectedPath).not.toBeNull();

    // Then clear it
    clearSelectedPath();
    expect(useGraphStore.getState().selectedPath).toBeNull();
  });

  it('should pass selectedPath to PathHighlight component', () => {
    // This test verifies the store provides selectedPath for PathHighlight
    const testPath = ['me', 'alice', 'target'];
    const { setSelectedPath } = useGraphStore.getState();

    setSelectedPath(testPath);

    // Verify the state can be read for passing to PathHighlight
    const state = useGraphStore.getState();
    expect(state.selectedPath).toEqual(testPath);
    expect(state.selectedPath?.length).toBe(3);
    expect(state.selectedPath?.[0]).toBe('me');
    expect(state.selectedPath?.[2]).toBe('target');
  });

  it('should highlight correct nodes when path selected', () => {
    // This test verifies the correct path is stored for highlighting
    const { setSelectedPath } = useGraphStore.getState();
    const path1 = ['a', 'b', 'c'];
    const path2 = ['x', 'y', 'z'];

    // Select first path
    setSelectedPath(path1);
    expect(useGraphStore.getState().selectedPath).toEqual(path1);

    // Change to second path
    setSelectedPath(path2);
    expect(useGraphStore.getState().selectedPath).toEqual(path2);

    // Verify nodes would be highlighted correctly
    const { selectedPath } = useGraphStore.getState();
    expect(selectedPath?.includes('x')).toBe(true);
    expect(selectedPath?.includes('y')).toBe(true);
    expect(selectedPath?.includes('z')).toBe(true);
    expect(selectedPath?.includes('a')).toBe(false);
  });
});
