/**
 * Zustand store for Quote state management
 * Based on IMPLEMENTATION_PLAN.md section 6.2
 */

import { create } from 'zustand';
import { DxfFile, NestingResult, Client } from '../types/quote';

interface QuoteState {
  // State
  currentStage: number;
  client: Client | null;
  files: DxfFile[];
  nestingResult: NestingResult | null;

  // Actions
  setStage: (stage: number) => void;
  setClient: (client: Client) => void;
  addFiles: (files: DxfFile[]) => void;
  removeFile: (fileId: string) => void;
  updateFile: (fileId: string, updates: Partial<DxfFile>) => void;
  setNestingResult: (result: NestingResult) => void;
  resetQuote: () => void;
}

const initialState = {
  currentStage: 0,
  client: null,
  files: [],
  nestingResult: null,
};

export const useQuoteStore = create<QuoteState>((set) => ({
  ...initialState,

  setStage: (stage: number) => set({ currentStage: stage }),

  setClient: (client: Client) => set({ client }),

  addFiles: (files: DxfFile[]) =>
    set((state) => ({
      files: [...state.files, ...files]
    })),

  removeFile: (fileId: string) =>
    set((state) => ({
      files: state.files.filter(f => f.id !== fileId)
    })),

  updateFile: (fileId: string, updates: Partial<DxfFile>) =>
    set((state) => ({
      files: state.files.map(f =>
        f.id === fileId ? { ...f, ...updates } : f
      )
    })),

  setNestingResult: (result: NestingResult) =>
    set({ nestingResult: result }),

  resetQuote: () => set(initialState),
}));
