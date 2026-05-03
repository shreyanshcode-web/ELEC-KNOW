/**
 * Service factory and dependency injection utilities.
 * Provides patterns for creating service instances with consistent
 * error handling, logging, and resource management.
 * @module utils/serviceFactory
 */

import logger from '../config/logger.js';
import { ExternalServiceError } from './errors.js';
import { retryWithBackoff } from './common.js';

/**
 * Base service class providing common functionality.
 * All services should extend this class for consistent behavior.
 * @abstract
 */
export class BaseService {
  /**
   * @param {string} serviceName - Name of the service for logging.
   */
  constructor(serviceName) {
    this.serviceName = serviceName;
  }

  /**
   * Logs a message with service context.
   * @param {string} level - Log level (info, warn, error, debug).
   * @param {string} message - Log message.
   * @param {object} [context={}] - Additional context.
   * @returns {void}
   */
  log(level, message, context = {}) {
    const logContext = { service: this.serviceName, ...context };
    logger[level](message, logContext);
  }

  /**
   * Executes an operation with retry logic and error handling.
   * @param {string} operationName - Name of the operation for logging.
   * @param {Function} operation - Async function to execute.
   * @param {object} [options={}] - Retry options.
   * @returns {Promise<*>} Result of the operation.
   * @throws {ExternalServiceError} If all retry attempts fail.
   */
  async executeWithRetry(operationName, operation, options = {}) {
    try {
      this.log('debug', `Starting ${operationName}`);

      const result = await retryWithBackoff(operation, {
        maxAttempts: 3,
        delayMs: 100,
        onRetry: (attempt, delay, err) => {
          this.log('warn', `${operationName} retry ${attempt}`, {
            delay,
            error: err.message,
          });
        },
        ...options,
      });

      this.log('debug', `${operationName} completed successfully`);
      return result;
    } catch (err) {
      this.log('error', `${operationName} failed`, { error: err.message });
      throw new ExternalServiceError(
        this.serviceName,
        `${operationName} failed: ${err.message}`,
        500,
        { operation: operationName, originalError: err.message }
      );
    }
  }

  /**
   * Measures execution time of an operation.
   * @param {string} label - Label for the operation.
   * @param {Function} operation - Async function to execute.
   * @returns {Promise<{result: *, duration: number}>} Result and execution time.
   */
  async measureOperation(label, operation) {
    const start = Date.now();
    const result = await operation();
    const duration = Date.now() - start;

    if (duration > 200) {
      this.log('warn', `Slow operation: ${label}`, { durationMs: duration });
    } else {
      this.log('debug', `${label} completed`, { durationMs: duration });
    }

    return { result, duration };
  }

  /**
   * Safely handles errors with consistent logging and transformation.
   * @param {Error} error - The error to handle.
   * @param {string} [context=''] - Additional context.
   * @throws {ExternalServiceError} Always throws transformed error.
   */
  handleError(error, context = '') {
    const message = error.message || String(error);
    this.log('error', `Service error${context ? ` (${context})` : ''}`, { error: message });
    throw new ExternalServiceError(this.serviceName, message);
  }
}

/**
 * Service registry for dependency injection.
 * Maintains singleton instances of services.
 */
class ServiceRegistry {
  /**
   * @private
   */
  constructor() {
    this.services = new Map();
  }

  /**
   * Registers a service factory function.
   * @param {string} name - Service name.
   * @param {Function} factory - Factory function that creates the service.
   * @returns {void}
   */
  register(name, factory) {
    this.services.set(name, {
      factory,
      instance: null,
    });
  }

  /**
   * Gets or creates a service instance (singleton).
   * @param {string} name - Service name.
   * @returns {*} Service instance.
   * @throws {Error} If service is not registered.
   */
  get(name) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service "${name}" is not registered`);
    }

    if (!service.instance) {
      service.instance = service.factory();
    }

    return service.instance;
  }

  /**
   * Checks if a service is registered.
   * @param {string} name - Service name.
   * @returns {boolean}
   */
  has(name) {
    return this.services.has(name);
  }

  /**
   * Clears all registered services and instances.
   * Useful for testing or resets.
   * @returns {void}
   */
  clear() {
    this.services.clear();
  }
}

// Global singleton registry
export const serviceRegistry = new ServiceRegistry();

/**
 * Registers a service factory with automatic singleton management.
 * @param {string} name - Service name.
 * @param {Function} factory - Factory function.
 * @returns {void}
 */
export const registerService = (name, factory) => {
  serviceRegistry.register(name, factory);
};

/**
 * Retrieves a service instance from the registry.
 * @param {string} name - Service name.
 * @returns {*} Service instance.
 */
export const getService = (name) => {
  return serviceRegistry.get(name);
};

/**
 * Cache wrapper for service methods.
 * Provides simple memoization with TTL support.
 */
export class CacheableService extends BaseService {
  /**
   * @param {string} serviceName - Name of the service.
   * @param {Map} [cache] - Optional cache instance (for testing).
   */
  constructor(serviceName, cache = new Map()) {
    super(serviceName);
    this.cache = cache;
  }

  /**
   * Gets cached value or executes function and caches result.
   * @param {string} cacheKey - Cache key.
   * @param {Function} fn - Async function to cache.
   * @param {number} [ttl=3600] - Time to live in seconds.
   * @returns {Promise<*>} Cached or fresh result.
   */
  async getOrCompute(cacheKey, fn, ttl = 3600) {
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiredAt > Date.now()) {
      this.log('debug', 'Cache hit', { key: cacheKey });
      return cached.value;
    }

    this.log('debug', 'Cache miss', { key: cacheKey });
    const value = await fn();

    this.cache.set(cacheKey, {
      value,
      expiredAt: Date.now() + ttl * 1000,
    });

    return value;
  }

  /**
   * Invalidates a cache entry.
   * @param {string} cacheKey - Cache key to invalidate.
   * @returns {void}
   */
  invalidateCache(cacheKey) {
    this.cache.delete(cacheKey);
    this.log('debug', 'Cache invalidated', { key: cacheKey });
  }

  /**
   * Clears all cached entries.
   * @returns {void}
   */
  clearCache() {
    this.cache.clear();
    this.log('debug', 'All cache cleared');
  }
}
