// CREATE TABLE statements in dependency order.
export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    root_folder_id TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    organization_id TEXT,
    role TEXT NOT NULL DEFAULT 'member',
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
  )`,

  `CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_folder_id TEXT,
    organization_id TEXT,
    creator_id TEXT,
    FOREIGN KEY (parent_folder_id) REFERENCES folders(id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (creator_id) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
  )`,

  `CREATE TABLE IF NOT EXISTS group_users (
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES groups(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  `CREATE TABLE IF NOT EXISTS user_organizations (
    user_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    PRIMARY KEY (user_id, organization_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS kahoots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    folder_id TEXT NOT NULL,
    creator_id TEXT,
    FOREIGN KEY (folder_id) REFERENCES folders(id),
    FOREIGN KEY (creator_id) REFERENCES users(id)
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_folder_name_per_parent
   ON folders(name, COALESCE(parent_folder_id, ''), COALESCE(organization_id, ''))`,
];

// Migrations run after table creation. Each has a unique key and an idempotent SQL statement.
// New migrations should be appended to the end — never modify or remove existing ones.
export const MIGRATIONS: { key: string; sql: string }[] = [
  {
    key: '001_add_creator_id_to_folders',
    sql: `ALTER TABLE folders ADD COLUMN IF NOT EXISTS creator_id TEXT REFERENCES users(id)`,
  },
  {
    key: '002_add_creator_id_to_kahoots',
    sql: `ALTER TABLE kahoots ADD COLUMN IF NOT EXISTS creator_id TEXT REFERENCES users(id)`,
  },
];
