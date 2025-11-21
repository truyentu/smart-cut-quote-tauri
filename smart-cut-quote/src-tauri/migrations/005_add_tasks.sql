-- Migration: Add Tasks Table
-- Purpose: Store pending tasks for follow-ups, reminders, and workflow management
-- Created: 2025-01-20

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,

  -- Task categorization
  category TEXT NOT NULL DEFAULT 'general', -- 'follow_up', 'production', 'client_relation', 'system_maintenance', 'general'
  priority TEXT NOT NULL DEFAULT 'normal', -- 'urgent', 'high', 'normal', 'low'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'

  -- Relationships
  quote_id TEXT, -- Link to quote if task is quote-related
  client_id TEXT, -- Link to client if task is client-related

  -- Scheduling
  due_date TEXT, -- ISO datetime string
  completed_at TEXT, -- ISO datetime string when task was completed

  -- Assignment
  assigned_to TEXT DEFAULT 'ADMIN', -- User who should handle this task
  created_by TEXT NOT NULL DEFAULT 'ADMIN',

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_quote_id ON tasks(quote_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_tasks_timestamp
AFTER UPDATE ON tasks
FOR EACH ROW
BEGIN
  UPDATE tasks SET updated_at = datetime('now') WHERE id = NEW.id;
END;
