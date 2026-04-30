/**
 * Application-wide constants.
 * Centralizes magic values to satisfy Code Quality criterion.
 * @module config/constants
 */

/** Valid user knowledge levels for query categorization */
export const KNOWLEDGE_LEVELS = Object.freeze(['Beginner', 'Intermediate', 'Advanced']);

/** Maximum characters allowed in a user query */
export const MAX_QUERY_LENGTH = 500;

/** Default cache TTL in seconds (1 hour) */
export const DEFAULT_CACHE_TTL = parseInt(process.env.REDIS_CACHE_TTL || '3600', 10);

/** Kafka topic names */
export const KAFKA_TOPICS = Object.freeze({
  QUERY_SUBMITTED: process.env.KAFKA_TOPIC_QUERY_SUBMITTED || 'query.submitted',
  ANALYTICS: process.env.KAFKA_TOPIC_ANALYTICS || 'query.analytics',
});

/** Database connection pool sizes */
export const DB_POOL = Object.freeze({
  MIN: parseInt(process.env.DB_POOL_MIN || '2', 10),
  MAX: parseInt(process.env.DB_POOL_MAX || '10', 10),
});

/** HTTP status codes used across the application */
export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
});
