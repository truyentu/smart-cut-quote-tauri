/**
 * Pricing Service
 * Calculate costs for materials, cutting, and operations
 * Based on IMPLEMENTATION_PLAN.md section 9.1
 */

import { DxfFile, Material, Machine, NestingResult, QuoteSummary } from '../types/quote';

/**
 * Calculate material cost based on strip area, material properties, and quantity
 * Formula: Volume(m³) = Area(m²) × Thickness(m)
 *          Weight(kg) = Volume(m³) × Density(kg/m³)
 *          Cost = Weight(kg) × Price per kg × Quantity
 */
export function calculateMaterialCost(
  stripWidth: number,
  stripHeight: number,
  material: Material,
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
  const cost = weight * material.pricePerKg * quantity;

  return Math.round(cost * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate cutting cost based on cut length, pierce count, and machine rates
 * Formula: Cutting Time(min) = Cut Length(mm) / Cutting Speed(mm/min)
 *          Cutting Cost = Cutting Time(hr) × Hourly Rate
 *          Pierce Cost = Pierce Count × Pierce Cost per hole
 *          Total = (Cutting Cost + Pierce Cost) × Quantity
 */
export function calculateCuttingCost(
  cutLength: number,
  pierceCount: number,
  material: Material,
  machine: Machine,
  quantity: number
): number {
  // Calculate cutting time in minutes
  const cuttingTimeMin = cutLength / material.cuttingSpeed;

  // Convert to hours
  const cuttingTimeHr = cuttingTimeMin / 60;

  // Calculate cutting cost based on machine hourly rate
  const cuttingCost = cuttingTimeHr * machine.hourlyRate;

  // Calculate piercing cost
  const pierceCost = pierceCount * material.pierceCost;

  // Total cost including quantity
  const totalCost = (cuttingCost + pierceCost) * quantity;

  return Math.round(totalCost * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate operations cost
 * This is a placeholder for additional operations like bending, welding, etc.
 */
export function calculateOperationsCost(
  operations: string[],
  material: Material,
  quantity: number
): number {
  // Placeholder: Each operation costs $10
  const costPerOperation = 10;
  const totalCost = operations.length * costPerOperation * quantity;

  return Math.round(totalCost * 100) / 100;
}

/**
 * Calculate total cost for all parts in the quote
 * Includes material cost, cutting cost, operations cost, and tax
 */
export function calculateTotalCost(
  parts: DxfFile[],
  nestingResult: NestingResult | null,
  materials: Material[],
  machines: Machine[]
): QuoteSummary {
  let totalMaterialCost = 0;
  let totalCuttingCost = 0;
  let totalOperationsCost = 0;

  // If we have nesting result, use it for material cost calculation
  if (nestingResult) {
    // Group parts by material
    const partsByMaterial = new Map<string, DxfFile[]>();

    parts.forEach((part) => {
      if (part.material) {
        const key = part.material.id;
        if (!partsByMaterial.has(key)) {
          partsByMaterial.set(key, []);
        }
        partsByMaterial.get(key)?.push(part);
      }
    });

    // Calculate material cost per material type
    partsByMaterial.forEach((partsGroup, materialId) => {
      const material = materials.find((m) => m.id === materialId);
      if (!material) return;

      // Sum up quantities for this material
      const totalQuantity = partsGroup.reduce((sum, p) => sum + p.quantity, 0);

      // Calculate material cost based on nesting strip size
      const matCost = calculateMaterialCost(
        nestingResult.stripWidth,
        nestingResult.stripHeight,
        material,
        totalQuantity
      );

      totalMaterialCost += matCost;
    });
  }

  // Calculate cutting and operations cost for each part
  parts.forEach((part) => {
    const material = materials.find((m) => m.id === part.material?.id);
    const machine = machines.find((m) => m.name === part.machine);

    if (!material || !machine || !part.metadata) {
      // Skip parts without complete data
      return;
    }

    // Cutting cost
    const cutCost = calculateCuttingCost(
      part.metadata.cutLength,
      part.metadata.pierceCount,
      material,
      machine,
      part.quantity
    );
    totalCuttingCost += cutCost;

    // Operations cost
    const opsCost = calculateOperationsCost(
      part.operations,
      material,
      part.quantity
    );
    totalOperationsCost += opsCost;
  });

  // Calculate subtotal
  const subtotal = totalMaterialCost + totalCuttingCost + totalOperationsCost;

  // Calculate tax (5%)
  const tax = subtotal * 0.05;

  // Calculate total
  const total = subtotal + tax;

  return {
    materialCost: Math.round(totalMaterialCost * 100) / 100,
    cuttingCost: Math.round(totalCuttingCost * 100) / 100,
    operationsCost: Math.round(totalOperationsCost * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Mock data for materials (for testing/demo purposes)
 */
export const MOCK_MATERIALS: Material[] = [
  {
    id: 'steel-mild-3mm',
    name: 'Mild Steel',
    grade: 'S235JR',
    thickness: 3,
    pricePerKg: 2.5,
    density: 7850, // kg/m³
    cuttingSpeed: 3000, // mm/min
    pierceCost: 0.5, // $ per pierce
  },
  {
    id: 'steel-stainless-3mm',
    name: 'Stainless Steel',
    grade: '304',
    thickness: 3,
    pricePerKg: 5.0,
    density: 8000,
    cuttingSpeed: 2000,
    pierceCost: 0.75,
  },
  {
    id: 'aluminum-5mm',
    name: 'Aluminum',
    grade: '6061-T6',
    thickness: 5,
    pricePerKg: 4.0,
    density: 2700,
    cuttingSpeed: 4000,
    pierceCost: 0.3,
  },
];

/**
 * Mock data for machines (for testing/demo purposes)
 */
export const MOCK_MACHINES: Machine[] = [
  {
    id: 'laser-1',
    name: 'Laser Cutter 1',
    hourlyRate: 80, // $ per hour
    maxSheetWidth: 3000, // mm
    maxSheetHeight: 1500, // mm
  },
  {
    id: 'laser-2',
    name: 'Laser Cutter 2',
    hourlyRate: 100,
    maxSheetWidth: 4000,
    maxSheetHeight: 2000,
  },
  {
    id: 'plasma-1',
    name: 'Plasma Cutter 1',
    hourlyRate: 60,
    maxSheetWidth: 6000,
    maxSheetHeight: 3000,
  },
];
