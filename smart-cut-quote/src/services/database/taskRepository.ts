/**
 * Task Repository
 * Database operations for tasks management
 */

import { query, execute } from './connection';
import { Task, CreateTaskInput, UpdateTaskInput, TaskStats, TaskStatus, TaskPriority } from '../../types/task';

// Database row type
interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  quote_id: string | null;
  client_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  assigned_to: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Transform database row to Task object
function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    category: row.category as any,
    priority: row.priority as any,
    status: row.status as any,
    quoteId: row.quote_id || undefined,
    clientId: row.client_id || undefined,
    dueDate: row.due_date ? new Date(row.due_date) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    assignedTo: row.assigned_to,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Create a new task
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const sql = `
    INSERT INTO tasks (
      id, title, description, category, priority,
      quote_id, client_id, due_date, assigned_to, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    taskId,
    input.title,
    input.description || null,
    input.category || 'general',
    input.priority || 'normal',
    input.quoteId || null,
    input.clientId || null,
    input.dueDate ? input.dueDate.toISOString() : null,
    input.assignedTo || 'ADMIN',
    'ADMIN', // created_by
  ];

  await execute(sql, params);

  // Fetch the created task
  const task = await getTaskById(taskId);
  if (!task) {
    throw new Error('Failed to create task');
  }

  return task;
}

/**
 * Get task by ID
 */
export async function getTaskById(taskId: string): Promise<Task | null> {
  const sql = `SELECT * FROM tasks WHERE id = ?`;

  const result = await query<TaskRow>(sql, [taskId]);

  if (result.length === 0) {
    return null;
  }

  return rowToTask(result[0]);
}

/**
 * Get all tasks (with optional filters)
 */
export async function getAllTasks(filters?: {
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  quoteId?: string;
  clientId?: string;
}): Promise<Task[]> {
  let sql = `SELECT * FROM tasks WHERE 1=1`;
  const params: any[] = [];

  if (filters?.status) {
    sql += ` AND status = ?`;
    params.push(filters.status);
  }

  if (filters?.priority) {
    sql += ` AND priority = ?`;
    params.push(filters.priority);
  }

  if (filters?.category) {
    sql += ` AND category = ?`;
    params.push(filters.category);
  }

  if (filters?.quoteId) {
    sql += ` AND quote_id = ?`;
    params.push(filters.quoteId);
  }

  if (filters?.clientId) {
    sql += ` AND client_id = ?`;
    params.push(filters.clientId);
  }

  sql += ` ORDER BY
    CASE priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    due_date ASC,
    created_at DESC
  `;

  const result = await query<TaskRow>(sql, params);

  return result.map(rowToTask);
}

/**
 * Get pending tasks (not completed or cancelled)
 */
export async function getPendingTasks(): Promise<Task[]> {
  return getAllTasks({ status: 'pending' });
}

/**
 * Get overdue tasks
 */
export async function getOverdueTasks(): Promise<Task[]> {
  const sql = `
    SELECT * FROM tasks
    WHERE status = 'pending'
      AND due_date IS NOT NULL
      AND due_date < datetime('now')
    ORDER BY due_date ASC
  `;

  const result = await query<TaskRow>(sql, []);

  return result.map(rowToTask);
}

/**
 * Get tasks due today
 */
export async function getTasksDueToday(): Promise<Task[]> {
  const sql = `
    SELECT * FROM tasks
    WHERE status = 'pending'
      AND due_date IS NOT NULL
      AND date(due_date) = date('now')
    ORDER BY priority ASC
  `;

  const result = await query<TaskRow>(sql, []);

  return result.map(rowToTask);
}

/**
 * Update a task
 */
export async function updateTask(taskId: string, updates: UpdateTaskInput): Promise<Task> {
  const setClauses: string[] = [];
  const params: any[] = [];

  if (updates.title !== undefined) {
    setClauses.push('title = ?');
    params.push(updates.title);
  }

  if (updates.description !== undefined) {
    setClauses.push('description = ?');
    params.push(updates.description || null);
  }

  if (updates.category !== undefined) {
    setClauses.push('category = ?');
    params.push(updates.category);
  }

  if (updates.priority !== undefined) {
    setClauses.push('priority = ?');
    params.push(updates.priority);
  }

  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    params.push(updates.status);

    // Auto-set completed_at when status changes to completed
    if (updates.status === 'completed') {
      setClauses.push('completed_at = datetime("now")');
    }
  }

  if (updates.dueDate !== undefined) {
    setClauses.push('due_date = ?');
    params.push(updates.dueDate ? updates.dueDate.toISOString() : null);
  }

  if (updates.assignedTo !== undefined) {
    setClauses.push('assigned_to = ?');
    params.push(updates.assignedTo);
  }

  if (setClauses.length === 0) {
    throw new Error('No updates provided');
  }

  params.push(taskId);

  const sql = `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`;

  await execute(sql, params);

  const task = await getTaskById(taskId);
  if (!task) {
    throw new Error('Task not found after update');
  }

  return task;
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<void> {
  const sql = `DELETE FROM tasks WHERE id = ?`;

  await execute(sql, [taskId]);
}

/**
 * Mark task as completed
 */
export async function completeTask(taskId: string): Promise<Task> {
  return updateTask(taskId, { status: 'completed' });
}

/**
 * Get task statistics
 */
export async function getTaskStats(): Promise<TaskStats> {
  const sql = `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE
        WHEN status = 'pending' AND due_date IS NOT NULL AND due_date < datetime('now')
        THEN 1 ELSE 0
      END) as overdue
    FROM tasks
  `;

  const result = await query<any>(sql, []);

  if (result.length === 0) {
    return { total: 0, urgent: 0, pending: 0, completed: 0, overdue: 0 };
  }

  return {
    total: result[0].total || 0,
    urgent: result[0].urgent || 0,
    pending: result[0].pending || 0,
    completed: result[0].completed || 0,
    overdue: result[0].overdue || 0,
  };
}

/**
 * Get tasks by quote ID
 */
export async function getTasksByQuoteId(quoteId: string): Promise<Task[]> {
  return getAllTasks({ quoteId });
}

/**
 * Get tasks by client ID
 */
export async function getTasksByClientId(clientId: string): Promise<Task[]> {
  return getAllTasks({ clientId });
}
