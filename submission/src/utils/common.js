/**
 * Common utility functions for code reuse across services.
 * Includes: async error handling, response formatting, retry logic,
 * type checking, and other frequently-used patterns.
 * @module utils/common
 */

/**
 * Async error handling wrapper for Express route handlers.
 * Eliminates need for try-catch in every route and passes errors to middleware.
 * @param {Function} handler - Express middleware/route handler (async function).
 * @returns {Function} Wrapped handler that catches errors and passes to next().
 */
export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

/**
 * Standard HTTP success response formatter.
 * Ensures consistent response structure across all endpoints.
 * @param {*} data - Response data (any type).
 * @param {object} [options={}] - Additional response options.
 * @param {string} [options.message] - Optional success message.
 * @param {object} [options.metadata={}] - Additional response metadata (pagination, etc.).
 * @returns {object} Formatted success response object.
 */
export const successResponse = (data, options = {}) => {
  const { message, metadata = {} } = options;

  return {
    success: true,
    data,
    ...(message ? { message } : {}),
    ...metadata,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Retry a failing operation with exponential backoff.
 * Useful for handling transient failures in external APIs, DB connections, etc.
 * @param {Function} operation - Async function to retry.
 * @param {object} [options={}] - Retry configuration.
 * @param {number} [options.maxAttempts=3] - Maximum retry attempts.
 * @param {number} [options.delayMs=100] - Initial delay in milliseconds.
 * @param {number} [options.backoffMultiplier=2] - Exponential backoff multiplier.
 * @param {Function} [options.onRetry] - Callback function called before each retry.
 * @returns {Promise<*>} Result from operation on success.
 * @throws {Error} The last error encountered if all attempts fail.
 */
export const retryWithBackoff = async (operation, options = {}) => {
  const {
    maxAttempts = 3,
    delayMs = 100,
    backoffMultiplier = 2,
    onRetry = () => {},
  } = options;

  let lastError;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;

      if (attempt < maxAttempts) {
        onRetry(attempt, currentDelay, err);
        await sleep(currentDelay);
        currentDelay *= backoffMultiplier;
      }
    }
  }

  throw lastError;
};

/**
 * Sleep/delay for a specified duration.
 * Useful for implementing rate limiting, delays, and retry logic.
 * @param {number} ms - Milliseconds to sleep.
 * @returns {Promise<void>}
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Checks if a value is null or undefined.
 * @param {*} value - The value to check.
 * @returns {boolean} True if value is null or undefined.
 */
export const isNullOrUndefined = (value) => value === null || value === undefined;

/**
 * Checks if a value is an empty string (after trimming).
 * @param {*} value - The value to check.
 * @returns {boolean} True if value is an empty string or whitespace-only.
 */
export const isEmptyString = (value) => typeof value === 'string' && value.trim().length === 0;

/**
 * Checks if a value is an empty object.
 * @param {*} value - The value to check.
 * @returns {boolean} True if value is an empty object.
 */
export const isEmptyObject = (value) => typeof value === 'object' && value !== null && Object.keys(value).length === 0;

/**
 * Checks if a value is an empty array.
 * @param {*} value - The value to check.
 * @returns {boolean} True if value is an empty array.
 */
export const isEmptyArray = (value) => Array.isArray(value) && value.length === 0;

/**
 * Safely parses a JSON string with error handling.
 * @param {string} jsonString - JSON string to parse.
 * @param {*} [fallback=null] - Value to return if parsing fails.
 * @returns {*} Parsed object or fallback value.
 */
export const safeJSONParse = (jsonString, fallback = null) => {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
};

/**
 * Safely stringifies an object with error handling.
 * @param {*} obj - Object to stringify.
 * @param {string} [fallback='{}'] - Value to return if stringification fails.
 * @returns {string} JSON string or fallback value.
 */
export const safeJSONStringify = (obj, fallback = '{}') => {
  try {
    return JSON.stringify(obj);
  } catch {
    return fallback;
  }
};

/**
 * Creates a cache key from multiple components.
 * Useful for Redis, in-memory caches, etc.
 * @param {...string} parts - Components to join into cache key.
 * @returns {string} Cache key (parts joined by ':').
 */
export const cacheKey = (...parts) => parts.map(String).join(':');

/**
 * Generates a RFC 4122 v4 compliant UUID.
 * @returns {string} Generated UUID.
 */
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Checks if an object has all specified properties.
 * @param {object} obj - Object to check.
 * @param {Array<string>} props - Property names to check for.
 * @returns {boolean} True if all properties exist.
 */
export const hasAllProperties = (obj, props) => {
  return props.every((prop) => prop in obj);
};

/**
 * Omits specified keys from an object, returning a new object.
 * Useful for removing sensitive fields before returning data.
 * @param {object} obj - Original object.
 * @param {Array<string>} keysToOmit - Keys to exclude.
 * @returns {object} New object without excluded keys.
 */
export const omitKeys = (obj, keysToOmit) => {
  const result = { ...obj };
  keysToOmit.forEach((key) => delete result[key]);
  return result;
};

/**
 * Picks specified keys from an object, returning a new object.
 * Useful for extracting only necessary fields.
 * @param {object} obj - Original object.
 * @param {Array<string>} keysToPick - Keys to include.
 * @returns {object} New object with only specified keys.
 */
export const pickKeys = (obj, keysToPick) => {
  const result = {};
  keysToPick.forEach((key) => {
    if (key in obj) result[key] = obj[key];
  });
  return result;
};

/**
 * Merges multiple objects, with later objects overriding earlier ones.
 * Similar to Object.assign but returns a new object.
 * @param {...object} objects - Objects to merge.
 * @returns {object} Merged object.
 */
export const mergeObjects = (...objects) => {
  return objects.reduce((acc, obj) => ({ ...acc, ...obj }), {});
};

/**
 * Deeply clones an object (for simple POJOs and arrays, not for complex types).
 * @param {object} obj - Object to clone.
 * @returns {object} Deep clone of the object.
 */
export const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

/**
 * Converts a value to a boolean using common conventions.
 * @param {*} value - Value to convert.
 * @returns {boolean} Boolean representation.
 */
export const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }
  return Boolean(value);
};

/**
 * Measures execution time of an async function.
 * Useful for performance monitoring and logging.
 * @param {string} label - Label for the operation (for logging).
 * @param {Function} operation - Async function to measure.
 * @returns {Promise<{result: *, duration: number}>} Result and execution time in ms.
 */
export const measureTime = async (label, operation) => {
  const start = Date.now();
  const result = await operation();
  const duration = Date.now() - start;
  return { result, duration, label };
};

/**
 * Truncates a string to a maximum length with ellipsis.
 * @param {string} str - String to truncate.
 * @param {number} maxLength - Maximum length.
 * @param {string} [suffix='...'] - Suffix to append when truncated.
 * @returns {string} Truncated string.
 */
export const truncate = (str, maxLength, suffix = '...') => {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
};
