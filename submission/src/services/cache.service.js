import { getRedisClient } from '../config/redis.js';
import { DEFAULT_CACHE_TTL } from '../config/constants.js';

/**
 * Redis-based caching service for AI query responses.
 * Eliminates redundant Gemini API calls for identical queries,
 * reducing cost and improving response times to sub-millisecond.
 * @module services/cache.service
 */

/**
 * Generates a deterministic cache key from query parameters.
 * @param {string} queryText - The user's question.
 * @param {string} knowledgeLevel - The knowledge level context.
 * @returns {string} A namespaced cache key.
 */
const buildCacheKey = (queryText, knowledgeLevel) => {
  // Normalize: lowercase + trim whitespace for better cache hit rates
  const normalized = queryText.toLowerCase().trim();
  return `election:query:${knowledgeLevel}:${normalized}`;
};

/**
 * Attempts to retrieve a cached AI response for a query.
 * @param {string} queryText - The user's question.
 * @param {string} knowledgeLevel - The knowledge level.
 * @returns {Promise<string|null>} Cached response or null on miss.
 */
export const getCachedResponse = async (queryText, knowledgeLevel) => {
  try {
    const client = await getRedisClient();
    const key = buildCacheKey(queryText, knowledgeLevel);
    const cached = await client.get(key);

    if (cached) {
      console.log(`Cache HIT: ${key.substring(0, 50)}...`);
    }

    return cached;
  } catch (error) {
    // Cache failures should never break the app — fall through to Gemini
    console.warn('Cache read error (non-fatal):', error.message);
    return null;
  }
};

/**
 * Stores an AI response in the cache with TTL.
 * @param {string} queryText - The user's question.
 * @param {string} knowledgeLevel - The knowledge level.
 * @param {string} response - The AI-generated response to cache.
 * @param {number} [ttl] - Time-to-live in seconds. Defaults to DEFAULT_CACHE_TTL.
 * @returns {Promise<void>}
 */
export const setCachedResponse = async (queryText, knowledgeLevel, response, ttl = DEFAULT_CACHE_TTL) => {
  try {
    const client = await getRedisClient();
    const key = buildCacheKey(queryText, knowledgeLevel);
    await client.setEx(key, ttl, response);
  } catch (error) {
    // Cache write failures are non-fatal
    console.warn('Cache write error (non-fatal):', error.message);
  }
};

/**
 * Invalidates all cached responses (e.g., after system prompt update).
 * Uses SCAN to avoid blocking Redis with KEYS *.
 * @returns {Promise<number>} Number of keys deleted.
 */
export const invalidateAllQueryCache = async () => {
  try {
    const client = await getRedisClient();
    let cursor = 0;
    let deletedCount = 0;

    do {
      const result = await client.scan(cursor, {
        MATCH: 'election:query:*',
        COUNT: 100,
      });
      cursor = result.cursor;

      if (result.keys.length > 0) {
        await client.del(result.keys);
        deletedCount += result.keys.length;
      }
    } while (cursor !== 0);

    console.log(`Cache invalidated: ${deletedCount} keys deleted`);
    return deletedCount;
  } catch (error) {
    console.error('Cache invalidation error:', error.message);
    return 0;
  }
};
