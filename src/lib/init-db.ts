import db from './db';

function initDb() {
  db.exec(`
    DROP TABLE IF EXISTS kahoots;
    DROP TABLE IF EXISTS folders;
    DROP TABLE IF EXISTS group_users;
    DROP TABLE IF EXISTS groups;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS organizations;

    CREATE TABLE organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      root_folder_id INTEGER
    );

    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      organization_id INTEGER,
      FOREIGN KEY (organization_id) REFERENCES organizations(id)
    );

    CREATE TABLE groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      organization_id INTEGER,
      FOREIGN KEY (organization_id) REFERENCES organizations(id)
    );

    CREATE TABLE group_users (
      group_id INTEGER,
      user_id INTEGER,
      PRIMARY KEY (group_id, user_id),
      FOREIGN KEY (group_id) REFERENCES groups(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_folder_id INTEGER,
      organization_id INTEGER,
      FOREIGN KEY (parent_folder_id) REFERENCES folders(id),
      FOREIGN KEY (organization_id) REFERENCES organizations(id)
    );

    CREATE TABLE kahoots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      folder_id INTEGER NOT NULL,
      FOREIGN KEY (folder_id) REFERENCES folders(id)
    );

    ALTER TABLE organizations ADD FOREIGN KEY (root_folder_id) REFERENCES folders(id);
  `);

  console.log('Database initialized successfully.');
}

try {
  initDb();
} catch (e) {
  console.error('Failed to initialize the database:', e);
}