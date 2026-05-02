/**
 * Structured JSON logger for Google Cloud Logging.
 * Cloud Logging automatically parses JSON-structured stdout lines
 * when running on GKE/Cloud Run. Uses severity levels that map
 * directly to Cloud Logging severity enums.
 *
 * In development, falls back to human-readable console output.
 * @see https://cloud.google.com/logging/docs/structured-logging
 * @module config/logger
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Formats a log entry as a Cloud Logging-compatible JSON line.
 * @param {string} severity - Cloud Logging severity (INFO, WARNING, ERROR, etc.).
 * @param {string} message - The log message.
 * @param {object} [context] - Additional structured fields.
 * @returns {string} JSON string for stdout.
 */
const formatEntry = (severity, message, context = {}) => {
  const entry = {
    severity,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  // Add Cloud Trace correlation if available (from X-Cloud-Trace-Context header)
  if (context.traceId) {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
    if (projectId) {
      entry['logging.googleapis.com/trace'] = `projects/${projectId}/traces/${context.traceId}`;
    }
  }

  return JSON.stringify(entry);
};

/**
 * Logger with Cloud Logging severity levels.
 * In production: outputs structured JSON to stdout.
 * In development: uses readable console.* methods.
 */
const logger = {
  /**
   * Informational log — routine operations.
   * @param {string} message - Log message.
   * @param {object} [context] - Structured context.
   */
  info(message, context = {}) {
    if (IS_PRODUCTION) {
      process.stdout.write(formatEntry('INFO', message, context) + '\n');
    } else {
      console.log(`[INFO] ${message}`, Object.keys(context).length ? context : '');
    }
  },

  /**
   * Warning log — degraded but functional state.
   * @param {string} message - Log message.
   * @param {object} [context] - Structured context.
   */
  warn(message, context = {}) {
    if (IS_PRODUCTION) {
      process.stdout.write(formatEntry('WARNING', message, context) + '\n');
    } else {
      console.warn(`[WARN] ${message}`, Object.keys(context).length ? context : '');
    }
  },

  /**
   * Error log — something failed.
   * @param {string} message - Log message.
   * @param {object} [context] - Structured context (include { error: err.message }).
   */
  error(message, context = {}) {
    if (IS_PRODUCTION) {
      process.stderr.write(formatEntry('ERROR', message, context) + '\n');
    } else {
      console.error(`[ERROR] ${message}`, Object.keys(context).length ? context : '');
    }
  },

  /**
   * Debug log — only in development.
   * @param {string} message - Log message.
   * @param {object} [context] - Structured context.
   */
  debug(message, context = {}) {
    if (!IS_PRODUCTION) {
      console.debug(`[DEBUG] ${message}`, Object.keys(context).length ? context : '');
    }
  },

  /**
   * Creates a child logger with bound context (e.g. requestId, userId).
   * @param {object} boundContext - Fields to include in every log entry.
   * @returns {object} Logger with bound context.
   */
  child(boundContext) {
    return {
      info: (msg, ctx = {}) => logger.info(msg, { ...boundContext, ...ctx }),
      warn: (msg, ctx = {}) => logger.warn(msg, { ...boundContext, ...ctx }),
      error: (msg, ctx = {}) => logger.error(msg, { ...boundContext, ...ctx }),
      debug: (msg, ctx = {}) => logger.debug(msg, { ...boundContext, ...ctx }),
    };
  },
};

export default logger;
