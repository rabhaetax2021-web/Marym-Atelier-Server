/* eslint-disable no-undef */
import { Client } from 'pg';

const connectionString = process.env.marymatelier_POSTGRES_URL_NON_POOLING || process.env.marymatelier_POSTGRES_URL || process.env.marymatelier_POSTGRES_PRISMA_URL;
if (!connectionString) {
  console.error('Missing Postgres connection string. Set marymatelier_POSTGRES_URL_NON_POOLING or another compatible env variable.');
  process.exit(1);
}

const sanitizedConnectionString = connectionString.replace(/(\?|&)sslmode=require(\b|&|$)/, '$1').replace(/\?&/, '?').replace(/&$/, '');
const client = new Client({ connectionString: sanitizedConnectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log('Connected to Supabase Postgres. Adding featured column...');
  
  await client.query('ALTER TABLE dresses ADD COLUMN IF NOT EXISTS "featured" boolean NOT NULL DEFAULT false;');
  
  console.log('Featured column added successfully.');
} catch (error) {
  console.error('Failed to add featured column:', error.message || error);
  process.exit(1);
} finally {
  await client.end();
}
