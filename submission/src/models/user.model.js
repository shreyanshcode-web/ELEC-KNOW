import { query } from '../config/database.js';

/**
 * User model — database operations for the users table.
 * All queries use parameterized placeholders ($1, $2...) to prevent SQL injection.
 * @module models/user.model
 */

/**
 * Finds or creates a user by their Firebase UID.
 * Called after successful Firebase Auth verification.
 * @param {object} params - User parameters.
 * @param {string} params.firebaseUid - The Firebase Authentication UID.
 * @param {string} params.email - The user's email address.
 * @param {string} [params.displayName] - The user's display name.
 * @returns {Promise<object>} The user record.
 */
export const findOrCreateUser = async ({ firebaseUid, email, displayName }) => {
  const result = await query(
    `INSERT INTO users (firebase_uid, email, display_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (firebase_uid) DO UPDATE
       SET email = EXCLUDED.email,
           display_name = COALESCE(EXCLUDED.display_name, users.display_name)
     RETURNING *`,
    [firebaseUid, email, displayName || null]
  );
  return result.rows[0];
};

/**
 * Retrieves a user by their internal UUID.
 * @param {string} userId - The user's UUID.
 * @returns {Promise<object|null>} The user record or null.
 */
export const findById = async (userId) => {
  const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
  return result.rows[0] || null;
};

/**
 * Retrieves a user by their Firebase UID.
 * @param {string} firebaseUid - The Firebase Authentication UID.
 * @returns {Promise<object|null>} The user record or null.
 */
export const findByFirebaseUid = async (firebaseUid) => {
  const result = await query('SELECT * FROM users WHERE firebase_uid = $1', [firebaseUid]);
  return result.rows[0] || null;
};

/**
 * Updates the user's preferred knowledge level.
 * @param {string} userId - The user's UUID.
 * @param {string} knowledgeLevel - The new level (Beginner|Intermediate|Advanced).
 * @returns {Promise<object>} The updated user record.
 */
export const updateKnowledgeLevel = async (userId, knowledgeLevel) => {
  const result = await query(
    'UPDATE users SET knowledge_level = $1 WHERE id = $2 RETURNING *',
    [knowledgeLevel, userId]
  );
  return result.rows[0];
};
