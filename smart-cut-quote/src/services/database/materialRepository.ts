/**
 * Material Stock Repository
 * CRUD operations for materials
 */

import { query, execute } from './connection';
import type { MaterialStock, MaterialStockInput } from './types';

/**
 * Get all materials
 */
export async function getAllMaterials(includeInactive = false): Promise<MaterialStock[]> {
  const sql = includeInactive
    ? 'SELECT * FROM material_stock ORDER BY name, grade, thickness'
    : 'SELECT * FROM material_stock WHERE is_active = 1 ORDER BY name, grade, thickness';

  return query<MaterialStock>(sql);
}

/**
 * Get material by ID
 */
export async function getMaterialById(id: string): Promise<MaterialStock | null> {
  const results = await query<MaterialStock>(
    'SELECT * FROM material_stock WHERE id = ?',
    [id]
  );
  return results.length > 0 ? results[0] : null;
}

/**
 * Get materials by name and grade
 */
export async function getMaterialsByNameGrade(name: string, grade: string): Promise<MaterialStock[]> {
  return query<MaterialStock>(
    'SELECT * FROM material_stock WHERE name = ? AND grade = ? AND is_active = 1 ORDER BY thickness',
    [name, grade]
  );
}

/**
 * Create new material
 */
export async function createMaterial(input: MaterialStockInput): Promise<string> {
  const id = input.id || `${input.name.toLowerCase().replace(/\s+/g, '_')}_${input.grade.toLowerCase()}_${input.thickness}`;

  await execute(
    `INSERT INTO material_stock (
      id, name, grade, thickness, sheet_width, sheet_max_length,
      price_per_kg, density, quantity_in_stock, min_quantity,
      cutting_speed, pierce_time, pierce_cost, cut_price_per_meter, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      id,
      input.name,
      input.grade,
      input.thickness,
      input.sheet_width,
      input.sheet_max_length,
      input.price_per_kg,
      input.density,
      input.quantity_in_stock || 0,
      input.min_quantity || 0,
      input.cutting_speed || 3000,
      input.pierce_time || 0.5,
      input.pierce_cost || 0.15,
      input.cut_price_per_meter || 0,
    ]
  );

  return id;
}

/**
 * Update material
 */
export async function updateMaterial(id: string, input: Partial<MaterialStockInput>): Promise<void> {
  const updates: string[] = [];
  const values: any[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.grade !== undefined) {
    updates.push('grade = ?');
    values.push(input.grade);
  }
  if (input.thickness !== undefined) {
    updates.push('thickness = ?');
    values.push(input.thickness);
  }
  if (input.sheet_width !== undefined) {
    updates.push('sheet_width = ?');
    values.push(input.sheet_width);
  }
  if (input.sheet_max_length !== undefined) {
    updates.push('sheet_max_length = ?');
    values.push(input.sheet_max_length);
  }
  if (input.price_per_kg !== undefined) {
    updates.push('price_per_kg = ?');
    values.push(input.price_per_kg);
  }
  if (input.density !== undefined) {
    updates.push('density = ?');
    values.push(input.density);
  }
  if (input.quantity_in_stock !== undefined) {
    updates.push('quantity_in_stock = ?');
    values.push(input.quantity_in_stock);
  }
  if (input.min_quantity !== undefined) {
    updates.push('min_quantity = ?');
    values.push(input.min_quantity);
  }
  if (input.cutting_speed !== undefined) {
    updates.push('cutting_speed = ?');
    values.push(input.cutting_speed);
  }
  if (input.pierce_time !== undefined) {
    updates.push('pierce_time = ?');
    values.push(input.pierce_time);
  }
  if (input.pierce_cost !== undefined) {
    updates.push('pierce_cost = ?');
    values.push(input.pierce_cost);
  }
  if (input.cut_price_per_meter !== undefined) {
    updates.push('cut_price_per_meter = ?');
    values.push(input.cut_price_per_meter);
  }

  if (updates.length === 0) return;

  updates.push("updated_at = datetime('now')");
  values.push(id);

  await execute(
    `UPDATE material_stock SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
}

/**
 * Delete material (soft delete)
 */
export async function deleteMaterial(id: string): Promise<void> {
  await execute(
    "UPDATE material_stock SET is_active = 0, updated_at = datetime('now') WHERE id = ?",
    [id]
  );
}

/**
 * Permanently delete material
 */
export async function hardDeleteMaterial(id: string): Promise<void> {
  await execute('DELETE FROM material_stock WHERE id = ?', [id]);
}

/**
 * Get unique material names
 */
export async function getMaterialNames(): Promise<string[]> {
  const results = await query<{ name: string }>(
    'SELECT DISTINCT name FROM material_stock WHERE is_active = 1 ORDER BY name'
  );
  return results.map(r => r.name);
}

/**
 * Get unique grades for a material name
 */
export async function getMaterialGrades(name: string): Promise<string[]> {
  const results = await query<{ grade: string }>(
    'SELECT DISTINCT grade FROM material_stock WHERE name = ? AND is_active = 1 ORDER BY grade',
    [name]
  );
  return results.map(r => r.grade);
}

/**
 * Get thicknesses for a material name and grade
 */
export async function getMaterialThicknesses(name: string, grade: string): Promise<number[]> {
  const results = await query<{ thickness: number }>(
    'SELECT thickness FROM material_stock WHERE name = ? AND grade = ? AND is_active = 1 ORDER BY thickness',
    [name, grade]
  );
  return results.map(r => r.thickness);
}

export default {
  getAllMaterials,
  getMaterialById,
  getMaterialsByNameGrade,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  hardDeleteMaterial,
  getMaterialNames,
  getMaterialGrades,
  getMaterialThicknesses,
};
