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
    console.log('Connected. Running ALTER TABLE to add position column if missing...');
    await client.query(`ALTER TABLE dresses ADD COLUMN IF NOT EXISTS position integer;`);
    console.log('ALTER completed. Verifying...');
    const colRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='dresses' AND column_name='position'`);
    console.log('POSITION_EXISTS:', colRes.rowCount > 0);
    if (colRes.rowCount > 0) {
      const sample = await client.query(`SELECT id,name,position,created_at FROM dresses ORDER BY position ASC, created_at DESC LIMIT 5`);
      console.log('SAMPLE_ROWS:', JSON.stringify(sample.rows, null, 2));
    }
    await client.end();
  } catch (err) {
    console.error('ERR', err && err.message ? err.message : err);
    try { await client.end(); } catch (_) {}
    process.exit(1);
  }
})();
