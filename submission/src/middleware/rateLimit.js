import rateLimit from 'express-rate-limit';
import { getRedisClient } from '../config/redis.js';
import logger from '../config/logger.js';

/**
 * Redis-backed rate limiter for API endpoint protection.
 * Uses a sliding window algorithm backed by Redis for distributed rate limiting
 * across multiple API pods in the GKE cluster.
 * @module middleware/rateLimit
 */

/**
 * Custom Redis store for express-rate-limit.
 * Stores rate limit counters in Redis instead of in-memory,
 * ensuring consistent limiting across all K8s pod replicas.
 */
class RedisRateLimitStore {
  constructor(windowMs, prefix) {
    this.windowMs = windowMs;
    this.prefix = prefix;
  }

  /**
   * Increments the counter for a given key.
   * @param {string} key - The client identifier (usually IP).
   * @returns {Promise<object>} Current count and reset time.
   */
  async increment(key) {
    try {
      const client = await getRedisClient();
      if (!client) {
        return { totalHits: 0, resetTime: new Date(Date.now() + this.windowMs) };
      }

      const redisKey = `${this.prefix}${key}`;

      const results = await client
        .multi()
        .incr(redisKey)
        .pTTL(redisKey)
        .exec();

      const totalHits = results[0];
      const timeToExpire = results[1];

      // Set expiry on first hit
      if (timeToExpire === -1) {
        await client.pExpire(redisKey, this.windowMs);
      }

      return {
        totalHits,
        resetTime: new Date(Date.now() + Math.max(timeToExpire, 0)),
      };
    } catch (error) {
      // Fallback: allow request if Redis is unavailable
      logger.warn('Rate limit Redis error (allowing request)', { error: error.message });
      return { totalHits: 0, resetTime: new Date() };
    }
  }

  /**
   * Decrements the counter (e.g., on successful response for draft-style limiting).
   * @param {string} key - The client identifier.
   */
  async decrement(key) {
    try {
      const client = await getRedisClient();
      if (!client) return;
      await client.decr(`${this.prefix}${key}`);
    } catch (error) {
      logger.warn('Rate limit decrement error', { error: error.message });
    }
  }

  /**
   * Resets the counter for a key.
   * @param {string} key - The client identifier.
   */
  async resetKey(key) {
    try {
      const client = await getRedisClient();
      if (!client) return;
      await client.del(`${this.prefix}${key}`);
    } catch (error) {
      logger.warn('Rate limit reset error', { error: error.message });
    }
  }
}

/**
 * API rate limiter: 100 requests per 15-minute window.
 * Distributed across all K8s pods via Redis.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please try again later.',
  },
  store: process.env.NODE_ENV === 'test'
    ? undefined
    : new RedisRateLimitStore(15 * 60 * 1000, 'rl:api:'),
});

/**
 * Stricter rate limiter for AI endpoints: 20 requests per 5-minute window.
 * Prevents abuse of expensive Gemini API calls.
 */
export const aiRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'AI query rate limit exceeded. Please wait before sending more questions.',
  },
  store: process.env.NODE_ENV === 'test'
    ? undefined
    : new RedisRateLimitStore(5 * 60 * 1000, 'rl:ai:'),
});
