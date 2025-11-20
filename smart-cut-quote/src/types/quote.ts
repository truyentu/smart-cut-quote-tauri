/**
 * Type definitions for Smart Cut Quote application
 * Based on IMPLEMENTATION_PLAN.md section 6.3
 */

export interface DxfFile {
  id: string;
  name: string;
  path: string;
  size: number;
  quantity: number;
  material?: Material;
  machine?: string;
  operations: string[];
  status: 'pending' | 'ok' | 'error';
  preview?: string; // base64 or blob URL
  metadata?: {
    cutLength: number;
    pierceCount: number;
    area: number;
    dimensions: { width: number; height: number };
  };
  // Part Library specific fields
  materialGroup?: string;
  materialGrade?: string;
  materialThickness?: number;
  materialMarkup?: number; // % markup on material cost
  priceMarkup?: number; // % markup on total price
  unitCost?: number; // Calculated unit cost
  totalCost?: number; // Calculated total cost (unitCost * quantity)
}

export interface NestingResult {
  stripWidth: number;
  stripHeight: number;
  utilization: number;
  itemsPlaced: number;
  placements: Placement[];
  svgPath: string;
}

export interface Placement {
  itemId: number;
  x: number;
  y: number;
  rotation: number;
}

export interface Material {
  id: string;
  name: string;
  grade: string;
  thickness: number;
  pricePerKg: number;
  density: number;
  cuttingSpeed: number;
  pierceCost: number;
}

export interface Machine {
  id: string;
  name: string;
  hourlyRate: number;
  maxSheetWidth: number;
  maxSheetHeight: number;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
}

export interface QuoteSummary {
  materialCost: number;
  cuttingCost: number;
  operationsCost: number;
  shipping: number;
  subtotal: number;
  tax: number;
  total: number;
}

export interface Quote {
  id: string;
  client: Client;
  files: DxfFile[];
  nestingResult?: NestingResult;
  summary?: QuoteSummary;
  createdAt: Date;
  updatedAt: Date;
}
