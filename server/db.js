const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();

const isLocalhost = process.env.DATABASE_URL && (
  process.env.DATABASE_URL.includes('localhost') ||
  process.env.DATABASE_URL.includes('127.0.0.1')
);

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: process.env.VERCEL ? 10 : 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

if (!isLocalhost && process.env.DATABASE_URL) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Test connection on local startup
if (!process.env.VERCEL) {
  pool.connect((err, client, release) => {
    if (err) {
      console.error('Database connection failed:', err.message);
    } else {
      console.log('✅ Connected to PostgreSQL database');
      release();
    }
  });
}

/**
 * Execute a query
 */
const query = (text, params) => pool.query(text, params);

/**
 * Execute a function within a transaction
 */
const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Get a client from the pool
 */
const getClient = () => pool.connect();

module.exports = { query, withTransaction, getClient, pool };
