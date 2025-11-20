/**
 * Client Repository
 * CRUD operations for clients
 */

import { query, execute } from './connection';
import type { Client, ClientInput, ClientContact, ClientContactInput } from './types';

/**
 * Get all clients
 */
export async function getAllClients(includeInactive = false): Promise<Client[]> {
  const sql = includeInactive
    ? 'SELECT * FROM clients ORDER BY company_name'
    : 'SELECT * FROM clients WHERE is_active = 1 ORDER BY company_name';

  return query<Client>(sql);
}

/**
 * Get client by ID
 */
export async function getClientById(id: string): Promise<Client | null> {
  const results = await query<Client>(
    'SELECT * FROM clients WHERE id = ?',
    [id]
  );
  return results.length > 0 ? results[0] : null;
}

/**
 * Search clients by name
 */
export async function searchClients(searchTerm: string): Promise<Client[]> {
  return query<Client>(
    'SELECT * FROM clients WHERE company_name LIKE ? AND is_active = 1 ORDER BY company_name',
    [`%${searchTerm}%`]
  );
}

/**
 * Create new client
 */
export async function createClient(input: ClientInput): Promise<string> {
  const id = input.id || `client_${Date.now()}`;

  await execute(
    `INSERT INTO clients (
      id, company_name, phone, email, business_no,
      billing_address_line1, billing_address_line2, billing_city, billing_state, billing_zip, billing_country,
      shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_zip, shipping_country,
      additional_price_markup, additional_material_markup, quote_prefix, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      id,
      input.company_name,
      input.phone || null,
      input.email || null,
      input.business_no || null,
      input.billing_address_line1 || null,
      input.billing_address_line2 || null,
      input.billing_city || null,
      input.billing_state || null,
      input.billing_zip || null,
      input.billing_country || null,
      input.shipping_address_line1 || null,
      input.shipping_address_line2 || null,
      input.shipping_city || null,
      input.shipping_state || null,
      input.shipping_zip || null,
      input.shipping_country || null,
      input.additional_price_markup || 0,
      input.additional_material_markup || 0,
      input.quote_prefix || 'Q',
    ]
  );

  return id;
}

/**
 * Update client
 */
export async function updateClient(id: string, input: Partial<ClientInput>): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];

  const fields: (keyof ClientInput)[] = [
    'company_name', 'phone', 'email', 'business_no',
    'billing_address_line1', 'billing_address_line2', 'billing_city', 'billing_state', 'billing_zip', 'billing_country',
    'shipping_address_line1', 'shipping_address_line2', 'shipping_city', 'shipping_state', 'shipping_zip', 'shipping_country',
    'additional_price_markup', 'additional_material_markup', 'quote_prefix'
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
    `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
}

/**
 * Delete client (soft delete)
 */
export async function deleteClient(id: string): Promise<void> {
  await execute(
    "UPDATE clients SET is_active = 0, updated_at = datetime('now') WHERE id = ?",
    [id]
  );
}

// =====================================================
// Client Contacts
// =====================================================

/**
 * Get contacts for a client
 */
export async function getClientContacts(clientId: string): Promise<ClientContact[]> {
  return query<ClientContact>(
    'SELECT * FROM client_contacts WHERE client_id = ? ORDER BY is_primary DESC, name',
    [clientId]
  );
}

/**
 * Add contact to client
 */
export async function addClientContact(input: ClientContactInput): Promise<string> {
  const id = input.id || `contact_${Date.now()}`;

  await execute(
    `INSERT INTO client_contacts (id, client_id, name, phone, email, is_primary)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.client_id,
      input.name,
      input.phone || null,
      input.email || null,
      input.is_primary ? 1 : 0,
    ]
  );

  return id;
}

/**
 * Update contact
 */
export async function updateClientContact(id: string, input: Partial<ClientContactInput>): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.phone !== undefined) {
    updates.push('phone = ?');
    values.push(input.phone);
  }
  if (input.email !== undefined) {
    updates.push('email = ?');
    values.push(input.email);
  }
  if (input.is_primary !== undefined) {
    updates.push('is_primary = ?');
    values.push(input.is_primary ? 1 : 0);
  }

  if (updates.length === 0) return;

  values.push(id);

  await execute(
    `UPDATE client_contacts SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
}

/**
 * Delete contact
 */
export async function deleteClientContact(id: string): Promise<void> {
  await execute('DELETE FROM client_contacts WHERE id = ?', [id]);
}

export default {
  getAllClients,
  getClientById,
  searchClients,
  createClient,
  updateClient,
  deleteClient,
  getClientContacts,
  addClientContact,
  updateClientContact,
  deleteClientContact,
};
