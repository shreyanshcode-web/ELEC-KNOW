import { query } from '../config/database.js';

/**
 * Query model — stores and retrieves user education queries and AI responses.
 * @module models/query.model
 */

/**
 * Saves a new education query and its AI response to the database.
 * @param {object} params - Query parameters.
 * @param {string} params.userId - Internal UUID of the querying user.
 * @param {string} params.queryText - The sanitized user question.
 * @param {string} params.aiResponse - The Gemini-generated response.
 * @param {string} params.knowledgeLevel - User's knowledge level.
 * @param {number} params.responseTimeMs - Time taken to generate the response.
 * @param {boolean} params.fromCache - Whether the response was served from Redis cache.
 * @param {string} [params.topicId] - Optional topic UUID for categorization.
 * @returns {Promise<object>} The saved query record.
 */
export const createQuery = async ({ userId, queryText, aiResponse, knowledgeLevel, responseTimeMs, fromCache, topicId }) => {
  const result = await query(
    `INSERT INTO queries (user_id, topic_id, query_text, ai_response, knowledge_level, response_time_ms, from_cache)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId, topicId || null, queryText, aiResponse, knowledgeLevel, responseTimeMs, fromCache]
  );
  return result.rows[0];
};

/**
 * Retrieves paginated query history for a user.
 * @param {string} userId - The user's UUID.
 * @param {number} [limit=20] - Max results per page.
 * @param {number} [offset=0] - Number of results to skip.
 * @returns {Promise<object[]>} Array of query records.
 */
export const getUserQueries = async (userId, limit = 20, offset = 0) => {
  const result = await query(
    `SELECT q.*, t.name AS topic_name, t.slug AS topic_slug
     FROM queries q
     LEFT JOIN topics t ON q.topic_id = t.id
     WHERE q.user_id = $1
     ORDER BY q.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
};

/**
 * Full-text search across all stored queries.
 * Uses PostgreSQL GIN index for efficient text matching.
 * @param {string} searchTerm - The search text.
 * @param {number} [limit=10] - Max results.
 * @returns {Promise<object[]>} Matching query records.
 */
export const searchQueries = async (searchTerm, limit = 10) => {
  const result = await query(
    `SELECT id, query_text, knowledge_level, created_at,
            ts_rank(to_tsvector('english', query_text), plainto_tsquery('english', $1)) AS rank
     FROM queries
     WHERE to_tsvector('english', query_text) @@ plainto_tsquery('english', $1)
     ORDER BY rank DESC
     LIMIT $2`,
    [searchTerm, limit]
  );
  return result.rows;
};
