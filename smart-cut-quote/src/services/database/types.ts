/**
 * Database Types
 * Type definitions for all database entities
 */

// =====================================================
// Settings
// =====================================================
export interface Setting {
  key: string;
  value: string;
  created_at?: string;
  updated_at?: string;
}

export interface AppSettings {
  default_price_markup: number;
  default_material_markup: number;
  default_tax_rate: number;
  minimum_order_amount: number;
  pricing_strategy: 'hybrid' | 'sheet_based' | 'utilization_based';
  min_utilization_threshold: number;
  scrap_value_percent: number;
  default_validity_days: number;
  currency_symbol: string;
  currency_code: string;
}

// =====================================================
// Company Info
// =====================================================
export interface CompanyInfo {
  id?: number;
  company_name: string;
  business_no?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_path?: string;
  created_at?: string;
  updated_at?: string;
}

// =====================================================
// Material Stock
// =====================================================
export interface MaterialStock {
  id: string;
  name: string;
  grade: string;
  thickness: number;
  sheet_width: number;
  sheet_max_length: number;
  price_per_kg: number;
  density: number;
  quantity_in_stock: number;
  min_quantity: number;
  cutting_speed: number;
  pierce_time: number;
  pierce_cost: number;
  cut_price_per_meter: number; // Price per meter for length-based cutting cost
  is_active: number; // SQLite boolean
  created_at?: string;
  updated_at?: string;
}

export interface MaterialStockInput {
  id?: string;
  name: string;
  grade: string;
  thickness: number;
  sheet_width: number;
  sheet_max_length: number;
  price_per_kg: number;
  density: number;
  quantity_in_stock?: number;
  min_quantity?: number;
  cutting_speed?: number;
  pierce_time?: number;
  pierce_cost?: number;
  cut_price_per_meter?: number;
}

// =====================================================
// Machines
// =====================================================
export interface Machine {
  id: string;
  name: string;
  hourly_rate: number;
  max_sheet_width?: number;
  max_sheet_length?: number;
  power_kw?: number;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface MachineInput {
  id?: string;
  name: string;
  hourly_rate: number;
  max_sheet_width?: number;
  max_sheet_length?: number;
  power_kw?: number;
}

// =====================================================
// Operations
// =====================================================
export type OperationCostType = 'per_unit' | 'per_area' | 'per_length' | 'per_count' | 'time_based';

export interface Operation {
  id: string;
  name: string;
  cost_type: OperationCostType;
  cost: number;
  time_minutes?: number;
  description?: string;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface OperationInput {
  id?: string;
  name: string;
  cost_type: OperationCostType;
  cost: number;
  time_minutes?: number;
  description?: string;
}

// =====================================================
// Clients
// =====================================================
export interface Client {
  id: string;
  company_name: string;
  phone?: string;
  email?: string;
  business_no?: string;
  billing_address_line1?: string;
  billing_address_line2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zip?: string;
  billing_country?: string;
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip?: string;
  shipping_country?: string;
  additional_price_markup: number;
  additional_material_markup: number;
  quote_prefix: string;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface ClientInput {
  id?: string;
  company_name: string;
  phone?: string;
  email?: string;
  business_no?: string;
  billing_address_line1?: string;
  billing_address_line2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zip?: string;
  billing_country?: string;
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip?: string;
  shipping_country?: string;
  additional_price_markup?: number;
  additional_material_markup?: number;
  quote_prefix?: string;
}

// =====================================================
// Client Contacts
// =====================================================
export interface ClientContact {
  id: string;
  client_id: string;
  name: string;
  phone?: string;
  email?: string;
  is_primary: number;
  created_at?: string;
}

export interface ClientContactInput {
  id?: string;
  client_id: string;
  name: string;
  phone?: string;
  email?: string;
  is_primary?: boolean;
}

// =====================================================
// Quotes
// =====================================================
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface Quote {
  id: string;
  quote_number: string;
  client_id?: string;
  status: QuoteStatus;
  validity_days: number;
  price_markup: number;
  material_markup: number;
  tax_rate: number;
  discount: number;
  hidden_discount: number;
  subtotal: number;
  total: number;
  notes?: string;
  reference?: string;
  data?: string; // JSON string
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  // Production tracking fields
  production_status?: string;
  production_started_at?: string;
  production_completed_at?: string;
  deleted?: number;
  deleted_at?: string;
}

export interface QuoteInput {
  id?: string;
  quote_number?: string;
  client_id?: string;
  status?: QuoteStatus;
  validity_days?: number;
  price_markup?: number;
  material_markup?: number;
  tax_rate?: number;
  discount?: number;
  hidden_discount?: number;
  subtotal?: number;
  total?: number;
  notes?: string;
  reference?: string;
  data?: string;
  created_by?: string;
}

// =====================================================
// Quote Data (JSON blob)
// =====================================================
export interface QuoteData {
  client: {
    id: string;
    name: string;
    phone?: string;
    contact?: string;
  };
  files: Array<{
    id: string;
    name: string;
    dxf_data?: any;
  }>;
  parts: Array<{
    id: string;
    file_id: string;
    name: string;
    quantity: number;
    material: {
      stock_id: string;
      name: string;
      grade: string;
      thickness: number;
    };
    machine: string;
    grain_direction?: 'both' | 'horizontal' | 'vertical';
    operations: string[];
    price_markup: number;
    costs: {
      material: number;
      cutting: number;
      operations: number;
      unit_cost: number;
      total_cost: number;
    };
  }>;
  nesting_results?: {
    sheets: Array<{
      id: string;
      original_dimensions: { width: number; max_length: number };
      used_dimensions: { width: number; length: number };
      utilization: number;
      parts: Array<{
        part_id: string;
        x: number;
        y: number;
        rotation: number;
      }>;
      cost: number;
    }>;
    summary: {
      total_sheets: number;
      average_utilization: number;
      total_material_cost: number;
    };
  };
  pricing: {
    subtotal: number;
    discount: number;
    hidden_discount: number;
    tax: number;
    total: number;
  };
  notes?: string;
  reference?: string;
}
