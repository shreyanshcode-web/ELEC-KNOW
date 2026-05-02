import pg from 'pg';
import { DB_POOL } from './constants.js';
import logger from './logger.js';

const { Pool } = pg;

/**
 * PostgreSQL connection pool for Cloud SQL.
 *
 * GCP deployment modes:
 * - GKE: connects via Cloud SQL Auth Proxy sidecar at 127.0.0.1:5432
 * - Cloud Run: connects via Unix socket at /cloudsql/PROJECT:REGION:INSTANCE
 * - Local dev: connects via DATABASE_URL or individual params
 *
 * Graceful degradation: if the database is unavailable, the app continues
 * serving cached/AI responses. DB-dependent features return errors individually.
 *
 * @module config/database
 */

/** @type {pg.Pool|null} */
let pool = null;
let dbAvailable = false;

/**
 * Returns whether the database connection is currently available.
 * @returns {boolean}
 */
export const isDatabaseAvailable = () => dbAvailable;

/**
 * Returns the shared PostgreSQL connection pool.
 * Creates a new pool on first call (lazy initialization).
 *
 * Cloud SQL socket detection: if CLOUD_SQL_CONNECTION_NAME is set
 * and no DATABASE_URL is provided, connects via Unix socket.
 * @returns {pg.Pool} The connection pool instance.
 */
export const getPool = () => {
  if (pool) {
    return pool;
  }

  let connectionConfig;

  if (process.env.DATABASE_URL) {
    connectionConfig = { connectionString: process.env.DATABASE_URL };
  } else if (process.env.CLOUD_SQL_CONNECTION_NAME) {
    // Cloud Run uses Unix sockets — no Auth Proxy needed
    connectionConfig = {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'election_education',
      host: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
    };
  } else {
    // GKE with Cloud SQL Auth Proxy sidecar (or local dev)
    connectionConfig = {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'election_education',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };
  }

  pool = new Pool({
    ...connectionConfig,
    min: DB_POOL.MIN,
    max: DB_POOL.MAX,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    dbAvailable = false;
    logger.error('Unexpected PostgreSQL pool error', { error: err.message });
  });

  pool.on('connect', () => {
    dbAvailable = true;
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

  if (duration > 200) {
    logger.warn('Slow query detected', { durationMs: duration, query: text.substring(0, 100) });
  }

  return result;
};

/**
 * Attempts a test connection to verify database availability.
 * Used by readiness probes — does not throw on failure.
 * @returns {Promise<boolean>} True if connected, false otherwise.
 */
export const testConnection = async () => {
  try {
    await getPool().query('SELECT 1');
    dbAvailable = true;
    return true;
  } catch (err) {
    dbAvailable = false;
    logger.warn('Database health check failed', { error: err.message });
    return false;
  }
};

/**
 * Gracefully closes the pool. Call during shutdown.
 * @returns {Promise<void>}
 */
export const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    dbAvailable = false;
    logger.info('PostgreSQL pool closed');
  }
};
