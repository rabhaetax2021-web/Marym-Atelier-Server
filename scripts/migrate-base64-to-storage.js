#!/usr/bin/env node
/**
 * Comprehensive migration tool
 * - Scans DB for columns with names like '%image%' and types text/json/jsonb
 * - Detects Base64 data URLs (data:...;base64,...) in those columns
 * - Uploads images to Supabase Storage bucket
 * - Replaces Base64 data with public URLs
 * - Logs progress and is resumable via `image_migrations` table
 *
 * Required env vars:
 *  - DATABASE_URL (Postgres connection string) or POSTGRES_URL
 *  - SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 *  - BUCKET (optional, default 'dresses')
 *  - DRY_RUN=1 to only simulate
 *
 * Usage:
 *   node scripts/migrate-base64-to-storage.js
 *
 */

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.marymatelier_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.marymatelier_SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.BUCKET || 'dresses';
const DRY_RUN = !!process.env.DRY_RUN;
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 100);

if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL or POSTGRES_URL');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('This script requires Supabase Storage service role key to upload files.');
  process.exit(1);
}

const logDir = path.resolve(process.cwd(), 'scripts', 'migrate-logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const logFile = path.join(logDir, `migrate-all-${Date.now()}.log`);
const writeLog = (msg) => fs.appendFileSync(logFile, `${new Date().toISOString()} ${msg}\n`);

// Allow opt-in insecure TLS for environments with self-signed certs.
const pgConfig = { connectionString: DATABASE_URL };
if (process.env.ALLOW_INSECURE_TLS === '1') {
  console.warn('WARNING: ALLOW_INSECURE_TLS=1 — TLS certificate validation is disabled for Postgres connection');
  pgConfig.ssl = { rejectUnauthorized: false };
}
const pg = new Client(pgConfig);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

function isDataUrl(str) {
  return (typeof str === 'string') && str.startsWith('data:') && str.includes(';base64,');
}

async function ensureMigrationTable() {
  await pg.query(`
    CREATE TABLE IF NOT EXISTS image_migrations (
      id bigserial primary key,
      table_name text not null,
      column_name text not null,
      pk_values jsonb not null,
      uploaded jsonb,
      status text not null default 'pending',
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
  `);
}

async function findImageLikeColumns() {
  const q = `
    SELECT table_schema, table_name, column_name, data_type
    FROM information_schema.columns
    WHERE (column_name ILIKE '%image%' OR column_name ILIKE '%photo%' OR column_name ILIKE '%avatar%')
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
      AND data_type IN ('text','json','jsonb');
  `;
  const res = await pg.query(q);
  return res.rows.map(r => ({ schema: r.table_schema, table: r.table_name, column: r.column_name, data_type: r.data_type }));
}

async function getPrimaryKeyColumns(schema, table) {
  const q = `
    SELECT a.attname
    FROM   pg_index i
    JOIN   pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE  i.indrelid = $1::regclass
    AND    i.indisprimary;
  `;
  const res = await pg.query(q, [`${schema}.${table}`]);
  return res.rows.map(r => r.attname);
}

function generateWhereClause(pkCols, row) {
  const parts = [];
  const vals = [];
  pkCols.forEach((col, idx) => {
    parts.push(`${col} = $${idx + 1}`);
    vals.push(row[col]);
  });
  return { clause: parts.join(' AND '), vals };
}

async function processTableColumn({ schema, table, column, data_type }) {
  writeLog(`Scanning ${schema}.${table}.${column} (${data_type})`);
  const pkCols = await getPrimaryKeyColumns(schema, table);
  if (!pkCols || pkCols.length === 0) {
    writeLog(`Skipping ${schema}.${table} — no primary key found`);
    return;
  }

  // find rows where column contains data URL
  const whereExpr = data_type === 'text' ? `${column} LIKE 'data:%'` : `${column}::text LIKE '%data:%'`;
  let offset = 0;
  while (true) {
    const q = `SELECT ${pkCols.join(',')}, ${column} FROM ${schema}.${table} WHERE ${whereExpr} ORDER BY ${pkCols[0]} LIMIT $1 OFFSET $2`;
    const res = await pg.query(q, [BATCH_SIZE, offset]);
    if (res.rows.length === 0) break;
    for (const row of res.rows) {
      try {
        const pkValues = {};
        pkCols.forEach((c) => { pkValues[c] = row[c]; });
        const original = row[column];
        let updated = original;
        let uploaded = [];

        if (data_type === 'text') {
          if (isDataUrl(original)) {
            const matches = original.match(/^data:(.+);base64,(.+)$/);
            if (!matches) { writeLog(`Invalid data url for ${table} pk=${JSON.stringify(pkValues)}`); continue; }
            const mime = matches[1]; const b64 = matches[2];
            const ext = mime.split('/')[1] || 'jpg';
            const buffer = Buffer.from(b64, 'base64');
            const remotePath = `${table}/${Object.values(pkValues).join('-')}-${Date.now()}.${ext}`;
            writeLog(`Uploading ${schema}.${table} ${JSON.stringify(pkValues)} -> ${remotePath}`);
            if (!DRY_RUN) {
              const { error: upErr } = await supabase.storage.from(BUCKET).upload(remotePath, buffer, { contentType: mime, upsert: false });
              if (upErr) { writeLog(`Upload error: ${JSON.stringify(upErr)}`); continue; }
              const { data } = supabase.storage.from(BUCKET).getPublicUrl(remotePath);
              updated = data?.publicUrl || '';
              uploaded.push({ path: remotePath, url: updated });
            } else {
              uploaded.push({ path: remotePath, url: `DRY_RUN://${remotePath}` });
              updated = `DRY_RUN://${remotePath}`;
            }
          }
        } else {
          // json / jsonb
          const js = original;
          if (Array.isArray(js)) {
            for (let i = 0; i < js.length; i++) {
              const val = js[i];
              if (isDataUrl(val)) {
                const matches = val.match(/^data:(.+);base64,(.+)$/);
                if (!matches) { writeLog(`Invalid data url in array for ${table} pk=${JSON.stringify(pkValues)} idx=${i}`); continue; }
                const mime = matches[1]; const b64 = matches[2]; const ext = mime.split('/')[1] || 'jpg';
                const buffer = Buffer.from(b64, 'base64');
                const remotePath = `${table}/${Object.values(pkValues).join('-')}-${Date.now()}-${i}.${ext}`;
                writeLog(`Uploading ${schema}.${table} ${JSON.stringify(pkValues)} index ${i} -> ${remotePath}`);
                if (!DRY_RUN) {
                  const { error: upErr } = await supabase.storage.from(BUCKET).upload(remotePath, buffer, { contentType: mime, upsert: false });
                  if (upErr) { writeLog(`Upload error: ${JSON.stringify(upErr)}`); continue; }
                  const { data } = supabase.storage.from(BUCKET).getPublicUrl(remotePath);
                  js[i] = data?.publicUrl || '';
                  uploaded.push({ path: remotePath, url: js[i] });
                } else {
                  js[i] = `DRY_RUN://${remotePath}`;
                  uploaded.push({ path: remotePath, url: js[i] });
                }
              }
            }
            updated = js;
          } else if (typeof js === 'object' && js !== null) {
            // look for keys that contain data URLs (shallow)
            const keys = Object.keys(js);
            for (const k of keys) {
              const v = js[k];
              if (isDataUrl(v)) {
                const matches = v.match(/^data:(.+);base64,(.+)$/);
                if (!matches) { writeLog(`Invalid data url in object for ${table} pk=${JSON.stringify(pkValues)} key=${k}`); continue; }
                const mime = matches[1]; const b64 = matches[2]; const ext = mime.split('/')[1] || 'jpg';
                const buffer = Buffer.from(b64, 'base64');
                const remotePath = `${table}/${Object.values(pkValues).join('-')}-${Date.now()}-${k}.${ext}`;
                writeLog(`Uploading ${schema}.${table} ${JSON.stringify(pkValues)} key ${k} -> ${remotePath}`);
                if (!DRY_RUN) {
                  const { error: upErr } = await supabase.storage.from(BUCKET).upload(remotePath, buffer, { contentType: mime, upsert: false });
                  if (upErr) { writeLog(`Upload error: ${JSON.stringify(upErr)}`); continue; }
                  const { data } = supabase.storage.from(BUCKET).getPublicUrl(remotePath);
                  js[k] = data?.publicUrl || '';
                  uploaded.push({ path: remotePath, url: js[k] });
                } else {
                  js[k] = `DRY_RUN://${remotePath}`;
                  uploaded.push({ path: remotePath, url: js[k] });
                }
              }
            }
            updated = js;
          }
        }

        // persist migration log and update row
        const insertLog = `INSERT INTO image_migrations (table_name, column_name, pk_values, uploaded, status) VALUES ($1,$2,$3,$4,$5) RETURNING id`;
        if (!DRY_RUN) {
          await pg.query(insertLog, [table, column, JSON.stringify(pkValues), JSON.stringify(uploaded), uploaded.length > 0 ? 'done' : 'skipped']);
          // update row
          const { clause, vals } = generateWhereClause(pkCols, row);
          // build UPDATE query with single column
          const upd = `UPDATE ${schema}.${table} SET ${column} = $${vals.length + 1}, updated_at = now() WHERE ${clause}`;
          const allVals = [...vals, updated];
          await pg.query(upd, allVals);
          writeLog(`Updated ${schema}.${table} ${JSON.stringify(pkValues)} — uploaded ${uploaded.length}`);
        } else {
          writeLog(`DRY_RUN: would update ${schema}.${table} ${JSON.stringify(pkValues)} => ${JSON.stringify(uploaded)}`);
        }

      } catch (err) {
        writeLog(`Error processing row in ${table}.${column}: ${String(err)}`);
      }
    }
    offset += res.rows.length;
    if (res.rows.length < BATCH_SIZE) break;
  }
}

async function main() {
  writeLog('Starting full DB image migration. DRY_RUN=' + (DRY_RUN ? '1' : '0'));
  await pg.connect();
  await ensureMigrationTable();
  const cols = await findImageLikeColumns();
  writeLog('Found candidate columns: ' + JSON.stringify(cols));
  for (const c of cols) {
    await processTableColumn(c);
  }
  await pg.end();
  writeLog('Migration run completed');
  console.log('Migration log:', logFile);
}

main().catch((err) => {
  writeLog('Fatal: ' + String(err));
  console.error(err);
  process.exit(1);
});
