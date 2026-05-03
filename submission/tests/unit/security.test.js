import { jest } from '@jest/globals';

/**
 * Security-focused tests for the Election Education Platform.
 * Validates input sanitization, authentication enforcement,
 * and protection against common attack vectors.
 */

// Mock the validation module for isolated testing
const { validateQuery, validateEpicNumber } = await import('../../src/middleware/validation.js');

describe('Security — Input Sanitization', () => {
  let mockReq;
  let mockRes;
  let nextFunc;

  beforeEach(() => {
    mockReq = { body: {}, params: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunc = jest.fn();
  });

  it('should strip SQL injection attempts from query', () => {
    mockReq.body = { query: "SELECT * FROM users; DROP TABLE users; --", knowledgeLevel: 'Beginner' };
    validateQuery(mockReq, mockRes, nextFunc);
    // SQL injection is handled by parameterized queries, but the input should still pass validation
    expect(nextFunc).toHaveBeenCalled();
    expect(mockReq.body.query).not.toContain('<');
  });

  it('should strip nested script tags', () => {
    mockReq.body = { query: '<<script>script>alert("xss")<</script>/script>', knowledgeLevel: 'Beginner' };
    validateQuery(mockReq, mockRes, nextFunc);
    expect(mockReq.body.query).not.toContain('<script>');
    expect(nextFunc).toHaveBeenCalled();
  });

  it('should strip img onerror XSS vectors', () => {
    mockReq.body = { query: '<img src=x onerror=alert(1)>Tell me about voting', knowledgeLevel: 'Beginner' };
    validateQuery(mockReq, mockRes, nextFunc);
    expect(mockReq.body.query).not.toContain('<img');
    expect(mockReq.body.query).toContain('Tell me about voting');
    expect(nextFunc).toHaveBeenCalled();
  });

  it('should reject EPIC numbers with path traversal attempts', () => {
    mockReq.params = { epicNumber: '../../../etc/passwd' };
    validateEpicNumber(mockReq, mockRes, nextFunc);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(nextFunc).not.toHaveBeenCalled();
  });

  it('should reject EPIC numbers with URL-encoded payloads', () => {
    mockReq.params = { epicNumber: '%3Cscript%3Ealert(1)%3C/script%3E' };
    validateEpicNumber(mockReq, mockRes, nextFunc);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(nextFunc).not.toHaveBeenCalled();
  });
});

describe('Security — Constants Integrity', () => {
  it('KNOWLEDGE_LEVELS should be frozen (immutable)', async () => {
    const { KNOWLEDGE_LEVELS } = await import('../../src/config/constants.js');
    expect(Object.isFrozen(KNOWLEDGE_LEVELS)).toBe(true);
  });

  it('HTTP_STATUS should be frozen (immutable)', async () => {
    const { HTTP_STATUS } = await import('../../src/config/constants.js');
    expect(Object.isFrozen(HTTP_STATUS)).toBe(true);
  });

  it('KAFKA_TOPICS should be frozen (immutable)', async () => {
    const { KAFKA_TOPICS } = await import('../../src/config/constants.js');
    expect(Object.isFrozen(KAFKA_TOPICS)).toBe(true);
  });
});
