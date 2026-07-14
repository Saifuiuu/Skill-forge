import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { buildDatabaseOptions } from './database.config';

dotenv.config({ path: join(__dirname, '../../.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set in .env');
}

export default new DataSource(buildDatabaseOptions(databaseUrl));
