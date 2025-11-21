-- Migration 004: Add default nesting settings
-- Add nesting configuration to settings table

INSERT OR REPLACE INTO settings (key, value) VALUES
('nesting_strip_height', '6000'),
('nesting_part_spacing', '5'),
('nesting_time_limit', '60'),
('currency_symbol', 'VNĐ');
