import crypto from 'crypto';
import type { Database } from './types';

export type { Database } from './types';

export function generateId(): string {
  return crypto.randomUUID();
}

let _db: Database | null = null;

function createDatabase(): Database {
  const engine = process.env.DATABASE_ENGINE || 'sqlite';

  if (engine === 'postgres') {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required when DATABASE_ENGINE=postgres');
    }
    // Dynamic require: pg is only loaded when actually using postgres
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createPostgresDatabase } = require('./postgres');
    return createPostgresDatabase(connectionString);
  }

  // Dynamic require: better-sqlite3 is only loaded when actually using sqlite
  const dbPath = process.env.DATABASE_PATH || 'kahoot.db';
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createSqliteDatabase } = require('./sqlite');
  return createSqliteDatabase(dbPath);
}

export function getDb(): Database {
  if (!_db) {
    _db = createDatabase();
  }
  return _db;
}

const db = getDb();
export default db;
