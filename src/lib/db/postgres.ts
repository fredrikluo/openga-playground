import { Pool, PoolClient } from 'pg';
import type { Database } from './types';
import { SCHEMA_STATEMENTS } from './schema';

function createDbFromClient(client: PoolClient): Database {
  return {
    async getOne<T>(sql: string, ...params: unknown[]): Promise<T | undefined> {
      const result = await client.query(sql, params);
      return result.rows[0] as T | undefined;
    },

    async getAll<T>(sql: string, ...params: unknown[]): Promise<T[]> {
      const result = await client.query(sql, params);
      return result.rows as T[];
    },

    async run(sql: string, ...params: unknown[]): Promise<{ changes: number }> {
      const result = await client.query(sql, params);
      return { changes: result.rowCount ?? 0 };
    },

    async exec(sql: string): Promise<void> {
      await client.query(sql);
    },

    async transaction<T>(fn: (txDb: Database) => Promise<T>): Promise<T> {
      return await fn(createDbFromClient(client));
    },
  };
}

async function initSchema(pool: Pool) {
  for (const stmt of SCHEMA_STATEMENTS) {
    await pool.query(stmt);
  }
}

export function createPostgresDatabase(connectionString: string): Database {
  const pool = new Pool({ connectionString });

  // Schema init runs once; all queries wait for it to complete
  const ready = initSchema(pool).catch(err => {
    console.error('Postgres schema init error:', err);
  });

  const db: Database = {
    async getOne<T>(sql: string, ...params: unknown[]): Promise<T | undefined> {
      await ready;
      const result = await pool.query(sql, params);
      return result.rows[0] as T | undefined;
    },

    async getAll<T>(sql: string, ...params: unknown[]): Promise<T[]> {
      await ready;
      const result = await pool.query(sql, params);
      return result.rows as T[];
    },

    async run(sql: string, ...params: unknown[]): Promise<{ changes: number }> {
      await ready;
      const result = await pool.query(sql, params);
      return { changes: result.rowCount ?? 0 };
    },

    async exec(sql: string): Promise<void> {
      await ready;
      await pool.query(sql);
    },

    async transaction<T>(fn: (txDb: Database) => Promise<T>): Promise<T> {
      await ready;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(createDbFromClient(client));
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };

  return db;
}
