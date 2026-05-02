import logger from '../config/logger.js';

/**
 * Global error handler middleware.
 * Outputs structured JSON errors for Cloud Logging correlation.
 * Never exposes internal stack traces to clients in production.
 * @module middleware/error
 */
export const errorHandler = (err, req, res, _next) => {
  const statusCode = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Structured error log for Cloud Logging
  logger.error('Request error', {
    httpRequest: {
      requestMethod: req.method,
      requestUrl: req.originalUrl,
      status: statusCode,
      remoteIp: req.ip,
    },
    error: err.message,
    stack: isProduction ? undefined : err.stack,
    traceId: req.traceId,
  });

  // Client response — never leak internals in production
  const response = {
    error: statusCode >= 500 && isProduction
      ? 'An unexpected error occurred.'
      : err.message || 'An unexpected error occurred.',
  };

  if (!isProduction && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
