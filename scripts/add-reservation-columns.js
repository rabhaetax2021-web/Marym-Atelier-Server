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
    console.log('Connected. Adding reservation columns if missing...');
    await client.query(`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS weight integer;`);
    await client.query(`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS height integer;`);
    console.log('Columns added. Verifying...');
    const colRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='reservations' AND column_name IN ('weight','height')`);
    console.log('FOUND:', colRes.rows.map(r=>r.column_name));
    await client.end();
  } catch (err) {
    console.error('ERR', err && err.message ? err.message : err);
    try { await client.end(); } catch (err2) { void err2; }
    process.exit(1);
  }
})();
