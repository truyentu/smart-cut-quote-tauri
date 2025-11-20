/**
 * Machine Repository
 * CRUD operations for machines
 */

import { query, execute } from './connection';
import type { Machine, MachineInput } from './types';

/**
 * Get all machines
 */
export async function getAllMachines(includeInactive = false): Promise<Machine[]> {
  const sql = includeInactive
    ? 'SELECT * FROM machines ORDER BY name'
    : 'SELECT * FROM machines WHERE is_active = 1 ORDER BY name';

  return query<Machine>(sql);
}

/**
 * Get machine by ID
 */
export async function getMachineById(id: string): Promise<Machine | null> {
  const results = await query<Machine>(
    'SELECT * FROM machines WHERE id = ?',
    [id]
  );
  return results.length > 0 ? results[0] : null;
}

/**
 * Get machine by name
 */
export async function getMachineByName(name: string): Promise<Machine | null> {
  const results = await query<Machine>(
    'SELECT * FROM machines WHERE name = ? AND is_active = 1',
    [name]
  );
  return results.length > 0 ? results[0] : null;
}

/**
 * Create new machine
 */
export async function createMachine(input: MachineInput): Promise<string> {
  const id = input.id || `machine_${Date.now()}`;

  await execute(
    `INSERT INTO machines (
      id, name, hourly_rate, max_sheet_width, max_sheet_length, power_kw, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [
      id,
      input.name,
      input.hourly_rate,
      input.max_sheet_width || null,
      input.max_sheet_length || null,
      input.power_kw || null,
    ]
  );

  return id;
}

/**
 * Update machine
 */
export async function updateMachine(id: string, input: Partial<MachineInput>): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.hourly_rate !== undefined) {
    updates.push('hourly_rate = ?');
    values.push(input.hourly_rate);
  }
  if (input.max_sheet_width !== undefined) {
    updates.push('max_sheet_width = ?');
    values.push(input.max_sheet_width);
  }
  if (input.max_sheet_length !== undefined) {
    updates.push('max_sheet_length = ?');
    values.push(input.max_sheet_length);
  }
  if (input.power_kw !== undefined) {
    updates.push('power_kw = ?');
    values.push(input.power_kw);
  }

  if (updates.length === 0) return;

  updates.push("updated_at = datetime('now')");
  values.push(id);

  await execute(
    `UPDATE machines SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
}

/**
 * Delete machine (soft delete)
 */
export async function deleteMachine(id: string): Promise<void> {
  await execute(
    "UPDATE machines SET is_active = 0, updated_at = datetime('now') WHERE id = ?",
    [id]
  );
}

export default {
  getAllMachines,
  getMachineById,
  getMachineByName,
  createMachine,
  updateMachine,
  deleteMachine,
};
