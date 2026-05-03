import { jest } from '@jest/globals';
import { validateQuery, validateEpicNumber } from '../../src/middleware/validation.js';

/**
 * Comprehensive unit tests for input validation middleware.
 * Covers: sanitization, length limits, XSS prevention, EPIC format,
 * knowledge level validation, and edge cases.
 */
describe('Validation Middleware — validateQuery', () => {
  let mockReq;
  let mockRes;
  let nextFunc;

  beforeEach(() => {
    mockReq = { body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunc = jest.fn();
  });

  // ── Happy path ──────────────────────────────────────
  it('should accept a valid query and call next()', () => {
    mockReq.body = { query: 'How does voting work?', knowledgeLevel: 'Beginner' };
    validateQuery(mockReq, mockRes, nextFunc);
    expect(nextFunc).toHaveBeenCalledTimes(1);
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should default knowledgeLevel to Beginner when not provided', () => {
    mockReq.body = { query: 'What is an election?' };
    validateQuery(mockReq, mockRes, nextFunc);
    expect(mockReq.body.knowledgeLevel).toBe('Beginner');
    expect(nextFunc).toHaveBeenCalled();
  });

  // ── Sanitization ────────────────────────────────────
  it('should trim whitespace from queries', () => {
    mockReq.body = { query: '   How does voting work?   ', knowledgeLevel: 'Beginner' };
    validateQuery(mockReq, mockRes, nextFunc);
    expect(mockReq.body.query).toBe('How does voting work?');
    expect(nextFunc).toHaveBeenCalled();
  });

  it('should truncate queries exceeding 500 characters', () => {
    mockReq.body = { query: 'A'.repeat(600), knowledgeLevel: 'Beginner' };
    validateQuery(mockReq, mockRes, nextFunc);
    expect(mockReq.body.query.length).toBe(500);
    expect(nextFunc).toHaveBeenCalled();
  });

  it('should strip HTML tags from query input (XSS prevention)', () => {
    mockReq.body = { query: '<script>alert("xss")</script>How to vote?', knowledgeLevel: 'Beginner' };
    validateQuery(mockReq, mockRes, nextFunc);
    expect(mockReq.body.query).toBe('alert("xss")How to vote?');
    expect(mockReq.body.query).not.toContain('<script>');
    expect(nextFunc).toHaveBeenCalled();
  });

  // ── Rejection cases ─────────────────────────────────
  it('should reject missing query field', () => {
    mockReq.body = { knowledgeLevel: 'Beginner' };
    validateQuery(mockReq, mockRes, nextFunc);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    expect(nextFunc).not.toHaveBeenCalled();
  });

  it('should reject non-string query', () => {
    mockReq.body = { query: 42, knowledgeLevel: 'Beginner' };
    validateQuery(mockReq, mockRes, nextFunc);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(nextFunc).not.toHaveBeenCalled();
  });

  it('should reject empty string query', () => {
    mockReq.body = { query: '   ', knowledgeLevel: 'Beginner' };
    validateQuery(mockReq, mockRes, nextFunc);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(nextFunc).not.toHaveBeenCalled();
  });

  it('should reject invalid knowledge level', () => {
    mockReq.body = { query: 'How to vote?', knowledgeLevel: 'ExpertLevel' };
    validateQuery(mockReq, mockRes, nextFunc);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('Invalid knowledge level'),
    }));
    expect(nextFunc).not.toHaveBeenCalled();
  });

  it('should accept all three valid knowledge levels', () => {
    for (const level of ['Beginner', 'Intermediate', 'Advanced']) {
      nextFunc.mockClear();
      mockReq.body = { query: 'Test question', knowledgeLevel: level };
      validateQuery(mockReq, mockRes, nextFunc);
      expect(nextFunc).toHaveBeenCalled();
    }
  });
});

describe('Validation Middleware — validateEpicNumber', () => {
  let mockReq;
  let mockRes;
  let nextFunc;

  beforeEach(() => {
    mockReq = { params: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunc = jest.fn();
  });

  it('should accept a valid EPIC number (e.g. ABC1234567)', () => {
    mockReq.params = { epicNumber: 'ABC1234567' };
    validateEpicNumber(mockReq, mockRes, nextFunc);
    expect(nextFunc).toHaveBeenCalled();
    expect(mockReq.params.epicNumber).toBe('ABC1234567');
  });

  it('should uppercase lowercase EPIC numbers', () => {
    mockReq.params = { epicNumber: 'abc1234567' };
    validateEpicNumber(mockReq, mockRes, nextFunc);
    expect(mockReq.params.epicNumber).toBe('ABC1234567');
    expect(nextFunc).toHaveBeenCalled();
  });

  it('should reject EPIC with wrong format (too short)', () => {
    mockReq.params = { epicNumber: 'AB123' };
    validateEpicNumber(mockReq, mockRes, nextFunc);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(nextFunc).not.toHaveBeenCalled();
  });

  it('should reject EPIC with special characters', () => {
    mockReq.params = { epicNumber: 'ABC<script>' };
    validateEpicNumber(mockReq, mockRes, nextFunc);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(nextFunc).not.toHaveBeenCalled();
  });

  it('should reject missing EPIC parameter', () => {
    mockReq.params = {};
    validateEpicNumber(mockReq, mockRes, nextFunc);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(nextFunc).not.toHaveBeenCalled();
  });
});
