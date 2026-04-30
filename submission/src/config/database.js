import pg from 'pg';
import { DB_POOL } from './constants.js';

const { Pool } = pg;

/**
 * PostgreSQL connection pool using Cloud SQL or local Postgres.
 * Uses parameterized queries exclusively — no string interpolation.
 * @module config/database
 */

/** @type {pg.Pool|null} */
let pool = null;

/**
 * Returns the shared PostgreSQL connection pool.
 * Creates a new pool on first call (lazy initialization).
 * @returns {pg.Pool} The connection pool instance.
 */
export const getPool = () => {
  if (pool) {
    return pool;
  }

  const connectionConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'election_education',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      };

  pool = new Pool({
    ...connectionConfig,
    min: DB_POOL.MIN,
    max: DB_POOL.MAX,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  // Log pool errors without crashing the process
  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
  });

  return pool;
};

/**
 * Executes a parameterized SQL query against the pool.
 * @param {string} text - SQL query with $1, $2... placeholders.
 * @param {Array} params - Parameter values for the placeholders.
 * @returns {Promise<pg.QueryResult>} The query result.
 */
export const query = async (text, params = []) => {
  const start = Date.now();
  const result = await getPool().query(text, params);
  const duration = Date.now() - start;

  // Log slow queries (> 200ms) for performance monitoring
  if (duration > 200) {
    console.warn(`Slow query (${duration}ms):`, text);
  }

  return result;
};

/**
 * Gracefully closes the pool. Call during shutdown.
 * @returns {Promise<void>}
 */
export const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};
