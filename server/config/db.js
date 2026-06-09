import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'marymatelier',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
});

// Test the connection
try {
  const client = await pool.connect();
  client.release();
  console.log('✓ Database pool initialized successfully');
} catch (err) {
  console.error('✗ Failed to initialize database pool:', err);
}

export default pool;
