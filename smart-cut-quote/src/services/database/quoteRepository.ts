/**
 * Quote Repository
 * CRUD operations for quotes
 */

import { query, execute } from './connection';
import type { Quote, QuoteInput } from './types';

/**
 * Get all quotes
 */
export async function getAllQuotes(): Promise<Quote[]> {
  return query<Quote>(
    'SELECT * FROM quotes ORDER BY created_at DESC'
  );
}

/**
 * Get quotes by status
 */
export async function getQuotesByStatus(status: string): Promise<Quote[]> {
  return query<Quote>(
    'SELECT * FROM quotes WHERE status = ? ORDER BY created_at DESC',
    [status]
  );
}

/**
 * Get quotes for a client
 */
export async function getQuotesByClient(clientId: string): Promise<Quote[]> {
  return query<Quote>(
    'SELECT * FROM quotes WHERE client_id = ? ORDER BY created_at DESC',
    [clientId]
  );
}

/**
 * Get quote by ID
 */
export async function getQuoteById(id: string): Promise<Quote | null> {
  const results = await query<Quote>(
    'SELECT * FROM quotes WHERE id = ?',
    [id]
  );
  return results.length > 0 ? results[0] : null;
}

/**
 * Get quote by quote number
 */
export async function getQuoteByNumber(quoteNumber: string): Promise<Quote | null> {
  const results = await query<Quote>(
    'SELECT * FROM quotes WHERE quote_number = ?',
    [quoteNumber]
  );
  return results.length > 0 ? results[0] : null;
}

/**
 * Generate next quote number for a prefix
 */
export async function generateQuoteNumber(prefix: string): Promise<string> {
  // Get current counter
  const counters = await query<{ prefix: string; last_number: number }>(
    'SELECT * FROM quote_counter WHERE prefix = ?',
    [prefix]
  );

  let nextNumber: number;

  if (counters.length === 0) {
    // Initialize counter
    nextNumber = 1;
    await execute(
      'INSERT INTO quote_counter (prefix, last_number) VALUES (?, ?)',
      [prefix, nextNumber]
    );
  } else {
    // Increment counter
    nextNumber = counters[0].last_number + 1;
    await execute(
      'UPDATE quote_counter SET last_number = ? WHERE prefix = ?',
      [nextNumber, prefix]
    );
  }

  return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
}

/**
 * Create new quote
 */
export async function createQuote(input: QuoteInput): Promise<string> {
  const id = input.id || `quote_${Date.now()}`;
  const quoteNumber = input.quote_number || await generateQuoteNumber('Q');

  await execute(
    `INSERT INTO quotes (
      id, quote_number, client_id, status, validity_days,
      price_markup, material_markup, tax_rate, discount, hidden_discount,
      subtotal, total, notes, reference, data, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      quoteNumber,
      input.client_id || null,
      input.status || 'draft',
      input.validity_days || 7,
      input.price_markup || 0,
      input.material_markup || 0,
      input.tax_rate || 0,
      input.discount || 0,
      input.hidden_discount || 0,
      input.subtotal || 0,
      input.total || 0,
      input.notes || null,
      input.reference || null,
      input.data || null,
      input.created_by || null,
    ]
  );

  return id;
}

/**
 * Update quote
 */
export async function updateQuote(id: string, input: Partial<QuoteInput>): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];

  const fields: (keyof QuoteInput)[] = [
    'client_id', 'status', 'validity_days',
    'price_markup', 'material_markup', 'tax_rate', 'discount', 'hidden_discount',
    'subtotal', 'total', 'notes', 'reference', 'data', 'created_by'
  ];

  for (const field of fields) {
    if (input[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(input[field]);
    }
  }

  if (updates.length === 0) return;

  updates.push("updated_at = datetime('now')");
  values.push(id);

  await execute(
    `UPDATE quotes SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
}

/**
 * Update quote status
 */
export async function updateQuoteStatus(id: string, status: string): Promise<void> {
  await execute(
    "UPDATE quotes SET status = ?, updated_at = datetime('now') WHERE id = ?",
    [status, id]
  );
}

/**
 * Delete quote
 */
export async function deleteQuote(id: string): Promise<void> {
  await execute('DELETE FROM quotes WHERE id = ?', [id]);
}

/**
 * Duplicate quote
 */
export async function duplicateQuote(id: string): Promise<string> {
  const original = await getQuoteById(id);
  if (!original) {
    throw new Error('Quote not found');
  }

  // Get prefix from quote number
  const prefix = original.quote_number.replace(/\d+$/, '');
  const newQuoteNumber = await generateQuoteNumber(prefix);
  const newId = `quote_${Date.now()}`;

  await execute(
    `INSERT INTO quotes (
      id, quote_number, client_id, status, validity_days,
      price_markup, material_markup, tax_rate, discount, hidden_discount,
      subtotal, total, notes, reference, data, created_by
    ) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newId,
      newQuoteNumber,
      original.client_id,
      original.validity_days,
      original.price_markup,
      original.material_markup,
      original.tax_rate,
      original.discount,
      original.hidden_discount,
      original.subtotal,
      original.total,
      original.notes,
      original.reference,
      original.data,
      original.created_by,
    ]
  );

  return newId;
}

/**
 * Search quotes
 */
export async function searchQuotes(searchTerm: string): Promise<Quote[]> {
  return query<Quote>(
    `SELECT q.* FROM quotes q
     LEFT JOIN clients c ON q.client_id = c.id
     WHERE q.quote_number LIKE ? OR c.company_name LIKE ?
     ORDER BY q.created_at DESC`,
    [`%${searchTerm}%`, `%${searchTerm}%`]
  );
}

/**
 * Get quote statistics
 */
export async function getQuoteStats(): Promise<{
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  rejected: number;
  total_value: number;
}> {
  const stats = await query<{ status: string; count: number; total: number }>(
    `SELECT status, COUNT(*) as count, SUM(total) as total
     FROM quotes
     GROUP BY status`
  );

  const result = {
    total: 0,
    draft: 0,
    sent: 0,
    accepted: 0,
    rejected: 0,
    total_value: 0,
  };

  stats.forEach(s => {
    result.total += s.count;
    result.total_value += s.total || 0;
    if (s.status === 'draft') result.draft = s.count;
    if (s.status === 'sent') result.sent = s.count;
    if (s.status === 'accepted') result.accepted = s.count;
    if (s.status === 'rejected') result.rejected = s.count;
  });

  return result;
}

export default {
  getAllQuotes,
  getQuotesByStatus,
  getQuotesByClient,
  getQuoteById,
  getQuoteByNumber,
  generateQuoteNumber,
  createQuote,
  updateQuote,
  updateQuoteStatus,
  deleteQuote,
  duplicateQuote,
  searchQuotes,
  getQuoteStats,
};
