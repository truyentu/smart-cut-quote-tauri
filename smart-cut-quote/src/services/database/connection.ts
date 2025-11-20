/**
 * Database Connection Manager
 * Handles SQLite database connection via tauri-plugin-sql
 */

import Database from '@tauri-apps/plugin-sql';

const DB_NAME = 'sqlite:smart_cut_quote.db';

let dbInstance: Database | null = null;

/**
 * Get database instance (singleton)
 */
export async function getDatabase(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load(DB_NAME);
    console.log('Database connection established');
  }
  return dbInstance;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
    console.log('Database connection closed');
  }
}

/**
 * Execute a query that returns results (SELECT)
 */
export async function query<T>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDatabase();
  return db.select<T[]>(sql, params);
}

/**
 * Execute a query that modifies data (INSERT, UPDATE, DELETE)
 */
export async function execute(sql: string, params: any[] = []): Promise<{ lastInsertId: number; rowsAffected: number }> {
  const db = await getDatabase();
  const result = await db.execute(sql, params);
  return {
    lastInsertId: result.lastInsertId ?? 0,
    rowsAffected: result.rowsAffected,
  };
}

/**
 * Execute multiple queries in a transaction
 */
export async function transaction<T>(callback: (db: Database) => Promise<T>): Promise<T> {
  const db = await getDatabase();

  try {
    await db.execute('BEGIN TRANSACTION');
    const result = await callback(db);
    await db.execute('COMMIT');
    return result;
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}

export default {
  getDatabase,
  closeDatabase,
  query,
  execute,
  transaction,
};
