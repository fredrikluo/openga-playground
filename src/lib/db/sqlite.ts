import BetterSqlite3 from 'better-sqlite3';
import type { Database } from './types';
import { SCHEMA_SQL, SQLITE_EXTRA_SQL } from './schema';

export function createSqliteDatabase(path: string): Database {
  const sqlite = new BetterSqlite3(path);

  // Initialize schema
  sqlite.exec(SCHEMA_SQL);
  sqlite.exec(SQLITE_EXTRA_SQL);

  const db: Database = {
    async getOne<T>(sql: string, ...params: unknown[]): Promise<T | undefined> {
      return sqlite.prepare(sql).get(...params) as T | undefined;
    },

    async getAll<T>(sql: string, ...params: unknown[]): Promise<T[]> {
      return sqlite.prepare(sql).all(...params) as T[];
    },

    async run(sql: string, ...params: unknown[]): Promise<{ changes: number }> {
      const info = sqlite.prepare(sql).run(...params);
      return { changes: info.changes };
    },

    async exec(sql: string): Promise<void> {
      sqlite.exec(sql);
    },

    async transaction<T>(fn: (txDb: Database) => Promise<T>): Promise<T> {
      // better-sqlite3 doesn't allow async transaction callbacks.
      // Since all SQLite adapter methods are synchronous under the hood,
      // we use manual BEGIN/COMMIT/ROLLBACK instead.
      sqlite.exec('BEGIN');
      try {
        const result = await fn(db);
        sqlite.exec('COMMIT');
        return result;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };

  return db;
}
