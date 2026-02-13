#!/usr/bin/env tsx

import { migrateToMultiOrg } from '../src/lib/migrate-to-multi-org';
import { exit } from 'process';

console.log('='.repeat(60));
console.log('MULTI-ORGANIZATION MIGRATION SCRIPT');
console.log('='.repeat(60));
console.log();

try {
  migrateToMultiOrg();
  console.log();
  console.log('✅ Migration completed successfully!');
  console.log();
  console.log('Next steps:');
  console.log('1. Restart your application');
  console.log('2. Verify that users can access their organizations');
  console.log('3. Test switching between organizations');
  console.log();
  exit(0);
} catch (error) {
  console.error();
  console.error('❌ Migration failed:');
  console.error(error);
  console.error();
  console.error('Rollback instructions:');
  console.error('1. Stop your application');
  console.error('2. Restore from backup: cp kahoot.db.backup kahoot.db');
  console.error('3. Restart your application');
  console.error();
  exit(1);
}
