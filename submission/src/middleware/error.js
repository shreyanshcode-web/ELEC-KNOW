import logger from '../config/logger.js';
import { AppError } from '../utils/errors.js';
import { sendError, sendInternalError } from '../utils/response.js';

/**
 * Global error handler middleware.
 * Outputs structured JSON errors for Cloud Logging correlation.
 * Handles both custom AppError instances and generic errors uniformly.
 * Never exposes internal stack traces to clients in production.
 * @module middleware/error
 */

/**
 * Express error handler middleware.
 * Must have 4 parameters (err, req, res, next) for Express to recognize as error handler.
 * @param {Error|AppError} err - The error object.
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} _next - Express next (unused but required).
 * @returns {void}
 */
export const errorHandler = (err, req, res, _next) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Determine status code and structure
  let statusCode = err.statusCode || err.status || 500;
  let errorCode = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // Structured error log for Cloud Logging
  logger.error('Request error', {
    httpRequest: {
      requestMethod: req.method,
      requestUrl: req.originalUrl,
      status: statusCode,
      remoteIp: req.ip,
    },
    error: message,
    code: errorCode,
    stack: isProduction ? undefined : err.stack,
    context: err.context || {},
    traceId: req.traceId,
  });

  // For custom AppError instances, use structured logging
  if (err instanceof AppError) {
    sendError(res, statusCode, message, errorCode, isProduction ? {} : err.context || {});
  } else {
    // For generic errors, provide generic message in production
    const clientMessage = isProduction
      ? 'An unexpected error occurred. Please try again later.'
      : message;

    sendInternalError(res, clientMessage, isProduction ? {} : { stack: err.stack });
  }
};

/**
 * Not Found handler middleware.
 * Catches all undefined routes and responds with 404.
 * Should be placed after all other route handlers.
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @returns {void}
 */
export const notFoundHandler = (req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  sendError(res, 404, `Cannot ${req.method} ${req.path}`, 'ROUTE_NOT_FOUND');
};
