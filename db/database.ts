import * as SQLite from 'expo-sqlite';
import { Config } from '../constants/config';

let db: SQLite.SQLiteDatabase | null = null;
let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Simple mutex to serialize all DB operations
let mutexQueue: Promise<any> = Promise.resolve();

/**
 * Serialize a database operation through a mutex queue.
 * This ensures only one native prepareAsync runs at a time,
 * preventing NullPointerException on Android.
 */
export function withDbMutex<T>(fn: () => Promise<T>): Promise<T> {
  const result = mutexQueue.then(fn, fn); // run fn even if previous rejected
  // Update queue — swallow errors so the queue itself never rejects permanently
  mutexQueue = result.then(() => {}, () => {});
  return result;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  // Prevent multiple simultaneous init calls
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    console.log('[DB] Opening database...');
    const database = await SQLite.openDatabaseAsync(Config.DB_NAME);
    console.log('[DB] Database opened, initializing tables...');
    await initDatabase(database);
    console.log('[DB] Database initialized successfully');
    db = database;
    return database;
  })();

  try {
    return await dbInitPromise;
  } catch (e) {
    dbInitPromise = null; // Allow retry on failure
    throw e;
  }
}

async function initDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      interval_minutes INTEGER NOT NULL DEFAULT 60,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY NOT NULL,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      youtube_link TEXT NOT NULL DEFAULT '',
      duration_seconds INTEGER NOT NULL DEFAULT 30,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_two_sided INTEGER NOT NULL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'time',
      reps INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      active_window_start TEXT NOT NULL DEFAULT '13:00',
      active_window_end TEXT NOT NULL DEFAULT '02:00',
      manual_toggle_state INTEGER NOT NULL DEFAULT 1,
      manual_toggle_timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS streaks (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      current_day_streak INTEGER NOT NULL DEFAULT 0,
      total_stretch_count INTEGER NOT NULL DEFAULT 0,
      last_completed_date TEXT,
      skipped_today INTEGER NOT NULL DEFAULT 0
    );

    INSERT OR IGNORE INTO settings (id) VALUES (1);
    INSERT OR IGNORE INTO streaks (id) VALUES (1);
  `);

  // Migration: add sort_order column to categories if it doesn't exist
  try {
    await database.runAsync('ALTER TABLE categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
    console.log('[DB] Migration: added sort_order column to categories');
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) {
      console.log('[DB] sort_order column already exists');
    }
  }

  // Migration: add type and reps columns to exercises
  try {
    await database.runAsync("ALTER TABLE exercises ADD COLUMN type TEXT NOT NULL DEFAULT 'time'");
    await database.runAsync("ALTER TABLE exercises ADD COLUMN reps INTEGER NOT NULL DEFAULT 0");
    console.log('[DB] Migration: added type and reps columns to exercises');
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) {
      console.log('[DB] exercises columns already exist or error:', e.message);
    }
  }

  // Migration: add is_two_sided column to exercises if it doesn't exist
  try {
    await database.runAsync('ALTER TABLE exercises ADD COLUMN is_two_sided INTEGER NOT NULL DEFAULT 0');
    console.log('[DB] Migration: added is_two_sided column to exercises');
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) {
      console.log('[DB] is_two_sided column already exists');
    }
  }

  // Migration: add last_completed_at column to categories
  try {
    await database.runAsync('ALTER TABLE categories ADD COLUMN last_completed_at TEXT');
    console.log('[DB] Migration: added last_completed_at column to categories');
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) {
      console.log('[DB] last_completed_at column already exists');
    }
  }
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
    dbInitPromise = null;
  }
}
