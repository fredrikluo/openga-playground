import Database from 'better-sqlite3';
import crypto from 'crypto';

const db = new Database(process.env.DATABASE_PATH || 'kahoot.db');

export function generateId(): string {
  return crypto.randomUUID();
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    organization_id TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'coadmin', 'member', 'limited member')),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    root_folder_id TEXT,
    FOREIGN KEY (root_folder_id) REFERENCES folders(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS group_users (
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES groups(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS user_organizations (
    user_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'coadmin', 'member', 'limited member')),
    PRIMARY KEY (user_id, organization_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_folder_id TEXT,
    organization_id TEXT,
    FOREIGN KEY (parent_folder_id) REFERENCES folders(id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
  );
`);

// Create unique index to ensure folder names are unique within the same parent folder
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_folder_name_per_parent
  ON folders(name, parent_folder_id, organization_id);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS kahoots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    folder_id TEXT NOT NULL,
    FOREIGN KEY (folder_id) REFERENCES folders(id)
  );
`);

export function getOne<T>(sql: string, ...params: unknown[]): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}

export function getAll<T>(sql: string, ...params: unknown[]): T[] {
  return db.prepare(sql).all(...params) as T[];
}

export default db;
