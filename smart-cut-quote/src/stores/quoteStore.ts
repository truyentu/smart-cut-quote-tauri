/**
 * Zustand store for Quote state management
 * Based on IMPLEMENTATION_PLAN.md section 6.2
 */

import { create } from 'zustand';
import { DxfFile, NestingResult, Client, QuoteSummary } from '../types/quote';
import {
  saveQuote,
  updateSavedQuote,
  loadQuote,
  getAllSavedQuotes,
  deleteSavedQuote,
  SavedQuote,
} from '../services/quoteService';
import { BatchedNestingResult, createSvgBlobUrl } from '../services/nestingService';

interface QuoteState {
  // State
  currentStage: number;
  client: Client | null;
  files: DxfFile[];
  nestingResult: NestingResult | null;
  nestingSvgUrl: string | null;
  summary: QuoteSummary | null;

  // Batched nesting results from Part Library
  batchedNestingResults: BatchedNestingResult[] | null;

  // Current quote info
  currentQuoteId: string | null;
  currentQuoteNumber: string | null;

  // Saved quotes list
  savedQuotes: SavedQuote[];
  loadingSavedQuotes: boolean;

  // Actions
  setStage: (stage: number) => void;
  setClient: (client: Client) => void;
  addFiles: (files: DxfFile[]) => void;
  removeFile: (fileId: string) => void;
  updateFile: (fileId: string, updates: Partial<DxfFile>) => void;
  setNestingResult: (result: NestingResult | null, svgUrl?: string | null) => void;
  setBatchedNestingResults: (batches: BatchedNestingResult[]) => void;
  setSummary: (summary: QuoteSummary) => void;
  resetQuote: () => void;

  // Quote persistence actions
  saveCurrentQuote: (notes?: string) => Promise<SavedQuote>;
  updateCurrentQuote: (updates?: {
    status?: SavedQuote['status'];
    notes?: string;
    internalNotes?: string;
    discount?: number;
    hiddenDiscount?: number;
  }) => Promise<void>;
  updateQuoteStatus: (quoteId: string, status: SavedQuote['status']) => Promise<void>;
  loadQuoteById: (quoteId: string) => Promise<void>;
  loadQuoteForEditing: (quoteId: string) => Promise<void>;
  loadAllSavedQuotes: () => Promise<void>;
  deleteQuoteById: (quoteId: string) => Promise<void>;
}

const initialState = {
  currentStage: 0,
  client: null,
  files: [],
  nestingResult: null,
  nestingSvgUrl: null,
  summary: null,
  batchedNestingResults: null,
  currentQuoteId: null,
  currentQuoteNumber: null,
  savedQuotes: [],
  loadingSavedQuotes: false,
};

export const useQuoteStore = create<QuoteState>((set, get) => ({
  ...initialState,

  setStage: (stage: number) => set({ currentStage: stage }),

  setClient: (client: Client) => set({ client }),

  addFiles: (files: DxfFile[]) =>
    set((state) => ({
      files: [...state.files, ...files],
    })),

  removeFile: (fileId: string) =>
    set((state) => ({
      files: state.files.filter((f) => f.id !== fileId),
    })),

  updateFile: (fileId: string, updates: Partial<DxfFile>) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === fileId ? { ...f, ...updates } : f)),
    })),

  setNestingResult: (result: NestingResult | null, svgUrl?: string | null) =>
    set({ nestingResult: result, nestingSvgUrl: svgUrl || null }),

  setBatchedNestingResults: (batches: BatchedNestingResult[]) =>
    set({ batchedNestingResults: batches }),

  setSummary: (summary: QuoteSummary) => set({ summary }),

  resetQuote: () => set(initialState),

  // Save current quote to database
  saveCurrentQuote: async (notes?: string) => {
    const { client, files, nestingResult, summary } = get();

    if (!client) {
      throw new Error('No client selected');
    }

    const savedQuote = await saveQuote(client, files, nestingResult || undefined, summary || undefined, notes);

    set({
      currentQuoteId: savedQuote.id,
      currentQuoteNumber: savedQuote.quoteNumber,
    });

    // Refresh saved quotes list
    await get().loadAllSavedQuotes();

    return savedQuote;
  },

  // Update current quote in database
  updateCurrentQuote: async (updates) => {
    const { currentQuoteId, files, nestingResult, summary } = get();

    if (!currentQuoteId) {
      throw new Error('No quote loaded');
    }

    await updateSavedQuote(currentQuoteId, {
      files,
      nestingResult: nestingResult || undefined,
      summary: summary || undefined,
      ...updates,
    });

    // Refresh saved quotes list
    await get().loadAllSavedQuotes();
  },

  // Update quote status (for Accept/Reject actions from Dashboard)
  updateQuoteStatus: async (quoteId: string, status: SavedQuote['status']) => {
    await updateSavedQuote(quoteId, { status });

    // Refresh saved quotes list
    await get().loadAllSavedQuotes();
  },

  // Load quote from database
  loadQuoteById: async (quoteId: string) => {
    const quote = await loadQuote(quoteId);

    if (!quote) {
      throw new Error('Quote not found');
    }

    // Validate and sanitize files array
    let validFiles: DxfFile[] = [];
    if (Array.isArray(quote.files)) {
      validFiles = quote.files.filter((file) => {
        // Ensure file has required properties
        return file && typeof file === 'object' && file.id && file.name && file.path;
      });
    } else {
      console.warn('Quote files is not an array, initializing as empty array');
    }

    // Recreate SVG blob URL if nesting result has SVG string
    let nestingSvgUrl: string | null = null;
    if (quote.nestingResult?.svgString) {
      nestingSvgUrl = createSvgBlobUrl(quote.nestingResult.svgString);
      console.log('🔄 Recreated SVG blob URL from database');
    }

    set({
      currentQuoteId: quote.id,
      currentQuoteNumber: quote.quoteNumber,
      client: {
        id: quote.clientId,
        name: quote.clientName,
        company: quote.company,
      },
      files: validFiles,
      nestingResult: quote.nestingResult || null,
      nestingSvgUrl: nestingSvgUrl,
      summary: quote.summary || null,
    });
  },

  // Load quote for editing (restores all state and navigates to workflow)
  loadQuoteForEditing: async (quoteId: string) => {
    const quote = await loadQuote(quoteId);
    if (!quote) {
      throw new Error('Quote not found');
    }

    // Validate and sanitize files array
    let validFiles: DxfFile[] = [];
    if (Array.isArray(quote.files)) {
      validFiles = quote.files.filter((file) => {
        // Ensure file has required properties
        return file && typeof file === 'object' && file.id && file.name && file.path;
      });
    } else {
      console.warn('Quote files is not an array, initializing as empty array');
    }

    // Recreate SVG blob URL if nesting result has SVG string
    let nestingSvgUrl: string | null = null;
    if (quote.nestingResult?.svgString) {
      nestingSvgUrl = createSvgBlobUrl(quote.nestingResult.svgString);
      console.log('🔄 Recreated SVG blob URL from database for editing');
    }

    // Restore entire quote state
    set({
      currentQuoteId: quote.id,
      currentQuoteNumber: quote.quoteNumber,
      client: {
        id: quote.clientId,
        name: quote.clientName,
        company: quote.company,
      },
      files: validFiles,
      nestingResult: quote.nestingResult || null,
      nestingSvgUrl: nestingSvgUrl,
      summary: quote.summary || null,
      // Start at stage 1 (Client Selection) to allow changing client
      currentStage: 1,
    });
  },

  // Load all saved quotes
  loadAllSavedQuotes: async () => {
    set({ loadingSavedQuotes: true });
    try {
      const quotes = await getAllSavedQuotes();
      set({ savedQuotes: quotes });
    } finally {
      set({ loadingSavedQuotes: false });
    }
  },

  // Delete quote
  deleteQuoteById: async (quoteId: string) => {
    await deleteSavedQuote(quoteId);

    // Clear current quote if it's the one being deleted
    const { currentQuoteId } = get();
    if (currentQuoteId === quoteId) {
      set({
        currentQuoteId: null,
        currentQuoteNumber: null,
      });
    }

    // Refresh saved quotes list
    await get().loadAllSavedQuotes();
  },
}));
