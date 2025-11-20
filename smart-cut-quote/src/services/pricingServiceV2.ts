/**
 * Enhanced Pricing Service V2
 * Calculate costs using database configuration
 * Supports operations with different cost types
 */

import {
  getAllMaterials,
  getAllMachines,
  getAllOperations,
  getAppSettings,
  MaterialStock,
  Machine as DbMachine,
  Operation,
  AppSettings,
} from './database';

export interface CostBreakdown {
  material: number;
  cutting: number;
  piercing: number;
  operations: number;
  markup: number;
  unitCost: number;
  totalCost: number;
}

export interface PartCost {
  partId: string;
  quantity: number;
  breakdown: CostBreakdown;
}

export interface QuoteCostSummary {
  parts: PartCost[];
  materialCost: number;
  cuttingCost: number;
  operationsCost: number;
  subtotal: number;
  priceMarkup: number;
  materialMarkup: number;
  discount: number;
  hiddenDiscount: number;
  tax: number;
  total: number;
}

// Cache for database data
let cachedMaterials: MaterialStock[] | null = null;
let cachedMachines: DbMachine[] | null = null;
let cachedOperations: Operation[] | null = null;
let cachedSettings: AppSettings | null = null;

/**
 * Load and cache database data
 */
export async function loadPricingData(): Promise<void> {
  try {
    [cachedMaterials, cachedMachines, cachedOperations, cachedSettings] = await Promise.all([
      getAllMaterials(),
      getAllMachines(),
      getAllOperations(),
      getAppSettings(),
    ]);
  } catch (err) {
    console.error('Failed to load pricing data:', err);
    throw err;
  }
}

/**
 * Get cached materials or load from database
 */
export async function getMaterials(): Promise<MaterialStock[]> {
  if (!cachedMaterials) {
    cachedMaterials = await getAllMaterials();
  }
  return cachedMaterials;
}

/**
 * Get cached machines or load from database
 */
export async function getMachines(): Promise<DbMachine[]> {
  if (!cachedMachines) {
    cachedMachines = await getAllMachines();
  }
  return cachedMachines;
}

/**
 * Get cached operations or load from database
 */
export async function getOperations(): Promise<Operation[]> {
  if (!cachedOperations) {
    cachedOperations = await getAllOperations();
  }
  return cachedOperations;
}

/**
 * Get cached settings or load from database
 */
export async function getSettings(): Promise<AppSettings> {
  if (!cachedSettings) {
    cachedSettings = await getAppSettings();
  }
  return cachedSettings;
}

/**
 * Clear cache to force reload
 */
export function clearPricingCache(): void {
  cachedMaterials = null;
  cachedMachines = null;
  cachedOperations = null;
  cachedSettings = null;
}

/**
 * Calculate material cost from nesting result (total sheet area)
 * Formula: Volume(m³) = Area(m²) × Thickness(m)
 *          Weight(kg) = Volume(m³) × Density(kg/m³)
 *          Cost = Weight(kg) × Price per kg
 */
export function calculateMaterialCost(
  stripWidth: number,
  stripHeight: number,
  material: MaterialStock,
  quantity: number
): number {
  // Convert mm to m for area calculation
  const usedArea = (stripWidth * stripHeight) / 1_000_000; // m²

  // Convert thickness from mm to m
  const thicknessM = material.thickness / 1000; // m

  // Calculate volume (m³)
  const volume = usedArea * thicknessM;

  // Calculate weight (kg)
  const weight = volume * material.density;

  // Calculate cost
  const cost = weight * material.price_per_kg * quantity;

  return Math.round(cost * 100) / 100;
}

/**
 * Calculate material cost per part using bounding box
 * This calculates material cost for individual part pricing
 * Formula: Volume(m³) = (Width × Height)(m²) × Thickness(m)
 *          Weight(kg) = Volume(m³) × Density(kg/m³)
 *          Cost = Weight(kg) × Price per kg × Quantity
 */
export function calculateMaterialCostPerPart(
  partWidth: number, // mm (bounding box width)
  partHeight: number, // mm (bounding box height)
  material: MaterialStock,
  quantity: number
): number {
  // Convert mm to m for area calculation
  const partArea = (partWidth * partHeight) / 1_000_000; // m²

  // Convert thickness from mm to m
  const thicknessM = material.thickness / 1000; // m

  // Calculate volume (m³)
  const volume = partArea * thicknessM;

  // Calculate weight (kg)
  const weight = volume * material.density;

  // Calculate cost
  const cost = weight * material.price_per_kg * quantity;

  return Math.round(cost * 100) / 100;
}

/**
 * Calculate cutting cost
 * Formula: Cutting Time(min) = Cut Length(mm) / Cutting Speed(mm/min)
 *          Cutting Cost = Cutting Time(hr) × Hourly Rate
 */
export function calculateCuttingCost(
  cutLength: number,
  cuttingSpeed: number,
  hourlyRate: number,
  quantity: number
): number {
  // Calculate cutting time in minutes
  const cuttingTimeMin = cutLength / cuttingSpeed;

  // Convert to hours
  const cuttingTimeHr = cuttingTimeMin / 60;

  // Calculate cutting cost
  const cost = cuttingTimeHr * hourlyRate * quantity;

  return Math.round(cost * 100) / 100;
}

/**
 * Calculate piercing cost
 */
export function calculatePiercingCost(
  pierceCount: number,
  pierceCost: number,
  quantity: number
): number {
  return Math.round(pierceCount * pierceCost * quantity * 100) / 100;
}

/**
 * Calculate operation cost based on cost type
 */
export function calculateOperationCost(
  operation: Operation,
  params: {
    quantity: number;
    area?: number; // m²
    length?: number; // m
    count?: number;
    hourlyRate?: number;
  }
): number {
  let cost = 0;

  switch (operation.cost_type) {
    case 'per_unit':
      cost = operation.cost * params.quantity;
      break;

    case 'per_area':
      cost = operation.cost * (params.area || 0) * params.quantity;
      break;

    case 'per_length':
      cost = operation.cost * (params.length || 0) * params.quantity;
      break;

    case 'per_count':
      cost = operation.cost * (params.count || 0) * params.quantity;
      break;

    case 'time_based':
      if (operation.time_minutes && params.hourlyRate) {
        const hours = operation.time_minutes / 60;
        cost = hours * params.hourlyRate * params.quantity;
      }
      break;
  }

  return Math.round(cost * 100) / 100;
}

/**
 * Calculate total operations cost for a part
 */
export function calculateOperationsCost(
  operationNames: string[],
  allOperations: Operation[],
  params: {
    quantity: number;
    area?: number;
    length?: number;
    count?: number;
    hourlyRate?: number;
  }
): number {
  let totalCost = 0;

  operationNames.forEach((opName) => {
    const operation = allOperations.find(
      (op) => op.name.toLowerCase() === opName.toLowerCase()
    );
    if (operation) {
      totalCost += calculateOperationCost(operation, params);
    }
  });

  return totalCost;
}

/**
 * Calculate complete cost breakdown for a part
 */
export async function calculatePartCost(
  partData: {
    id: string;
    quantity: number;
    materialId: string;
    machineName: string;
    cutLength: number;
    pierceCount: number;
    area: number;
    operations: string[];
  }
): Promise<PartCost> {
  const materials = await getMaterials();
  const machines = await getMachines();
  const operations = await getOperations();
  const settings = await getSettings();

  const material = materials.find((m) => m.id === partData.materialId);
  const machine = machines.find((m) => m.name === partData.machineName);

  if (!material || !machine) {
    throw new Error(`Material or machine not found for part ${partData.id}`);
  }

  // Calculate individual costs
  const cuttingCost = calculateCuttingCost(
    partData.cutLength,
    material.cutting_speed,
    machine.hourly_rate,
    partData.quantity
  );

  const piercingCost = calculatePiercingCost(
    partData.pierceCount,
    material.pierce_cost,
    partData.quantity
  );

  const operationsCost = calculateOperationsCost(
    partData.operations,
    operations,
    {
      quantity: partData.quantity,
      area: partData.area / 1_000_000, // Convert mm² to m²
      length: partData.cutLength / 1000, // Convert mm to m
      count: partData.pierceCount,
      hourlyRate: machine.hourly_rate,
    }
  );

  // Material cost will be calculated separately based on nesting result
  const materialCost = 0;

  // Calculate subtotal
  const subtotal = materialCost + cuttingCost + piercingCost + operationsCost;

  // Apply markup
  const markupPercent = settings.default_price_markup;
  const markup = subtotal * (markupPercent / 100);

  const unitCost = (subtotal + markup) / partData.quantity;
  const totalCost = subtotal + markup;

  return {
    partId: partData.id,
    quantity: partData.quantity,
    breakdown: {
      material: materialCost,
      cutting: cuttingCost,
      piercing: piercingCost,
      operations: operationsCost,
      markup,
      unitCost: Math.round(unitCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
    },
  };
}

/**
 * Apply discounts and tax to calculate final quote total
 */
export function calculateQuoteTotal(
  subtotal: number,
  settings: AppSettings,
  discountPercent: number = 0,
  hiddenDiscountPercent: number = 0
): {
  discount: number;
  hiddenDiscount: number;
  tax: number;
  total: number;
} {
  const discount = subtotal * (discountPercent / 100);
  const hiddenDiscount = subtotal * (hiddenDiscountPercent / 100);
  const afterDiscounts = subtotal - discount - hiddenDiscount;
  const tax = afterDiscounts * (settings.default_tax_rate / 100);
  const total = afterDiscounts + tax;

  return {
    discount: Math.round(discount * 100) / 100,
    hiddenDiscount: Math.round(hiddenDiscount * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

export default {
  loadPricingData,
  getMaterials,
  getMachines,
  getOperations,
  getSettings,
  clearPricingCache,
  calculateMaterialCost,
  calculateMaterialCostPerPart,
  calculateCuttingCost,
  calculatePiercingCost,
  calculateOperationCost,
  calculateOperationsCost,
  calculatePartCost,
  calculateQuoteTotal,
};
