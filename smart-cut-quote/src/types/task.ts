/**
 * Task Type Definitions
 * For managing pending tasks, follow-ups, and reminders
 */

export type TaskCategory =
  | 'follow_up'           // Quote follow-ups
  | 'production'          // Production-related tasks
  | 'client_relation'     // Client relationship management
  | 'system_maintenance'  // System maintenance tasks
  | 'general';            // General tasks

export type TaskPriority =
  | 'urgent'   // 🔴 Due today or overdue
  | 'high'     // 🟡 Due this week
  | 'normal'   // 🟢 Future tasks
  | 'low';     // 🔵 Nice to have

export type TaskStatus =
  | 'pending'      // Not started
  | 'in_progress'  // Currently working on
  | 'completed'    // Done
  | 'cancelled';   // Cancelled/no longer needed

export interface Task {
  id: string;
  title: string;
  description?: string;

  // Categorization
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;

  // Relationships
  quoteId?: string;      // Link to quote
  quoteNumber?: string;  // For display (denormalized)
  clientId?: string;     // Link to client
  clientName?: string;   // For display (denormalized)
  company?: string;      // For display (denormalized)

  // Scheduling
  dueDate?: Date;
  completedAt?: Date;

  // Assignment
  assignedTo: string;
  createdBy: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  category?: TaskCategory;
  priority?: TaskPriority;
  quoteId?: string;
  clientId?: string;
  dueDate?: Date;
  assignedTo?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  category?: TaskCategory;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: Date;
  assignedTo?: string;
}

// Task statistics for dashboard
export interface TaskStats {
  total: number;
  urgent: number;
  pending: number;
  completed: number;
  overdue: number;
}
