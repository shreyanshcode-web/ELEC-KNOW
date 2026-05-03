/**
 * Application-wide constants.
 * Centralizes magic values to satisfy Code Quality criterion.
 * Single source of truth for configuration across all modules.
 * @module config/constants
 */

// ──────────── User & Knowledge Levels ────────────
/** Valid user knowledge levels for query categorization */
export const KNOWLEDGE_LEVELS = Object.freeze(['Beginner', 'Intermediate', 'Advanced']);

/** Knowledge level descriptions for UI display */
export const KNOWLEDGE_LEVEL_DESCRIPTIONS = Object.freeze({
  Beginner: 'New to elections and voting',
  Intermediate: 'Basic understanding, learning more',
  Advanced: 'Well-versed in election processes',
});

// ──────────── Input Validation ────────────
/** Maximum characters allowed in a user query */
export const MAX_QUERY_LENGTH = 500;

/** Minimum characters required in a user query */
export const MIN_QUERY_LENGTH = 3;

/** Maximum characters for email addresses */
export const MAX_EMAIL_LENGTH = 254;

/** Maximum results per paginated response */
export const MAX_PAGE_SIZE = 100;

/** Default results per paginated response */
export const DEFAULT_PAGE_SIZE = 20;

// ──────────── Cache Configuration ────────────
/** Default cache TTL in seconds (1 hour) */
export const DEFAULT_CACHE_TTL = parseInt(process.env.REDIS_CACHE_TTL || '3600', 10);

/** Cache TTL for user session data (24 hours) */
export const SESSION_CACHE_TTL = 86400;

/** Cache TTL for frequently accessed data (30 mins) */
export const SHORT_CACHE_TTL = 1800;

/** Cache key prefixes for different data types */
export const CACHE_PREFIXES = Object.freeze({
  QUERY: 'query',
  USER: 'user',
  SESSION: 'session',
  ANALYTICS: 'analytics',
  VOTER: 'voter',
  POLLING: 'polling',
});

// ──────────── Kafka Topics ────────────
/** Kafka topic names */
export const KAFKA_TOPICS = Object.freeze({
  QUERY_SUBMITTED: process.env.KAFKA_TOPIC_QUERY_SUBMITTED || 'query.submitted',
  ANALYTICS: process.env.KAFKA_TOPIC_ANALYTICS || 'query.analytics',
});

/** Kafka consumer group names */
export const KAFKA_CONSUMER_GROUPS = Object.freeze({
  ANALYTICS_WORKER: 'analytics-worker-group',
  LOGGING_WORKER: 'logging-worker-group',
});

// ──────────── Database Configuration ────────────
/** Database connection pool sizes */
export const DB_POOL = Object.freeze({
  MIN: parseInt(process.env.DB_POOL_MIN || '2', 10),
  MAX: parseInt(process.env.DB_POOL_MAX || '10', 10),
  IDLE_TIMEOUT_MS: 30000,
  CONNECTION_TIMEOUT_MS: 5000,
});

/** Database query timeout in milliseconds */
export const DB_QUERY_TIMEOUT_MS = 30000;

/** Slow query threshold in milliseconds */
export const SLOW_QUERY_THRESHOLD_MS = 200;

// ──────────── Rate Limiting ────────────
/** Rate limiter configuration for general API routes */
export const RATE_LIMIT_GENERAL = Object.freeze({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
});

/** Rate limiter configuration for AI endpoints */
export const RATE_LIMIT_AI = Object.freeze({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many AI queries, please wait before trying again.',
});

/** Rate limiter configuration for authentication */
export const RATE_LIMIT_AUTH = Object.freeze({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later.',
});

// ──────────── HTTP Status Codes ────────────
/** HTTP status codes used across the application */
export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
});

// ──────────── Logging & Monitoring ────────────
/** Structured logging severity levels (Cloud Logging compatible) */
export const LOG_SEVERITY = Object.freeze({
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  NOTICE: 'NOTICE',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
  ALERT: 'ALERT',
  EMERGENCY: 'EMERGENCY',
});

/** Slow operation thresholds for logging (in milliseconds) */
export const PERFORMANCE_THRESHOLDS = Object.freeze({
  DB_QUERY: 200,
  EXTERNAL_API: 500,
  HTTP_REQUEST: 1000,
});

// ──────────── External Services ────────────
/** API timeout configurations */
export const API_TIMEOUTS = Object.freeze({
  ECI: 5000,
  VERIFIK: 8000,
  DATA_GOV_IN: 10000,
  GEMINI: 30000,
});

/** Retry configurations for external services */
export const RETRY_CONFIG = Object.freeze({
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY_MS: 100,
  BACKOFF_MULTIPLIER: 2,
});

// ──────────── Feature Flags ────────────
/** Feature flags for A/B testing and rollouts */
export const FEATURES = Object.freeze({
  ENABLE_CACHE: process.env.ENABLE_CACHE !== 'false',
  ENABLE_KAFKA: process.env.ENABLE_KAFKA !== 'false',
  ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS !== 'false',
});

// ──────────── Authentication ────────────
/** Token expiration times */
export const TOKEN_EXPIRY = Object.freeze({
  SESSION: 24 * 60 * 60, // 24 hours in seconds
  REFRESH: 7 * 24 * 60 * 60, // 7 days in seconds
  OAUTH_STATE: 10 * 60, // 10 minutes in seconds
});

// ──────────── Validation Patterns ────────────
/** Regular expressions for common validations */
export const VALIDATION_PATTERNS = Object.freeze({
  EPIC: /^[A-Z]{3}\d{7}$/,
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  PHONE: /^\+?[1-9]\d{1,14}$/,
});
