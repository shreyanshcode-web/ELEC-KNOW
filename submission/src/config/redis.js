import { createClient } from 'redis';

/**
 * Redis client wrapper for caching layer.
 * Connects to Google Memorystore (production) or local Redis (development).
 * @module config/redis
 */

/** @type {import('redis').RedisClientType|null} */
let client = null;

/**
 * Returns the shared Redis client. Creates and connects on first call.
 * @returns {Promise<import('redis').RedisClientType>} Connected Redis client.
 */
export const getRedisClient = async () => {
  if (client && client.isOpen) {
    return client;
  }

  const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || '6379'}`;

  client = createClient({
    url: redisUrl,
    password: process.env.REDIS_PASSWORD || undefined,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Redis: max reconnect attempts reached');
          return new Error('Redis max reconnect attempts reached');
        }
        // Exponential backoff: 100ms, 200ms, 400ms... up to 3s
        return Math.min(retries * 100, 3000);
      },
    },
  });

  client.on('error', (err) => {
    console.error('Redis client error:', err.message);
  });

  client.on('connect', () => {
    console.log('Redis: connected');
  });

  client.on('reconnecting', () => {
    console.warn('Redis: reconnecting...');
  });

  await client.connect();
  return client;
};

/**
 * Gracefully disconnects the Redis client. Call during shutdown.
 * @returns {Promise<void>}
 */
export const closeRedis = async () => {
  if (client && client.isOpen) {
    await client.quit();
    client = null;
  }
};
