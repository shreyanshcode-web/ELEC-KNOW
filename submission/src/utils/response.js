/**
 * HTTP response helper utilities.
 * Provides standardized response formatting for success and error cases,
 * ensuring consistent structure across all API endpoints.
 * @module utils/response
 */

import { HTTP_STATUS } from '../config/constants.js';

/**
 * Sends a standardized success response.
 * @param {import('express').Response} res - Express response object.
 * @param {*} data - Response data payload.
 * @param {object} [options={}] - Response options.
 * @param {number} [options.statusCode=200] - HTTP status code.
 * @param {string} [options.message] - Optional success message.
 * @param {object} [options.metadata={}] - Additional metadata (pagination, etc.).
 * @returns {void}
 */
export const sendSuccess = (res, data, options = {}) => {
  const {
    statusCode = HTTP_STATUS.OK,
    message,
    metadata = {},
  } = options;

  const response = {
    success: true,
    data,
    ...(message ? { message } : {}),
    ...metadata,
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
};

/**
 * Sends a standardized created response (201).
 * Used for endpoints that create new resources.
 * @param {import('express').Response} res - Express response object.
 * @param {*} data - Created resource data.
 * @param {string} [message='Resource created successfully'] - Success message.
 * @param {object} [metadata={}] - Additional metadata.
 * @returns {void}
 */
export const sendCreated = (res, data, message = 'Resource created successfully', metadata = {}) => {
  sendSuccess(res, data, { statusCode: HTTP_STATUS.CREATED, message, metadata });
};

/**
 * Sends a paginated success response with metadata.
 * @param {import('express').Response} res - Express response object.
 * @param {Array} items - Array of items.
 * @param {object} pagination - Pagination information.
 * @param {number} pagination.total - Total number of items.
 * @param {number} pagination.limit - Items per page.
 * @param {number} pagination.offset - Number of items skipped.
 * @param {string} [message] - Optional message.
 * @returns {void}
 */
export const sendPaginated = (res, items, pagination, message = 'Items retrieved successfully') => {
  const page = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  sendSuccess(res, items, {
    message,
    metadata: {
      pagination: {
        total: pagination.total,
        page,
        limit: pagination.limit,
        pages: totalPages,
      },
    },
  });
};

/**
 * Sends a standardized error response.
 * @param {import('express').Response} res - Express response object.
 * @param {number} statusCode - HTTP status code.
 * @param {string} message - Error message.
 * @param {string} [code='ERROR'] - Machine-readable error code.
 * @param {object} [details={}] - Additional error details.
 * @returns {void}
 */
export const sendError = (res, statusCode, message, code = 'ERROR', details = {}) => {
  const isProduction = process.env.NODE_ENV === 'production';

  const response = {
    success: false,
    error: message,
    code,
    ...(isProduction ? {} : { details }),
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
};

/**
 * Sends a validation error response (400).
 * @param {import('express').Response} res - Express response object.
 * @param {string} message - Validation error message.
 * @param {object} [details={}] - Validation details (field, hint, etc.).
 * @returns {void}
 */
export const sendValidationError = (res, message, details = {}) => {
  sendError(res, HTTP_STATUS.BAD_REQUEST, message, 'VALIDATION_ERROR', details);
};

/**
 * Sends an authentication error response (401).
 * @param {import('express').Response} res - Express response object.
 * @param {string} [message='Unauthorized'] - Error message.
 * @returns {void}
 */
export const sendUnauthorized = (res, message = 'Unauthorized') => {
  sendError(res, HTTP_STATUS.UNAUTHORIZED, message, 'UNAUTHORIZED');
};

/**
 * Sends a forbidden error response (403).
 * @param {import('express').Response} res - Express response object.
 * @param {string} [message='Access denied'] - Error message.
 * @returns {void}
 */
export const sendForbidden = (res, message = 'Access denied') => {
  sendError(res, HTTP_STATUS.FORBIDDEN, message, 'FORBIDDEN');
};

/**
 * Sends a not found error response (404).
 * @param {import('express').Response} res - Express response object.
 * @param {string} [resourceType='Resource'] - Type of resource that wasn't found.
 * @param {string} [identifier=''] - Identifier of the missing resource.
 * @returns {void}
 */
export const sendNotFound = (res, resourceType = 'Resource', identifier = '') => {
  const message = identifier
    ? `${resourceType} "${identifier}" not found`
    : `${resourceType} not found`;
  sendError(res, HTTP_STATUS.NOT_FOUND, message, 'NOT_FOUND');
};

/**
 * Sends a rate limit error response (429).
 * @param {import('express').Response} res - Express response object.
 * @param {string} [message='Too many requests'] - Error message.
 * @param {object} [retryInfo={}] - Retry information (retryAfter, limit, etc.).
 * @returns {void}
 */
export const sendRateLimitError = (res, message = 'Too many requests', retryInfo = {}) => {
  res.set('Retry-After', retryInfo.retryAfter || '60');
  sendError(res, HTTP_STATUS.TOO_MANY_REQUESTS, message, 'RATE_LIMIT_ERROR', retryInfo);
};

/**
 * Sends an internal server error response (500).
 * @param {import('express').Response} res - Express response object.
 * @param {string} [message='Internal server error'] - Error message.
 * @param {object} [context={}] - Additional error context (not shown in production).
 * @returns {void}
 */
export const sendInternalError = (res, message = 'Internal server error', context = {}) => {
  sendError(res, HTTP_STATUS.INTERNAL_ERROR, message, 'INTERNAL_ERROR', context);
};

/**
 * Sends a service unavailable error response (503).
 * Used when external services or infrastructure is down.
 * @param {import('express').Response} res - Express response object.
 * @param {string} [message='Service temporarily unavailable'] - Error message.
 * @param {string} [service=''] - Name of unavailable service.
 * @returns {void}
 */
export const sendServiceUnavailable = (res, message = 'Service temporarily unavailable', service = '') => {
  sendError(res, HTTP_STATUS.SERVICE_UNAVAILABLE, message, 'SERVICE_UNAVAILABLE', { service });
};

/**
 * Sends a conflict error response (409).
 * Used when a request conflicts with existing data (e.g., duplicate key).
 * @param {import('express').Response} res - Express response object.
 * @param {string} message - Conflict error message.
 * @param {object} [details={}] - Conflict details.
 * @returns {void}
 */
export const sendConflict = (res, message, details = {}) => {
  sendError(res, HTTP_STATUS.CONFLICT, message, 'CONFLICT', details);
};

/**
 * Sends a no-content response (204).
 * Used for successful requests that don't return data (DELETE, etc.).
 * @param {import('express').Response} res - Express response object.
 * @returns {void}
 */
export const sendNoContent = (res) => {
  res.status(HTTP_STATUS.NO_CONTENT).send();
};

/**
 * Sends an accepted response (202).
 * Used for requests that have been accepted for processing but not yet complete.
 * @param {import('express').Response} res - Express response object.
 * @param {string} [message='Request accepted for processing'] - Message.
 * @param {object} [data={}] - Additional data (job ID, etc.).
 * @returns {void}
 */
export const sendAccepted = (res, message = 'Request accepted for processing', data = {}) => {
  sendSuccess(res, data, { statusCode: HTTP_STATUS.ACCEPTED, message });
};
