import db from './db';

export async function migrateToMultiOrg() {
  console.log('Starting migration to multi-organization support...');

  const result = await db.transaction(async () => {
    const existingCount = await db.getOne<{ count: number }>('SELECT COUNT(*) as count FROM user_organizations');

    if (existingCount && existingCount.count > 0) {
      console.log('Migration already completed - user_organizations table has data');
      return { alreadyMigrated: true as const };
    }

    console.log('Migrating user-organization relationships...');
    await db.run(`
      INSERT INTO user_organizations (user_id, organization_id, role)
      SELECT id, organization_id, role
      FROM users
      WHERE organization_id IS NOT NULL
    `);

    const migratedCount = await db.getOne<{ count: number }>('SELECT COUNT(*) as count FROM user_organizations');
    console.log(`Migrated ${migratedCount?.count ?? 0} user-organization relationships`);

    console.log('Restructuring users table...');
    await db.exec(`
      CREATE TABLE users_new (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE
      )
    `);

    await db.run(`
      INSERT INTO users_new (id, name, email)
      SELECT id, name, email FROM users
    `);

    await db.exec('DROP TABLE users');
    await db.exec('ALTER TABLE users_new RENAME TO users');

    console.log('Users table restructured successfully');

    return { alreadyMigrated: false as const, migratedCount: migratedCount?.count ?? 0 };
  });

  if (result.alreadyMigrated) {
    console.log('Migration status: Already completed');
  } else {
    console.log(`Migration completed successfully! Migrated ${result.migratedCount} relationships`);
  }

  return result;
}
