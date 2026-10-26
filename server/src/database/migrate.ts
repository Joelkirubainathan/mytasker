import dotenv from 'dotenv';
dotenv.config();

import { initializeDatabase } from './db';

async function migrate() {
  console.log('🔄 Running database migrations...');
  try {
    await initializeDatabase();
    console.log('✅ Migrations applied successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
