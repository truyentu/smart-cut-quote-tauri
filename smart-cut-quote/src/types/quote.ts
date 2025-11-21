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
  selected?: boolean; // Whether this file is selected for nesting and quoting
}

export interface NestingResult {
  stripWidth: number;
  stripHeight: number;
  utilization: number;
  itemsPlaced: number;
  placements: Placement[];
  svgPath: string;
  svgString?: string; // SVG content for recreating blob URL after database load
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
  cutPricePerMeter: number; // Price per meter for length-based cutting cost
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

// Quote lifecycle status
export type QuoteStatus =
  | 'draft'      // Nháp - chưa gửi khách
  | 'sent'       // Đã gửi khách - chờ phản hồi
  | 'accepted'   // Khách chấp nhận báo giá
  | 'rejected';  // Khách từ chối không cắt

// Production workflow status (separate from quote status)
export type ProductionStatus =
  | 'in_production' // Đang sản xuất
  | 'completed'     // Hoàn thành sản xuất
  | null;           // Chưa vào sản xuất

export interface Quote {
  id: string;
  client: Client;
  files: DxfFile[];
  nestingResult?: NestingResult;
  summary?: QuoteSummary;

  // Quote status tracking
  status: QuoteStatus;

  // Production tracking (separate workflow)
  productionStatus: ProductionStatus;
  productionStartedAt?: Date;
  productionCompletedAt?: Date;

  // Soft delete for archiving
  deleted: boolean;
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
