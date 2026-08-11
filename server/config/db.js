import pg from 'pg';

const { Pool } = pg;

// Validate required environment variables
const requiredVars = ['DB_USER', 'DB_PASSWORD'];
const missing = requiredVars.filter(v => !process.env[v]);

if (missing.length > 0) {
  console.error(`✗ Missing required environment variables: ${missing.join(', ')}`);
  console.error('Make sure your .env file is loaded with DB_USER and DB_PASSWORD');
  // In serverless environments, do not exit — throw to surface error during function init
  throw new Error(`Missing required env vars: ${missing.join(', ')}`);
}

console.log(`📦 Initializing database pool (host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432})`);

// Serverless-friendly singleton pool cached on globalThis
let poolVar = null;
try {
  if (globalThis.__MARYM_PG_POOL__ && globalThis.__MARYM_PG_POOL__.pool) {
    poolVar = globalThis.__MARYM_PG_POOL__.pool;
  }
} catch (err) { void err; }

if (!poolVar) {
  poolVar = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'marymatelier',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    // smaller default pool size for serverless environments; allow override via env
    max: Number(process.env.DB_POOL_MAX || 4),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  poolVar.on('error', (err) => {
    console.error('🔴 Unexpected pool error:', err.message);
  });

  try {
    globalThis.__MARYM_PG_POOL__ = { pool: poolVar };
  } catch (err) { void err; }
}

export default poolVar;
