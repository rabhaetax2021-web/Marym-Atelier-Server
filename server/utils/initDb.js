import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMA_FILE = path.resolve(__dirname, '..', '..', 'supabase-schema.sql');

export default async function ensureSchema() {
  try {
    if (!fs.existsSync(SCHEMA_FILE)) {
      console.warn('Schema file not found:', SCHEMA_FILE);
      return;
    }
    const sql = fs.readFileSync(SCHEMA_FILE, 'utf8');
    if (!sql || !sql.trim()) {
      console.warn('Schema file is empty:', SCHEMA_FILE);
      return;
    }

    console.log('Applying DB schema from', SCHEMA_FILE);
    // Execute as a single multi-statement query. The SQL file uses IF NOT EXISTS semantics.
    await pool.query(sql);
    console.log('Database schema ensured.');
  } catch (err) {
    console.error('Failed to apply DB schema:', err.message || err);
    // Do not exit the process here; log and continue so server can start for debugging.
  }
}
