import { query } from '../config/database.js';

/**
 * Analytics service — aggregates query metrics for dashboards and reporting.
 * @module services/analytics.service
 */

/**
 * Saves detailed analytics for a query (called by Kafka worker).
 * @param {object} params - Analytics parameters.
 * @param {string} params.queryId - UUID of the query.
 * @param {number} [params.tokenCount] - Tokens in the AI response.
 * @param {number} [params.confidenceScore] - AI confidence (0-1).
 * @param {number} [params.feedbackRating] - User rating (1-5).
 * @param {object} [params.metadata] - Additional JSONB metadata.
 * @returns {Promise<object>} The saved analytics record.
 */
export const saveQueryAnalytics = async ({ queryId, tokenCount, confidenceScore, feedbackRating, metadata }) => {
  const result = await query(
    `INSERT INTO query_analytics (query_id, token_count, confidence_score, feedback_rating, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [queryId, tokenCount || null, confidenceScore || null, feedbackRating || null, JSON.stringify(metadata || {})]
  );
  return result.rows[0];
};

/**
 * Returns aggregated usage statistics for a time period.
 * @param {number} [days=30] - Number of days to look back.
 * @returns {Promise<object>} Aggregated statistics.
 */
export const getUsageStats = async (days = 30) => {
  const result = await query(
    `SELECT
       COUNT(*)::int AS total_queries,
       COUNT(DISTINCT user_id)::int AS unique_users,
       AVG(response_time_ms)::int AS avg_response_time_ms,
       SUM(CASE WHEN from_cache THEN 1 ELSE 0 END)::int AS cache_hits,
       ROUND(AVG(CASE WHEN from_cache THEN 1.0 ELSE 0.0 END) * 100, 1) AS cache_hit_rate
     FROM queries
     WHERE created_at >= NOW() - INTERVAL '1 day' * $1`,
    [days]
  );
  return result.rows[0];
};

/**
 * Returns query volume grouped by date for charting.
 * @param {number} [days=30] - Number of days to look back.
 * @returns {Promise<object[]>} Daily query counts.
 */
export const getDailyQueryVolume = async (days = 30) => {
  const result = await query(
    `SELECT
       DATE(created_at) AS date,
       COUNT(*)::int AS query_count,
       COUNT(DISTINCT user_id)::int AS unique_users
     FROM queries
     WHERE created_at >= NOW() - INTERVAL '1 day' * $1
     GROUP BY DATE(created_at)
     ORDER BY date`,
    [days]
  );
  return result.rows;
};

/**
 * Returns average feedback ratings grouped by knowledge level.
 * @returns {Promise<object[]>} Average ratings per level.
 */
export const getFeedbackByLevel = async () => {
  const result = await query(
    `SELECT
       q.knowledge_level,
       COUNT(*)::int AS total_queries,
       ROUND(AVG(qa.feedback_rating), 2) AS avg_rating
     FROM queries q
     JOIN query_analytics qa ON q.id = qa.query_id
     WHERE qa.feedback_rating IS NOT NULL
     GROUP BY q.knowledge_level
     ORDER BY q.knowledge_level`
  );
  return result.rows;
};
