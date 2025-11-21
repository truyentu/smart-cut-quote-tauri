/**
 * Quote Service
 * Handles saving and loading quotes from database
 */

import {
  createQuote,
  updateQuote,
  getQuoteById,
  getAllQuotes,
  deleteQuote,
  generateQuoteNumber,
  Quote as DbQuote,
  QuoteInput,
  getAppSettings,
} from './database';
import { DxfFile, Client, NestingResult, QuoteSummary } from '../types/quote';

export interface SavedQuote {
  id: string;
  quoteNumber: string;
  clientId: string;
  clientName: string;
  company: string;
  files: DxfFile[];
  nestingResult?: NestingResult;
  summary?: QuoteSummary;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  productionStatus?: 'in_production' | 'completed' | null;
  productionStartedAt?: Date;
  productionCompletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  validUntil?: Date;
  notes?: string;
  internalNotes?: string;
}

// Quote data stored in JSON blob
interface QuoteDataBlob {
  client: Client;
  files: DxfFile[];
  nestingResult?: NestingResult;
  summary?: QuoteSummary;
}

/**
 * Save a new quote to database
 */
export async function saveQuote(
  client: Client,
  files: DxfFile[],
  nestingResult?: NestingResult,
  summary?: QuoteSummary,
  notes?: string,
  validityDays?: number
): Promise<SavedQuote> {
  // Get settings for defaults
  const settings = await getAppSettings();
  const validity = validityDays || settings.default_validity_days;

  // Generate quote number
  const quoteNumber = await generateQuoteNumber('Q');

  // Prepare data blob
  const dataBlob: QuoteDataBlob = {
    client,
    files,
    nestingResult,
    summary,
  };

  // Prepare quote input
  const quoteInput: QuoteInput = {
    quote_number: quoteNumber,
    client_id: client.id,
    status: 'sent', // Changed from 'draft' to 'sent' when saving quote
    validity_days: validity,
    price_markup: settings.default_price_markup,
    material_markup: settings.default_material_markup,
    tax_rate: settings.default_tax_rate,
    discount: 0,
    hidden_discount: 0,
    subtotal: summary?.subtotal || 0,
    total: summary?.total || 0,
    notes,
    data: JSON.stringify(dataBlob),
    created_by: 'ADMIN',
  };

  // Save to database
  const quoteId = await createQuote(quoteInput);

  // Calculate validity date
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validity);

  // Return saved quote
  return {
    id: quoteId,
    quoteNumber,
    clientId: client.id,
    clientName: client.name,
    company: client.company || '',
    files,
    nestingResult,
    summary,
    status: 'sent',
    createdAt: new Date(),
    updatedAt: new Date(),
    validUntil,
    notes,
  };
}

/**
 * Update existing quote
 */
export async function updateSavedQuote(
  quoteId: string,
  updates: {
    files?: DxfFile[];
    nestingResult?: NestingResult;
    summary?: QuoteSummary;
    status?: 'draft' | 'sent' | 'accepted' | 'rejected';
    notes?: string;
    internalNotes?: string;
    discount?: number;
    hiddenDiscount?: number;
  }
): Promise<void> {
  // Get current quote to merge data
  const currentQuote = await getQuoteById(quoteId);
  if (!currentQuote) {
    throw new Error('Quote not found');
  }

  // Parse current data
  const currentData: QuoteDataBlob = currentQuote.data
    ? JSON.parse(currentQuote.data)
    : { client: { id: '', name: '' }, files: [] };

  // Merge updates into data
  const newData: QuoteDataBlob = {
    client: currentData.client,
    files: updates.files || currentData.files,
    nestingResult: updates.nestingResult || currentData.nestingResult,
    summary: updates.summary || currentData.summary,
  };

  // Prepare update input
  const updateInput: QuoteInput = {
    data: JSON.stringify(newData),
  };

  if (updates.summary) {
    updateInput.subtotal = updates.summary.subtotal;
    updateInput.total = updates.summary.total;
  }

  if (updates.status) {
    updateInput.status = updates.status;
  }

  if (updates.notes !== undefined) {
    updateInput.notes = updates.notes;
  }

  if (updates.discount !== undefined) {
    updateInput.discount = updates.discount;
  }

  if (updates.hiddenDiscount !== undefined) {
    updateInput.hidden_discount = updates.hiddenDiscount;
  }

  await updateQuote(quoteId, updateInput);
}

/**
 * Load quote from database
 */
export async function loadQuote(quoteId: string): Promise<SavedQuote | null> {
  const dbQuote = await getQuoteById(quoteId);
  if (!dbQuote) return null;

  return convertDbQuoteToSavedQuote(dbQuote);
}

/**
 * Get all quotes from database
 */
export async function getAllSavedQuotes(): Promise<SavedQuote[]> {
  const dbQuotes = await getAllQuotes();
  return dbQuotes.map(convertDbQuoteToSavedQuote);
}

/**
 * Delete quote from database
 */
export async function deleteSavedQuote(quoteId: string): Promise<void> {
  await deleteQuote(quoteId);
}

/**
 * Convert database quote to SavedQuote
 */
function convertDbQuoteToSavedQuote(dbQuote: DbQuote): SavedQuote {
  // Parse data blob
  const dataBlob: QuoteDataBlob = dbQuote.data
    ? JSON.parse(dbQuote.data)
    : { client: { id: '', name: '' }, files: [] };

  return {
    id: dbQuote.id,
    quoteNumber: dbQuote.quote_number,
    clientId: dbQuote.client_id || '',
    clientName: dataBlob.client?.name || '',
    company: dataBlob.client?.company || '',
    files: dataBlob.files || [],
    nestingResult: dataBlob.nestingResult,
    summary: dataBlob.summary,
    status: dbQuote.status as SavedQuote['status'],
    productionStatus: (dbQuote.production_status as 'in_production' | 'completed') || null,
    productionStartedAt: dbQuote.production_started_at ? new Date(dbQuote.production_started_at) : undefined,
    productionCompletedAt: dbQuote.production_completed_at ? new Date(dbQuote.production_completed_at) : undefined,
    createdAt: dbQuote.created_at ? new Date(dbQuote.created_at) : new Date(),
    updatedAt: dbQuote.updated_at ? new Date(dbQuote.updated_at) : new Date(),
    validUntil: dbQuote.validity_days
      ? new Date(Date.now() + dbQuote.validity_days * 24 * 60 * 60 * 1000)
      : undefined,
    notes: dbQuote.notes,
  };
}

export default {
  saveQuote,
  updateSavedQuote,
  loadQuote,
  getAllSavedQuotes,
  deleteSavedQuote,
};
