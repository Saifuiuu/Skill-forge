import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { buildDatabaseOptions } from './database.config';

dotenv.config({ path: join(__dirname, '../../.env') });

async function setupDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set in backend/.env');
  }

  const parsed = new URL(databaseUrl);
  console.log(`Target: ${parsed.hostname} / database "${parsed.pathname.replace('/', '')}"`);

  const dataSource = new DataSource({
    ...buildDatabaseOptions(databaseUrl, { runMigrations: false }),
    synchronize: false,
  });

  console.log('Connecting to database...');
  await dataSource.initialize();
  console.log('Synchronizing schema...');
  await dataSource.synchronize();
  console.log('Schema synchronized — all tables created/updated.');

  const tables = await dataSource.query<{ tablename: string }[]>(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);

  console.log('\nTables in public schema:');
  for (const row of tables) {
    console.log(`  - ${row.tablename}`);
  }

  await dataSource.destroy();
}

setupDatabase().catch((err) => {
  console.error('Database setup failed:', err);
  process.exit(1);
});
