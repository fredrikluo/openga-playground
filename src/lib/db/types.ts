export interface Database {
  getOne<T>(sql: string, ...params: unknown[]): Promise<T | undefined>;
  getAll<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  run(sql: string, ...params: unknown[]): Promise<{ changes: number }>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (db: Database) => Promise<T>): Promise<T>;
}
