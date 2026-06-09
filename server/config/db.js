import pg from 'pg';

const { Pool } = pg;

// Validate required environment variables
const requiredVars = ['DB_USER', 'DB_PASSWORD'];
const missing = requiredVars.filter(v => !process.env[v]);

if (missing.length > 0) {
  console.error(`✗ Missing required environment variables: ${missing.join(', ')}`);
  console.error('Make sure your .env file is loaded with DB_USER and DB_PASSWORD');
  process.exit(1);
}

console.log(`📦 Connecting to database: ${process.env.DB_NAME || 'marymatelier'} @ ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'marymatelier',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('🔴 Unexpected pool error:', err.message);
});

// Test the connection
try {
  const client = await pool.connect();
  client.release();
  console.log(`✓ Database pool initialized successfully (user: ${process.env.DB_USER})`);
} catch (err) {
  console.error('🔴 Failed to initialize database pool:');
  console.error(`   Error: ${err.message}`);
  if (err.code) {
    console.error(`   Code: ${err.code}`);
  }
  if (err.detail) {
    console.error(`   Detail: ${err.detail}`);
  }
  console.error('\nPossible causes:');
  console.error('  1. PostgreSQL server not running on ' + (process.env.DB_HOST || 'localhost') + ':' + (process.env.DB_PORT || 5432));
  console.error('  2. Database "' + (process.env.DB_NAME || 'marymatelier') + '" does not exist');
  console.error('  3. User "' + process.env.DB_USER + '" does not have access to the database');
  console.error('  4. Wrong DB_PASSWORD environment variable');
  process.exit(1);
}

export default pool;
