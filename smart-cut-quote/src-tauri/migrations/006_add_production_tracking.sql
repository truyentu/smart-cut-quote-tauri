-- Migration: Add Production Tracking and Soft Delete
-- Purpose: Track production workflow and enable data archiving
-- Created: 2025-01-20

-- Add production status tracking to quotes
ALTER TABLE quotes ADD COLUMN production_status TEXT;
ALTER TABLE quotes ADD COLUMN production_started_at TEXT;
ALTER TABLE quotes ADD COLUMN production_completed_at TEXT;

-- Add soft delete functionality
ALTER TABLE quotes ADD COLUMN deleted INTEGER DEFAULT 0;
ALTER TABLE quotes ADD COLUMN deleted_at TEXT;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_quotes_production_status
  ON quotes(production_status);

CREATE INDEX IF NOT EXISTS idx_quotes_status_production
  ON quotes(status, production_status);

CREATE INDEX IF NOT EXISTS idx_quotes_deleted
  ON quotes(deleted) WHERE deleted = 0;

-- Add index on client phone for customer analytics search
CREATE INDEX IF NOT EXISTS idx_clients_phone
  ON clients(phone);

-- Add composite index for active quotes query optimization
CREATE INDEX IF NOT EXISTS idx_quotes_active
  ON quotes(status, production_status, deleted, updated_at);
