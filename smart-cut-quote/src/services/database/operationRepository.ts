/**
 * Operation Repository
 * CRUD operations for operations
 */

import { query, execute } from './connection';
import type { Operation, OperationInput } from './types';

/**
 * Get all operations
 */
export async function getAllOperations(includeInactive = false): Promise<Operation[]> {
  const sql = includeInactive
    ? 'SELECT * FROM operations ORDER BY name'
    : 'SELECT * FROM operations WHERE is_active = 1 ORDER BY name';

  return query<Operation>(sql);
}

/**
 * Get operation by ID
 */
export async function getOperationById(id: string): Promise<Operation | null> {
  const results = await query<Operation>(
    'SELECT * FROM operations WHERE id = ?',
    [id]
  );
  return results.length > 0 ? results[0] : null;
}

/**
 * Get operation by name
 */
export async function getOperationByName(name: string): Promise<Operation | null> {
  const results = await query<Operation>(
    'SELECT * FROM operations WHERE name = ? AND is_active = 1',
    [name]
  );
  return results.length > 0 ? results[0] : null;
}

/**
 * Create new operation
 */
export async function createOperation(input: OperationInput): Promise<string> {
  const id = input.id || `op_${input.name.toLowerCase().replace(/\s+/g, '_')}`;

  await execute(
    `INSERT INTO operations (
      id, name, cost_type, cost, time_minutes, description, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [
      id,
      input.name,
      input.cost_type,
      input.cost,
      input.time_minutes || null,
      input.description || null,
    ]
  );

  return id;
}

/**
 * Update operation
 */
export async function updateOperation(id: string, input: Partial<OperationInput>): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.cost_type !== undefined) {
    updates.push('cost_type = ?');
    values.push(input.cost_type);
  }
  if (input.cost !== undefined) {
    updates.push('cost = ?');
    values.push(input.cost);
  }
  if (input.time_minutes !== undefined) {
    updates.push('time_minutes = ?');
    values.push(input.time_minutes);
  }
  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description);
  }

  if (updates.length === 0) return;

  updates.push("updated_at = datetime('now')");
  values.push(id);

  await execute(
    `UPDATE operations SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
}

/**
 * Delete operation (soft delete)
 */
export async function deleteOperation(id: string): Promise<void> {
  await execute(
    "UPDATE operations SET is_active = 0, updated_at = datetime('now') WHERE id = ?",
    [id]
  );
}

export default {
  getAllOperations,
  getOperationById,
  getOperationByName,
  createOperation,
  updateOperation,
  deleteOperation,
};
