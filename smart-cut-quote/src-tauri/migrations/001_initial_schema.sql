-- Smart Cut Quote Database Schema
-- Version 1.0.0

-- =====================================================
-- Settings table (key-value store)
-- =====================================================
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- Company Information
-- =====================================================
CREATE TABLE IF NOT EXISTS company_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    business_no TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    country TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    logo_path TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- Material Stock
-- =====================================================
CREATE TABLE IF NOT EXISTS material_stock (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    thickness REAL NOT NULL,
    sheet_width REAL NOT NULL,
    sheet_max_length REAL NOT NULL,
    price_per_kg REAL NOT NULL,
    density REAL NOT NULL,
    quantity_in_stock INTEGER DEFAULT 0,
    min_quantity INTEGER DEFAULT 0,
    cutting_speed REAL,
    pierce_time REAL,
    pierce_cost REAL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_material_stock_name_grade ON material_stock(name, grade);
CREATE INDEX IF NOT EXISTS idx_material_stock_thickness ON material_stock(thickness);

-- =====================================================
-- Machines
-- =====================================================
CREATE TABLE IF NOT EXISTS machines (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT UNIQUE NOT NULL,
    hourly_rate REAL NOT NULL,
    max_sheet_width REAL,
    max_sheet_length REAL,
    power_kw REAL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- Operations
-- =====================================================
CREATE TABLE IF NOT EXISTS operations (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT UNIQUE NOT NULL,
    cost_type TEXT NOT NULL CHECK(cost_type IN ('per_unit', 'per_area', 'per_length', 'per_count', 'time_based')),
    cost REAL NOT NULL,
    time_minutes REAL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- Clients
-- =====================================================
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY NOT NULL,
    company_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    business_no TEXT,
    billing_address_line1 TEXT,
    billing_address_line2 TEXT,
    billing_city TEXT,
    billing_state TEXT,
    billing_zip TEXT,
    billing_country TEXT,
    shipping_address_line1 TEXT,
    shipping_address_line2 TEXT,
    shipping_city TEXT,
    shipping_state TEXT,
    shipping_zip TEXT,
    shipping_country TEXT,
    additional_price_markup REAL DEFAULT 0,
    additional_material_markup REAL DEFAULT 0,
    quote_prefix TEXT DEFAULT 'Q',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients(company_name);

-- =====================================================
-- Client Contacts
-- =====================================================
CREATE TABLE IF NOT EXISTS client_contacts (
    id TEXT PRIMARY KEY NOT NULL,
    client_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    is_primary INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON client_contacts(client_id);

-- =====================================================
-- Quotes
-- =====================================================
CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY NOT NULL,
    quote_number TEXT UNIQUE NOT NULL,
    client_id TEXT,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    validity_days INTEGER DEFAULT 7,
    price_markup REAL DEFAULT 0,
    material_markup REAL DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    hidden_discount REAL DEFAULT 0,
    subtotal REAL DEFAULT 0,
    total REAL DEFAULT 0,
    notes TEXT,
    reference TEXT,
    data TEXT, -- JSON blob with full quote data
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);

-- =====================================================
-- Quote Counter (for auto-numbering)
-- =====================================================
CREATE TABLE IF NOT EXISTS quote_counter (
    prefix TEXT PRIMARY KEY NOT NULL,
    last_number INTEGER DEFAULT 0
);

-- =====================================================
-- Insert default settings
-- =====================================================
INSERT OR IGNORE INTO settings (key, value) VALUES
    ('default_price_markup', '45'),
    ('default_material_markup', '25'),
    ('default_tax_rate', '10'),
    ('minimum_order_amount', '100'),
    ('pricing_strategy', 'hybrid'),
    ('min_utilization_threshold', '75'),
    ('scrap_value_percent', '40'),
    ('default_validity_days', '7'),
    ('currency_symbol', '$'),
    ('currency_code', 'AUD');

-- =====================================================
-- Insert default machine
-- =====================================================
INSERT OR IGNORE INTO machines (id, name, hourly_rate, max_sheet_width, max_sheet_length, power_kw) VALUES
    ('default_laser', 'Laser Cutter 1', 75.0, 1500, 6000, 4000);

-- =====================================================
-- Insert default operations
-- =====================================================
INSERT OR IGNORE INTO operations (id, name, cost_type, cost, description) VALUES
    ('op_bending', 'Bending', 'per_unit', 2.50, 'Metal bending per bend'),
    ('op_deburring', 'Deburring', 'per_unit', 1.00, 'Edge deburring per part'),
    ('op_drilling', 'Drilling', 'per_count', 0.50, 'Per hole drilled'),
    ('op_welding', 'Welding', 'per_unit', 15.00, 'Per weld joint'),
    ('op_painting', 'Painting', 'per_area', 5.00, 'Per square meter'),
    ('op_spot_welding', 'Spot Welding', 'per_count', 1.00, 'Per spot'),
    ('op_packaging', 'Packaging', 'per_unit', 5.00, 'Per order packaging'),
    ('op_assembly', 'Assembly', 'time_based', 0, 'Time-based assembly');

-- Update time_minutes for time-based operations
UPDATE operations SET time_minutes = 30 WHERE id = 'op_assembly';

-- =====================================================
-- Insert sample materials
-- =====================================================
INSERT OR IGNORE INTO material_stock (id, name, grade, thickness, sheet_width, sheet_max_length, price_per_kg, density, cutting_speed, pierce_time, pierce_cost, quantity_in_stock, min_quantity) VALUES
    ('ss304_0.9', 'Stainless Steel', '304', 0.9, 1500, 6000, 5.50, 8000, 3000, 0.5, 0.15, 100, 10),
    ('ss304_1.2', 'Stainless Steel', '304', 1.2, 1500, 6000, 5.50, 8000, 2500, 0.6, 0.18, 80, 10),
    ('ss304_1.5', 'Stainless Steel', '304', 1.5, 1500, 6000, 5.50, 8000, 2000, 0.7, 0.20, 60, 10),
    ('ss304_2.0', 'Stainless Steel', '304', 2.0, 1500, 6000, 5.50, 8000, 1500, 0.8, 0.25, 50, 10),
    ('ss304_3.0', 'Stainless Steel', '304', 3.0, 1500, 6000, 5.50, 8000, 1000, 1.0, 0.35, 40, 10),
    ('ms_1.6', 'Mild Steel', 'A36', 1.6, 1500, 6000, 2.50, 7850, 3500, 0.4, 0.10, 120, 20),
    ('ms_2.0', 'Mild Steel', 'A36', 2.0, 1500, 6000, 2.50, 7850, 3000, 0.5, 0.12, 100, 20),
    ('ms_3.0', 'Mild Steel', 'A36', 3.0, 1500, 6000, 2.50, 7850, 2000, 0.7, 0.18, 80, 15),
    ('al_1.0', 'Aluminum', '5052', 1.0, 1500, 6000, 8.00, 2700, 4000, 0.3, 0.12, 50, 10),
    ('al_2.0', 'Aluminum', '5052', 2.0, 1500, 6000, 8.00, 2700, 3000, 0.4, 0.15, 40, 10);

-- =====================================================
-- Insert sample client (CASH SALES)
-- =====================================================
INSERT OR IGNORE INTO clients (id, company_name, phone, email, quote_prefix) VALUES
    ('cash_sales', 'CASH SALES', '', '', 'CS');
