/**
 * Graph Store
 *
 * Zustand store for managing graph visualization state,
 * including path selection and highlighting.
 */

import { create } from 'zustand';

export interface GraphState {
  /** Currently selected path node IDs */
  selectedPath: string[] | null;

  /** Set the selected path */
  setSelectedPath: (path: string[] | null) => void;

  /** Clear the selected path */
  clearSelectedPath: () => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  selectedPath: null,

  setSelectedPath: (path) => set({ selectedPath: path }),

  clearSelectedPath: () => set({ selectedPath: null }),
}));
