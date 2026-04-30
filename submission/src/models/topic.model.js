import { query } from '../config/database.js';

/**
 * Topic model — categorizes election education queries into structured topics.
 * @module models/topic.model
 */

/**
 * Retrieves all topics, optionally filtered by category.
 * @param {string} [category] - Optional category filter.
 * @returns {Promise<object[]>} Array of topic records.
 */
export const getAllTopics = async (category) => {
  if (category) {
    const result = await query(
      'SELECT * FROM topics WHERE category = $1 ORDER BY query_count DESC',
      [category]
    );
    return result.rows;
  }

  const result = await query('SELECT * FROM topics ORDER BY query_count DESC');
  return result.rows;
};

/**
 * Finds a topic by its URL-friendly slug.
 * @param {string} slug - The topic slug (e.g., 'electoral-college').
 * @returns {Promise<object|null>} The topic record or null.
 */
export const findBySlug = async (slug) => {
  const result = await query('SELECT * FROM topics WHERE slug = $1', [slug]);
  return result.rows[0] || null;
};

/**
 * Atomically increments the query count for a topic.
 * Called after each query is categorized.
 * @param {string} topicId - The topic UUID.
 * @returns {Promise<void>}
 */
export const incrementQueryCount = async (topicId) => {
  await query(
    'UPDATE topics SET query_count = query_count + 1 WHERE id = $1',
    [topicId]
  );
};

/**
 * Returns the top N most-queried topics for analytics dashboards.
 * @param {number} [limit=10] - Number of top topics to return.
 * @returns {Promise<object[]>} Sorted topic records.
 */
export const getPopularTopics = async (limit = 10) => {
  const result = await query(
    'SELECT * FROM topics WHERE query_count > 0 ORDER BY query_count DESC LIMIT $1',
    [limit]
  );
  return result.rows;
};
