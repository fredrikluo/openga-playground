import crypto from 'crypto';
import { createPostgresDatabase } from './postgres';

export type { Database } from './types';

export function generateId(): string {
  return crypto.randomUUID();
}

const connectionString = process.env.DATABASE_URL || 'postgres://openfga:openfga@localhost:5432/kahoot';
const db = createPostgresDatabase(connectionString);

export default db;
