/* eslint-disable no-console */
import { Client } from 'pg';

const conn = process.env.marymatelier_POSTGRES_URL;
if (!conn) {
  console.error('NO_CONN');
  process.exit(1);
}

const sanitized = conn.replace(/(\?|&)sslmode=require(\b|&|$)/, '$1').replace(/\?&/, '?').replace(/&$/, '');
const client = new Client({ connectionString: sanitized, ssl: { rejectUnauthorized: false } });

(async () => {
  try {
    await client.connect();
    console.log('Connected. Creating indexes if not exists...');
    // Composite index to support ORDER BY position ASC, created_at DESC (positions may be NULL)
    await client.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS dresses_position_created_at_idx ON dresses (position ASC NULLS LAST, created_at DESC);`);
    await client.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS dresses_created_at_idx ON dresses (created_at DESC);`);
    // Reservations indexes for common filters and ordering
    await client.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS reservations_created_at_idx ON reservations (created_at DESC);`);
    await client.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS reservations_status_rentdate_idx ON reservations (status, rent_date);`);
    await client.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS reservations_dress_id_created_idx ON reservations (dress_id, created_at DESC);`);
    await client.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS faqs_created_at_idx ON faqs (created_at DESC);`);
    await client.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS reservations_client_phone_idx ON reservations (client_phone);`);
    console.log('Indexes created.');
    await client.end();
  } catch (err) {
    console.error('ERR', err && err.message ? err.message : err);
    try { await client.end(); } catch (_) {}
    process.exit(1);
  }
})();
