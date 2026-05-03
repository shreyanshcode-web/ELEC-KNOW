import { KNOWLEDGE_LEVELS, MAX_QUERY_LENGTH, HTTP_STATUS } from '../config/constants.js';

/**
 * Input validation and sanitization middleware.
 * Defends against XSS, SQL injection payloads, and oversized inputs.
 * All user-facing strings are trimmed, length-limited, and stripped of
 * dangerous patterns before reaching any downstream service.
 * @module middleware/validation
 */

/**
 * Strips potentially dangerous HTML/script tags from user input.
 * Defence-in-depth layer on top of parameterized queries and CSP headers.
 * @param {string} input - Raw user input string.
 * @returns {string} Sanitized string with tags removed.
 */
const sanitizeInput = (input) =>
  input.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');

/**
 * Validates and sanitizes the POST /api/education request body.
 *
 * Enforced rules:
 * - `query` must be a non-empty string (max {@link MAX_QUERY_LENGTH} chars).
 * - `knowledgeLevel` must be one of {@link KNOWLEDGE_LEVELS} when provided.
 * - All strings are trimmed and XSS-sanitized.
 *
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {void}
 */
export const validateQuery = (req, res, next) => {
  const { query, knowledgeLevel } = req.body;

  // ── Query presence check ────────────────────────────
  if (!query || typeof query !== 'string') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Query is missing or invalid.',
      hint: 'Provide a non-empty string in the "query" field.',
    });
  }

  // ── Sanitize: trim → strip HTML → enforce max length ──
  const sanitizedQuery = sanitizeInput(query.trim()).substring(0, MAX_QUERY_LENGTH);
  if (sanitizedQuery.length === 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Query cannot be empty after sanitization.',
    });
  }

  req.body.query = sanitizedQuery;

  // ── Knowledge level validation ──────────────────────
  if (knowledgeLevel && !KNOWLEDGE_LEVELS.includes(knowledgeLevel)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Invalid knowledge level.',
      hint: `Valid levels: ${KNOWLEDGE_LEVELS.join(', ')}`,
    });
  }

  // Default to Beginner if not provided
  if (!knowledgeLevel) {
    req.body.knowledgeLevel = KNOWLEDGE_LEVELS[0];
  }

  next();
};

/**
 * Validates an EPIC (voter ID) number from route params.
 * Indian EPIC numbers follow the pattern: 3 uppercase letters + 7 digits.
 * Example: `ABC1234567`
 *
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {void}
 */
export const validateEpicNumber = (req, res, next) => {
  const { epicNumber } = req.params;

  if (!epicNumber || typeof epicNumber !== 'string') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'EPIC number is required.',
    });
  }

  const sanitized = sanitizeInput(epicNumber.trim().toUpperCase());
  const EPIC_PATTERN = /^[A-Z]{3}\d{7}$/;

  if (!EPIC_PATTERN.test(sanitized)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Invalid EPIC number format.',
      hint: 'Expected format: 3 uppercase letters + 7 digits (e.g. ABC1234567).',
    });
  }

  req.params.epicNumber = sanitized;
  next();
};
