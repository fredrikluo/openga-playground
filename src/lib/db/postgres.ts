import { Pool, PoolClient } from 'pg';
import type { Database } from './types';
import { SCHEMA_SQL, POSTGRES_EXTRA_SQL } from './schema';

/**
 * Convert `?` placeholders to `$1, $2, ...` for PostgreSQL.
 */
function convertParams(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function createDbFromClient(client: PoolClient): Database {
  return {
    async getOne<T>(sql: string, ...params: unknown[]): Promise<T | undefined> {
      const result = await client.query(convertParams(sql), params);
      return result.rows[0] as T | undefined;
    },

    async getAll<T>(sql: string, ...params: unknown[]): Promise<T[]> {
      const result = await client.query(convertParams(sql), params);
      return result.rows as T[];
    },

    async run(sql: string, ...params: unknown[]): Promise<{ changes: number }> {
      const result = await client.query(convertParams(sql), params);
      return { changes: result.rowCount ?? 0 };
    },

    async exec(sql: string): Promise<void> {
      await client.query(sql);
    },

    async transaction<T>(fn: (txDb: Database) => Promise<T>): Promise<T> {
      // Already inside a transaction on this client — just run the function
      return await fn(createDbFromClient(client));
    },
  };
}

export function createPostgresDatabase(connectionString: string): Database {
  const pool = new Pool({ connectionString });

  // Initialize schema on startup
  pool.query(SCHEMA_SQL).catch(err => console.error('Postgres schema init error:', err));
  pool.query(POSTGRES_EXTRA_SQL).catch(err => console.error('Postgres index init error:', err));

  const db: Database = {
    async getOne<T>(sql: string, ...params: unknown[]): Promise<T | undefined> {
      const result = await pool.query(convertParams(sql), params);
      return result.rows[0] as T | undefined;
    },

    async getAll<T>(sql: string, ...params: unknown[]): Promise<T[]> {
      const result = await pool.query(convertParams(sql), params);
      return result.rows as T[];
    },

    async run(sql: string, ...params: unknown[]): Promise<{ changes: number }> {
      const result = await pool.query(convertParams(sql), params);
      return { changes: result.rowCount ?? 0 };
    },

    async exec(sql: string): Promise<void> {
      await pool.query(sql);
    },

    async transaction<T>(fn: (txDb: Database) => Promise<T>): Promise<T> {
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
