import db, { generateId } from './db';

function initDb() {
  db.exec(`
    DROP TABLE IF EXISTS kahoots;
    DROP TABLE IF EXISTS folders;
    DROP TABLE IF EXISTS group_users;
    DROP TABLE IF EXISTS groups;
    DROP TABLE IF EXISTS user_organizations;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS organizations;

    CREATE TABLE organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      root_folder_id TEXT
    );

    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      organization_id TEXT,
      role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'coadmin', 'member', 'limited member')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id)
    );

    CREATE TABLE groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      organization_id TEXT,
      FOREIGN KEY (organization_id) REFERENCES organizations(id)
    );

    CREATE TABLE group_users (
      group_id TEXT,
      user_id TEXT,
      PRIMARY KEY (group_id, user_id),
      FOREIGN KEY (group_id) REFERENCES groups(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE user_organizations (
      user_id TEXT NOT NULL,
      organization_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'coadmin', 'member', 'limited member')),
      PRIMARY KEY (user_id, organization_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    CREATE TABLE folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_folder_id TEXT,
      organization_id TEXT,
      FOREIGN KEY (parent_folder_id) REFERENCES folders(id),
      FOREIGN KEY (organization_id) REFERENCES organizations(id)
    );

    CREATE TABLE kahoots (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      folder_id TEXT NOT NULL,
      FOREIGN KEY (folder_id) REFERENCES folders(id)
    );
  `);

  console.log('Database initialized successfully.');

  try {
    const orgId = generateId();
    const rootFolderId = generateId();
    const userId = generateId();

    db.prepare('INSERT INTO organizations (id, name) VALUES (?, ?)').run(orgId, 'Default Organization');
    db.prepare('INSERT INTO folders (id, name, organization_id) VALUES (?, ?, ?)').run(rootFolderId, 'Default Root Folder', orgId);
    db.prepare('UPDATE organizations SET root_folder_id = ? WHERE id = ?').run(rootFolderId, orgId);
    db.prepare('INSERT INTO users (id, name, email, organization_id, role) VALUES (?, ?, ?, ?, ?)').run(userId, 'Default User', 'user@example.com', orgId, 'admin');

    console.log('Default data created successfully.');
  } catch (e) {
    const error = e as { code?: string };
    if (error.code !== 'SQLITE_CONSTRAINT_UNIQUE') {
      console.error('Failed to create default data:', e);
    }
  }
}

try {
  initDb();
} catch (e) {
  console.error('Failed to initialize the database:', e);
}
