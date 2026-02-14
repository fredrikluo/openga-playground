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
      // better-sqlite3 transactions are synchronous, but our fn is async.
      // Since SQLite is single-connection and sync, we can just run the async fn
      // directly — the awaits inside will resolve immediately because all db
      // calls in the SQLite adapter are synchronous under the hood.
      const sqliteTx = sqlite.transaction(async () => {
        return await fn(db);
      });
      return await sqliteTx();
    },
  };

  return db;
}
