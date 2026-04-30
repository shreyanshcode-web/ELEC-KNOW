import { query } from '../config/database.js';

/**
 * Session model — tracks user login sessions for security auditing.
 * @module models/session.model
 */

/**
 * Creates a new session record when a user authenticates.
 * @param {object} params - Session parameters.
 * @param {string} params.userId - Internal UUID of the user.
 * @param {string} params.sessionToken - The session/JWT identifier.
 * @param {string} [params.ipAddress] - Client IP address.
 * @param {string} [params.userAgent] - Client user agent string.
 * @returns {Promise<object>} The created session record.
 */
export const createSession = async ({ userId, sessionToken, ipAddress, userAgent }) => {
  const result = await query(
    `INSERT INTO sessions (user_id, session_token, ip_address, user_agent)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, sessionToken, ipAddress || null, userAgent || null]
  );
  return result.rows[0];
};

/**
 * Marks a session as ended (logout or expiry).
 * @param {string} sessionId - The session UUID.
 * @returns {Promise<object|null>} The updated session or null.
 */
export const endSession = async (sessionId) => {
  const result = await query(
    'UPDATE sessions SET ended_at = NOW() WHERE id = $1 RETURNING *',
    [sessionId]
  );
  return result.rows[0] || null;
};

/**
 * Gets all active (non-ended) sessions for a user.
 * @param {string} userId - The user's UUID.
 * @returns {Promise<object[]>} Array of active session records.
 */
export const getActiveSessions = async (userId) => {
  const result = await query(
    'SELECT * FROM sessions WHERE user_id = $1 AND ended_at IS NULL ORDER BY started_at DESC',
    [userId]
  );
  return result.rows;
};
