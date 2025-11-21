-- Migration: Add cut_price_per_meter to material_stock table
-- Purpose: Support length-based cutting cost calculation
-- Date: 2025-11-20

-- Add new column for price per meter
ALTER TABLE material_stock ADD COLUMN cut_price_per_meter REAL DEFAULT 0;

-- Update existing materials with sample values
-- Formula suggestion: cut_price_per_meter ≈ (hourly_rate / cutting_speed) * 60
-- For example: if hourly_rate = $75 and cutting_speed = 3000 mm/min
-- cut_price_per_meter = (75 / 3000) * 60 * 1000 = $1.50/meter

-- Stainless Steel 304 (cutting_speed = 3000, 2500, 2000, 1500, 1000)
UPDATE material_stock SET cut_price_per_meter = 1.50 WHERE id = 'ss304_0.9';
UPDATE material_stock SET cut_price_per_meter = 1.80 WHERE id = 'ss304_1.2';
UPDATE material_stock SET cut_price_per_meter = 2.25 WHERE id = 'ss304_1.5';
UPDATE material_stock SET cut_price_per_meter = 3.00 WHERE id = 'ss304_2.0';
UPDATE material_stock SET cut_price_per_meter = 4.50 WHERE id = 'ss304_3.0';

-- Mild Steel (cutting_speed = 3500, 3000, 2000)
UPDATE material_stock SET cut_price_per_meter = 1.29 WHERE id = 'ms_1.6';
UPDATE material_stock SET cut_price_per_meter = 1.50 WHERE id = 'ms_2.0';
UPDATE material_stock SET cut_price_per_meter = 2.25 WHERE id = 'ms_3.0';

-- Aluminum (cutting_speed = 4000, 3000)
UPDATE material_stock SET cut_price_per_meter = 1.13 WHERE id = 'al_1.0';
UPDATE material_stock SET cut_price_per_meter = 1.50 WHERE id = 'al_2.0';

-- Add comment
-- Note: These values are estimated based on typical cutting speeds and hourly rates
-- Adjust according to actual machine performance and business requirements
