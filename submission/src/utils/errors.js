/**
 * Custom error classes for consistent error handling.
 * Extends Error to provide context-specific error types with proper
 * HTTP status codes and structured logging support.
 * @module utils/errors
 */

/**
 * Base Application Error class.
 * All application errors should extend this class for consistent
 * handling, logging, and HTTP response serialization.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message.
   * @param {number} [statusCode=500] - HTTP status code (defaults to 500 for server errors).
   * @param {string} [code='INTERNAL_ERROR'] - Machine-readable error code for clients.
   * @param {object} [context={}] - Additional structured context for logging.
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Serializes error to JSON-safe object for HTTP responses.
   * @returns {object} Serializable error object (excludes sensitive data in production).
   */
  toJSON() {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      error: this.message,
      code: this.code,
      ...(isProduction ? {} : { name: this.name }),
    };
  }

  /**
   * Serializes error with full context for structured logging.
   * @returns {object} Complete error details for Cloud Logging.
   */
  toLog() {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      stack: this.stack,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Validation Error — 400 Bad Request.
 * Used when user input fails schema/format validation.
 */
export class ValidationError extends AppError {
  /**
   * @param {string} message - Validation error message.
   * @param {object} [context={}] - Additional details (field, expectedFormat, etc.).
   */
  constructor(message, context = {}) {
    super(message, 400, 'VALIDATION_ERROR', context);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Authentication Error — 401 Unauthorized.
 * Used when auth token is missing, invalid, or expired.
 */
export class AuthenticationError extends AppError {
  /**
   * @param {string} [message='Authentication required'] - Error message.
   * @param {object} [context={}] - Additional details (reason, attemptedEndpoint, etc.).
   */
  constructor(message = 'Authentication required', context = {}) {
    super(message, 401, 'AUTHENTICATION_ERROR', context);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization Error — 403 Forbidden.
 * Used when authenticated user lacks required permissions.
 */
export class AuthorizationError extends AppError {
  /**
   * @param {string} [message='Access denied'] - Error message.
   * @param {object} [context={}] - Additional details (requiredRole, resource, etc.).
   */
  constructor(message = 'Access denied', context = {}) {
    super(message, 403, 'AUTHORIZATION_ERROR', context);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Not Found Error — 404 Not Found.
 * Used when a requested resource doesn't exist.
 */
export class NotFoundError extends AppError {
  /**
   * @param {string} [resourceType='Resource'] - Type of resource (e.g., 'User', 'Query').
   * @param {string} [identifier=''] - ID or name of the missing resource.
   */
  constructor(resourceType = 'Resource', identifier = '') {
    const message = identifier
      ? `${resourceType} "${identifier}" not found`
      : `${resourceType} not found`;
    super(message, 404, 'NOT_FOUND', { resourceType, identifier });
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * External Service Error — 502 Bad Gateway / 503 Service Unavailable.
 * Used when an external API, database, or service fails.
 */
export class ExternalServiceError extends AppError {
  /**
   * @param {string} serviceName - Name of the external service (e.g., 'ECI API', 'PostgreSQL').
   * @param {string} [message='Service unavailable'] - Error message.
   * @param {number} [statusCode=502] - HTTP status (502 for bad gateway, 503 for unavailable).
   * @param {object} [context={}] - Additional details (originalError, retryCount, etc.).
   */
  constructor(serviceName, message = 'Service unavailable', statusCode = 502, context = {}) {
    super(message, statusCode, 'EXTERNAL_SERVICE_ERROR', { serviceName, ...context });
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

/**
 * Rate Limit Error — 429 Too Many Requests.
 * Used when a request exceeds rate limits.
 */
export class RateLimitError extends AppError {
  /**
   * @param {string} [message='Too many requests'] - Error message.
   * @param {object} [context={}] - Additional details (retryAfter, limit, window, etc.).
   */
  constructor(message = 'Too many requests', context = {}) {
    super(message, 429, 'RATE_LIMIT_ERROR', context);
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Configuration Error — 500 Internal Server Error.
 * Used when required configuration/environment variables are missing.
 */
export class ConfigurationError extends AppError {
  /**
   * @param {string} configName - Name of the missing/invalid configuration.
   * @param {string} [hint=''] - Suggestion for fixing the issue.
   */
  constructor(configName, hint = '') {
    super(
      `Configuration error: ${configName} is not configured`,
      500,
      'CONFIGURATION_ERROR',
      { configName, hint }
    );
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Database Error — 500 Internal Server Error.
 * Wraps database operation failures with consistent handling.
 */
export class DatabaseError extends AppError {
  /**
   * @param {string} operation - Database operation (e.g., 'INSERT', 'SELECT').
   * @param {string} [message='Database operation failed'] - Error message.
   * @param {object} [context={}] - Additional details (table, originalError, etc.).
   */
  constructor(operation, message = 'Database operation failed', context = {}) {
    super(message, 500, 'DATABASE_ERROR', { operation, ...context });
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * Type checking utility — verifies that a value has the expected type.
 * Used to ensure runtime type safety before critical operations.
 * @param {*} value - The value to check.
 * @param {string} expectedType - The expected type name (e.g., 'string', 'number', 'object').
 * @param {string} fieldName - Name of the field for error context.
 * @throws {ValidationError} If the value is not of the expected type.
 */
export const ensureType = (value, expectedType, fieldName) => {
  const actualType = typeof value;
  if (actualType !== expectedType) {
    throw new ValidationError(
      `${fieldName} must be of type ${expectedType}`,
      { expectedType, actualType, fieldName }
    );
  }
};

/**
 * Checks that a required value is not null/undefined.
 * @param {*} value - The value to check.
 * @param {string} fieldName - Name of the field for error context.
 * @throws {ValidationError} If the value is null or undefined.
 */
export const ensureNotNull = (value, fieldName) => {
  if (value === null || value === undefined) {
    throw new ValidationError(
      `${fieldName} is required and cannot be null or undefined`,
      { fieldName }
    );
  }
};
