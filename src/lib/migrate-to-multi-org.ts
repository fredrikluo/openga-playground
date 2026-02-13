import db from './db';

export function migrateToMultiOrg() {
  console.log('Starting migration to multi-organization support...');

  const migration = db.transaction(() => {
    // Step 1: Check if user_organizations table already has data
    const existingCount = db.prepare('SELECT COUNT(*) as count FROM user_organizations').get() as { count: number };

    if (existingCount.count > 0) {
      console.log('Migration already completed - user_organizations table has data');
      return { alreadyMigrated: true };
    }

    // Step 2: Migrate existing data from users table to user_organizations
    console.log('Migrating user-organization relationships...');
    db.prepare(`
      INSERT INTO user_organizations (user_id, organization_id, role)
      SELECT id, organization_id, role
      FROM users
      WHERE organization_id IS NOT NULL
    `).run();

    const migratedCount = db.prepare('SELECT COUNT(*) as count FROM user_organizations').get() as { count: number };
    console.log(`Migrated ${migratedCount.count} user-organization relationships`);

    // Step 3: Create temporary table without organization_id and role columns
    console.log('Restructuring users table...');
    db.prepare(`
      CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE
      )
    `).run();

    // Step 4: Copy user data to new table
    db.prepare(`
      INSERT INTO users_new (id, name, email)
      SELECT id, name, email FROM users
    `).run();

    // Step 5: Drop old users table
    db.prepare('DROP TABLE users').run();

    // Step 6: Rename new table to users
    db.prepare('ALTER TABLE users_new RENAME TO users').run();

    console.log('Users table restructured successfully');

    return { alreadyMigrated: false, migratedCount: migratedCount.count };
  });

  const result = migration();

  if (result.alreadyMigrated) {
    console.log('✅ Migration status: Already completed');
  } else {
    console.log(`✅ Migration completed successfully! Migrated ${result.migratedCount} relationships`);
  }

  return result;
}
