/* eslint-disable no-undef */
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const connectionString = process.env.marymatelier_POSTGRES_URL_NON_POOLING || process.env.marymatelier_POSTGRES_URL || process.env.marymatelier_POSTGRES_PRISMA_URL;
if (!connectionString) {
  console.error('Missing Postgres connection string. Set marymatelier_POSTGRES_URL_NON_POOLING or another compatible env variable.');
  process.exit(1);
}

const sqlPath = path.resolve(process.cwd(), 'supabase-schema.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const sanitizedConnectionString = connectionString.replace(/(\?|&)sslmode=require(\b|&|$)/, '$1').replace(/\?&/, '?').replace(/&$/, '');
const client = new Client({ connectionString: sanitizedConnectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log('Connected to Supabase Postgres. Running schema creation...');
  const result = await client.query(sql);
  console.log('Schema creation completed.');
  if (result.command) console.log(`Last command: ${result.command}`);
} catch (error) {
  console.error('Failed to initialize Supabase schema:', error.message || error);
  process.exit(1);
} finally {
  await client.end();
}
