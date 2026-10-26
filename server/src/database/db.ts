/**
 * db.ts — LibSQL/Turso adapter
 *
 * Provides a thin async wrapper over @libsql/client that mimics
 * the better-sqlite3 `.prepare(sql).get/all/run/exec` surface.
 * 
 * Usage: const db = getDb(); then await db.get(sql, params), etc.
 */

import { createClient, type Client } from '@libsql/client';

let client: Client | null = null;

export function getDb(): AsyncDb {
  if (!client) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return new AsyncDb(client);
}

export async function initializeDatabase(): Promise<void> {
  if (client) return;

  // In serverless (Vercel), TURSO_DATABASE_URL must be set.
  // In local dev, fall back to a local file.
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url && url.startsWith('libsql://')) {
    client = createClient({ url, authToken: authToken! });
  } else if (url && (url.startsWith('file:') || url.startsWith('./') || url.startsWith('/'))) {
    // Local file-based SQLite (development)
    client = createClient({ url: url.startsWith('file:') ? url : `file:${url}` });
  } else {
    // Default local dev database
    client = createClient({ url: 'file:./data/mytasker.db' });
  }

  await createTables();

  // Auto-seed on fresh DB
  try {
    const result = await client.execute('SELECT COUNT(*) as c FROM users');
    const count = Number((result.rows[0] as any)?.c ?? 0);
    if (count === 0) {
      const { seedDatabase } = await import('./seed');
      await seedDatabase(false);
    }
  } catch (err) {
    console.warn('Auto-seed check note:', err);
  }
}

async function createTables(): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar TEXT,
      timezone TEXT DEFAULT 'UTC',
      notification_settings TEXT DEFAULT '{"taskReminders":true,"dueDateReminders":true,"overdueNotifications":true,"recurringReminders":true,"quietHoursEnabled":false,"quietHoursStart":"22:00","quietHoursEnd":"07:00"}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '📁',
      color TEXT NOT NULL DEFAULT '#6366f1',
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'not_started',
      priority TEXT NOT NULL DEFAULT 'medium',
      progress INTEGER NOT NULL DEFAULT 0,
      start_date TEXT,
      due_date TEXT,
      estimated_minutes INTEGER,
      actual_minutes INTEGER DEFAULT 0,
      completion_note TEXT,
      is_recurring INTEGER DEFAULT 0,
      recurrence_pattern TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      archived_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS time_entries (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_minutes REAL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reminder_time TEXT NOT NULL,
      label TEXT,
      is_triggered INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS task_activity (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id)`,
    `CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id)`,
    `CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries(task_id)`,
    `CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_reminders_triggered ON reminders(is_triggered)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)`,
    `CREATE INDEX IF NOT EXISTS idx_task_activity_task_id ON task_activity(task_id)`,
    `CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)`,
  ];

  for (const sql of statements) {
    await client!.execute(sql);
  }
}

/**
 * AsyncDb — async wrapper with a .prepare() interface for compatibility.
 * Routes call: const db = getDb(); await db.get(sql, args), etc.
 */
export class AsyncDb {
  constructor(private c: Client) {}

  /** Execute a query returning the first row, or null */
  async get<T = any>(sql: string, ...args: any[]): Promise<T | null> {
    const params = flatArgs(args);
    const result = await this.c.execute({ sql, args: params });
    if (result.rows.length === 0) return null;
    return rowToObject(result.rows[0], result.columns) as T;
  }

  /** Execute a query returning all rows */
  async all<T = any>(sql: string, ...args: any[]): Promise<T[]> {
    const params = flatArgs(args);
    const result = await this.c.execute({ sql, args: params });
    return result.rows.map(row => rowToObject(row, result.columns)) as T[];
  }

  /** Execute an INSERT/UPDATE/DELETE */
  async run(sql: string, ...args: any[]): Promise<void> {
    const params = flatArgs(args);
    await this.c.execute({ sql, args: params });
  }

  /** Execute multiple statements (DDL) */
  async exec(sql: string): Promise<void> {
    const stmts = sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of stmts) {
      await this.c.execute(stmt);
    }
  }

  /**
   * Compatibility shim: db.prepare(sql).get/all/run/exec(args)
   * Returns a PreparedStatement-like object.
   */
  prepare(sql: string): PreparedStatement {
    return new PreparedStatement(this.c, sql);
  }
}

class PreparedStatement {
  constructor(private c: Client, private sql: string) {}

  async get<T = any>(...args: any[]): Promise<T | null> {
    const params = flatArgs(args);
    const result = await this.c.execute({ sql: this.sql, args: params });
    if (result.rows.length === 0) return null;
    return rowToObject(result.rows[0], result.columns) as T;
  }

  async all<T = any>(...args: any[]): Promise<T[]> {
    const params = flatArgs(args);
    const result = await this.c.execute({ sql: this.sql, args: params });
    return result.rows.map(row => rowToObject(row, result.columns)) as T[];
  }

  async run(...args: any[]): Promise<void> {
    const params = flatArgs(args);
    await this.c.execute({ sql: this.sql, args: params });
  }
}

function flatArgs(args: any[]): any[] {
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return args;
}

function rowToObject(row: any, columns: readonly string[]): Record<string, any> {
  const obj: Record<string, any> = {};
  for (let i = 0; i < columns.length; i++) {
    let val = row[i];
    // Convert BigInt to number
    if (typeof val === 'bigint') val = Number(val);
    obj[columns[i]] = val;
  }
  return obj;
}
