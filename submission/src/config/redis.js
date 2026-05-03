import { createClient } from 'redis';
import logger from './logger.js';

/**
 * Redis client for caching and rate limiting.
 *
 * GCP deployment:
 * - Production: Google Memorystore for Redis (managed)
 * - GKE: in-cluster Redis pod or Memorystore private IP
 * - Local dev: Docker Compose Redis container
 *
 * Graceful degradation: if Redis is unavailable, the app continues
 * without caching (every request goes to Gemini). Rate limiting
 * falls back to in-memory.
 *
 * @module config/redis
 */

/** @type {import('redis').RedisClientType|null} */
let client = null;
let redisAvailable = false;
let connectionFailed = false;

/**
 * Returns whether Redis is currently connected.
 * @returns {boolean}
 */
export const isRedisAvailable = () => redisAvailable;

/**
 * Returns the shared Redis client. Creates and connects on first call.
 * If Redis is unavailable, returns null (caller must handle gracefully).
 * @returns {Promise<import('redis').RedisClientType|null>} Connected client or null.
 */
export const getRedisClient = async () => {
  if (client && client.isOpen) {
    return client;
  }

  // Fast-fail if we've already determined Redis is offline
  if (connectionFailed) {
    return null;
  }

  const redisUrl = process.env.REDIS_URL
    || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || '6379'}`;

  try {
    client = createClient({
      url: redisUrl,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        connectTimeout: 2000,
        reconnectStrategy: (retries) => {
          if (retries > 2) {
            logger.warn('Redis: connection failed completely — disabling cache');
            redisAvailable = false;
            connectionFailed = true;
            return false; // Stop reconnecting
          }
          return 500;
        },
      },
    });

    client.on('error', () => {
      redisAvailable = false;
    });

    client.on('connect', () => {
      redisAvailable = true;
      connectionFailed = false;
      logger.info('Redis: connected');
    });

    client.on('end', () => {
      redisAvailable = false;
    });

    await client.connect();
    redisAvailable = true;
    return client;
  } catch {
    redisAvailable = false;
    connectionFailed = true;
    logger.warn('Redis connection failed — app will run without cache');
    return null;
  }
};

/**
 * Pings Redis to check availability. Used by readiness probes.
 * @returns {Promise<boolean>} True if Redis responds, false otherwise.
 */
export const testRedis = async () => {
  try {
    if (!client || !client.isOpen) {
      return false;
    }
    await client.ping();
    redisAvailable = true;
    return true;
  } catch {
    redisAvailable = false;
    return false;
  }
};

/**
 * Gracefully disconnects the Redis client.
 * @returns {Promise<void>}
 */
export const closeRedis = async () => {
  if (client && client.isOpen) {
    await client.quit();
    client = null;
    redisAvailable = false;
    logger.info('Redis: disconnected');
  }
};
