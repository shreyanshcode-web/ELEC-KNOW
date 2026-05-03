import { KNOWLEDGE_LEVELS, MAX_QUERY_LENGTH } from '../config/constants.js';
import { validateString, validateEpic, validateChoice } from '../utils/validation.js';
import { sendValidationError } from '../utils/response.js';

/**
 * Input validation and sanitization middleware.
 * Defends against XSS, SQL injection payloads, and oversized inputs.
 * All user-facing strings are validated, sanitized, and type-checked
 * before reaching any downstream service.
 * @module middleware/validation
 */

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
  try {
    const { query, knowledgeLevel } = req.body;

    // ── Query validation ────────────────────────────────
    if (!query || typeof query !== 'string') {
      return sendValidationError(res, 'Query is missing or invalid.', {
        field: 'query',
        hint: 'Provide a non-empty string in the "query" field.',
      });
    }

    // ── Sanitize & validate ────────────────────────────
    const sanitizedQuery = validateString(query, { maxLength: MAX_QUERY_LENGTH });
    req.body.query = sanitizedQuery;

    // ── Knowledge level validation ──────────────────────
    if (knowledgeLevel) {
      try {
        req.body.knowledgeLevel = validateChoice(knowledgeLevel, KNOWLEDGE_LEVELS, 'knowledgeLevel');
      } catch (err) {
        return sendValidationError(res, err.message, {
          field: 'knowledgeLevel',
          allowed: KNOWLEDGE_LEVELS,
        });
      }
    } else {
      // Default to Beginner if not provided
      req.body.knowledgeLevel = KNOWLEDGE_LEVELS[0];
    }

    next();
  } catch (err) {
    return sendValidationError(res, err.message, { error: err.context });
  }
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
  try {
    const { epicNumber } = req.params;

    if (!epicNumber || typeof epicNumber !== 'string') {
      return sendValidationError(res, 'EPIC number is required.', {
        field: 'epicNumber',
        hint: 'Provide the EPIC number as a route parameter.',
      });
    }

    const validated = validateEpic(epicNumber);
    req.params.epicNumber = validated;

    next();
  } catch (err) {
    return sendValidationError(res, err.message, {
      field: 'epicNumber',
      expected: '3 uppercase letters + 7 digits (e.g., ABC1234567)',
    });
  }
};
