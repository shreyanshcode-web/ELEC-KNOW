/**
 * Input validation and sanitization utilities.
 * Centralized validation logic for reuse across middleware and services.
 * Prevents XSS, injection attacks, and enforces type safety.
 * @module utils/validation
 */

import { ValidationError } from './errors.js';

/**
 * EPIC number pattern: 3 uppercase letters + 7 digits.
 * Example: ABC1234567
 * @type {RegExp}
 */
const EPIC_PATTERN = /^[A-Z]{3}\d{7}$/;

/**
 * Email pattern for basic validation.
 * Note: RFC 5322 is complex; this is pragmatic for most use cases.
 * @type {RegExp}
 */
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * UUID v4 pattern.
 * @type {RegExp}
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Sanitizes user input by removing potentially dangerous HTML/script tags.
 * Defense-in-depth layer on top of parameterized queries and CSP headers.
 * @param {string} input - Raw user input string.
 * @returns {string} Sanitized string with tags removed.
 * @throws {ValidationError} If input is not a string.
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string', { received: typeof input });
  }
  return input.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
};

/**
 * Validates and sanitizes a string input.
 * Trims whitespace, removes HTML tags, enforces max length.
 * @param {string} input - Raw input string.
 * @param {object} [options={}] - Validation options.
 * @param {number} [options.maxLength=500] - Maximum allowed length.
 * @param {boolean} [options.allowEmpty=false] - Allow empty strings after sanitization.
 * @returns {string} Sanitized string.
 * @throws {ValidationError} If input fails validation.
 */
export const validateString = (input, options = {}) => {
  const { maxLength = 500, allowEmpty = false } = options;

  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string', { received: typeof input });
  }

  const sanitized = sanitizeInput(input.trim());

  if (!allowEmpty && sanitized.length === 0) {
    throw new ValidationError('String cannot be empty after sanitization');
  }

  if (sanitized.length > maxLength) {
    throw new ValidationError(
      `String exceeds maximum length of ${maxLength} characters`,
      { maxLength, actualLength: sanitized.length }
    );
  }

  return sanitized;
};

/**
 * Validates an EPIC (voter ID) number format.
 * Pattern: 3 uppercase letters + 7 digits (e.g., ABC1234567).
 * @param {string} epicNumber - The EPIC to validate.
 * @returns {string} Normalized (uppercased) EPIC number.
 * @throws {ValidationError} If EPIC format is invalid.
 */
export const validateEpic = (epicNumber) => {
  const normalized = sanitizeInput(String(epicNumber).trim().toUpperCase());

  if (!EPIC_PATTERN.test(normalized)) {
    throw new ValidationError(
      'Invalid EPIC number format',
      {
        expected: '3 uppercase letters + 7 digits (e.g., ABC1234567)',
        received: epicNumber,
      }
    );
  }

  return normalized;
};

/**
 * Validates an email address.
 * Uses pragmatic regex pattern (not full RFC 5322 due to complexity).
 * @param {string} email - The email to validate.
 * @returns {string} Normalized (lowercased) email.
 * @throws {ValidationError} If email format is invalid.
 */
export const validateEmail = (email) => {
  const normalized = sanitizeInput(String(email).trim().toLowerCase());

  if (!EMAIL_PATTERN.test(normalized)) {
    throw new ValidationError(
      'Invalid email address format',
      { received: email }
    );
  }

  return normalized;
};

/**
 * Validates a UUID v4.
 * @param {string} uuid - The UUID to validate.
 * @returns {string} Lowercase UUID.
 * @throws {ValidationError} If UUID format is invalid.
 */
export const validateUUID = (uuid) => {
  const normalized = String(uuid).trim().toLowerCase();

  if (!UUID_PATTERN.test(normalized)) {
    throw new ValidationError(
      'Invalid UUID v4 format',
      { received: uuid }
    );
  }

  return normalized;
};

/**
 * Validates a choice is within allowed values.
 * @param {*} value - The value to validate.
 * @param {Array} allowedValues - Array of valid choices.
 * @param {string} fieldName - Name of the field for error context.
 * @returns {*} The validated value.
 * @throws {ValidationError} If value is not in allowedValues.
 */
export const validateChoice = (value, allowedValues, fieldName) => {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `Invalid ${fieldName}`,
      {
        received: value,
        allowed: allowedValues,
      }
    );
  }
  return value;
};

/**
 * Validates an integer within a range.
 * @param {*} value - The value to validate.
 * @param {object} [options={}] - Range options.
 * @param {number} [options.min=Number.MIN_SAFE_INTEGER] - Minimum allowed value.
 * @param {number} [options.max=Number.MAX_SAFE_INTEGER] - Maximum allowed value.
 * @param {string} [options.fieldName='value'] - Name for error context.
 * @returns {number} Validated integer.
 * @throws {ValidationError} If value is not a valid integer in range.
 */
export const validateInteger = (value, options = {}) => {
  const { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, fieldName = 'value' } = options;

  if (!Number.isInteger(value)) {
    throw new ValidationError(
      `${fieldName} must be an integer`,
      { received: value }
    );
  }

  if (value < min || value > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max}`,
      { received: value, min, max }
    );
  }

  return value;
};

/**
 * Validates a numeric value within a range.
 * @param {*} value - The value to validate.
 * @param {object} [options={}] - Range options.
 * @param {number} [options.min=0] - Minimum allowed value.
 * @param {number} [options.max=1] - Maximum allowed value.
 * @param {string} [options.fieldName='value'] - Name for error context.
 * @returns {number} Validated number.
 * @throws {ValidationError} If value is not a valid number in range.
 */
export const validateNumber = (value, options = {}) => {
  const { min = 0, max = 1, fieldName = 'value' } = options;

  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError(
      `${fieldName} must be a valid number`,
      { received: value }
    );
  }

  if (value < min || value > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max}`,
      { received: value, min, max }
    );
  }

  return value;
};

/**
 * Validates object shape against a schema.
 * Ensures all required fields are present and optionally checks types.
 * @param {object} obj - Object to validate.
 * @param {Array<string>} requiredFields - Required field names.
 * @param {object} [optionalFields={}] - Optional fields with type expectations (e.g., { age: 'number' }).
 * @returns {object} The validated object.
 * @throws {ValidationError} If required fields are missing or types don't match.
 */
export const validateSchema = (obj, requiredFields = [], optionalFields = {}) => {
  if (!obj || typeof obj !== 'object') {
    throw new ValidationError('Input must be an object', { received: typeof obj });
  }

  // Check required fields
  for (const field of requiredFields) {
    if (!(field in obj) || obj[field] === null || obj[field] === undefined) {
      throw new ValidationError(
        `Required field "${field}" is missing`,
        { missingField: field }
      );
    }
  }

  // Check optional fields (if provided)
  for (const [field, expectedType] of Object.entries(optionalFields)) {
    if (field in obj && obj[field] !== null && obj[field] !== undefined) {
      if (typeof obj[field] !== expectedType) {
        throw new ValidationError(
          `Field "${field}" must be of type ${expectedType}`,
          { field, expectedType, received: typeof obj[field] }
        );
      }
    }
  }

  return obj;
};

/**
 * Validates pagination parameters.
 * @param {*} limit - Limit parameter.
 * @param {*} offset - Offset parameter.
 * @param {object} [options={}] - Options.
 * @param {number} [options.maxLimit=100] - Maximum allowed limit.
 * @param {number} [options.defaultLimit=20] - Default limit if not provided.
 * @returns {object} { limit, offset } validated and constrained.
 * @throws {ValidationError} If parameters are invalid.
 */
export const validatePagination = (limit, offset, options = {}) => {
  const { maxLimit = 100, defaultLimit = 20 } = options;

  let validatedLimit = defaultLimit;
  let validatedOffset = 0;

  if (limit !== undefined && limit !== null) {
    validatedLimit = validateInteger(limit, { min: 1, max: maxLimit, fieldName: 'limit' });
  }

  if (offset !== undefined && offset !== null) {
    validatedOffset = validateInteger(offset, { min: 0, fieldName: 'offset' });
  }

  return { limit: validatedLimit, offset: validatedOffset };
};
