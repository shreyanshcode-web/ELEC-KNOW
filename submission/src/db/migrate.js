import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool, closePool } from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Runs SQL migration and seed files in order.
 * Creates a migrations tracking table to avoid re-running completed migrations.
 * @module db/migrate
 */

/**
 * Ensures the migrations tracking table exists.
 * @param {pg.Pool} pool - The database connection pool.
 */
const ensureMigrationsTable = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          SERIAL PRIMARY KEY,
      filename    VARCHAR(255) NOT NULL UNIQUE,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

/**
 * Returns the list of already-applied migration filenames.
 * @param {pg.Pool} pool - The database connection pool.
 * @returns {Promise<Set<string>>} Set of applied migration filenames.
 */
const getAppliedMigrations = async (pool) => {
  const result = await pool.query('SELECT filename FROM _migrations ORDER BY id');
  return new Set(result.rows.map((row) => row.filename));
};

/**
 * Reads and sorts SQL files from a directory.
 * @param {string} dir - Absolute path to the directory.
 * @returns {string[]} Sorted filenames ending in .sql.
 */
const getSqlFiles = (dir) => {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
};

/**
 * Executes all pending migrations and seeds.
 * Migration order: 001, 002, 004 (topics), 003 (queries — depends on topics), 005
 */
const runMigrations = async () => {
  const pool = getPool();

  try {
    await ensureMigrationsTable(pool);
    const applied = await getAppliedMigrations(pool);

    // Run migrations
    const migrationsDir = path.join(__dirname, 'migrations');
    // Correct execution order: topics must exist before queries FK reference
    const migrationOrder = ['001_create_users.sql', '002_create_sessions.sql', '004_create_topics.sql', '003_create_queries.sql', '005_create_analytics.sql'];
    const availableFiles = getSqlFiles(migrationsDir);

    for (const filename of migrationOrder) {
      if (!availableFiles.includes(filename)) {
        console.warn(`Migration file not found: ${filename}`);
        continue;
      }
      if (applied.has(filename)) {
        console.log(`✓ Already applied: ${filename}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf-8');
      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [filename]);
        await pool.query('COMMIT');
        console.log(`✅ Applied: ${filename}`);
      } catch (err) {
        await pool.query('ROLLBACK');
        console.error(`❌ Failed: ${filename}`, err.message);
        throw err;
      }
    }

    // Run seeds
    const seedsDir = path.join(__dirname, 'seeds');
    const seedFiles = getSqlFiles(seedsDir);

    for (const filename of seedFiles) {
      const seedKey = `seed:${filename}`;
      if (applied.has(seedKey)) {
        console.log(`✓ Already seeded: ${filename}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(seedsDir, filename), 'utf-8');
      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [seedKey]);
        await pool.query('COMMIT');
        console.log(`🌱 Seeded: ${filename}`);
      } catch (err) {
        await pool.query('ROLLBACK');
        console.error(`❌ Seed failed: ${filename}`, err.message);
        throw err;
      }
    }

    console.log('\n🎉 All migrations and seeds completed successfully.');
  } finally {
    await closePool();
  }
};

// Run if executed directly: node src/db/migrate.js
runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
