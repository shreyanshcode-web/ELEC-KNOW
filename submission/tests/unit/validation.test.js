import { jest } from '@jest/globals';
import { validateQuery } from '../../src/middleware/validation.js';

describe('Validation Middleware Unit Tests', () => {
  let mockReq;
  let mockRes;
  let nextFunc;

  beforeEach(() => {
    mockReq = {
      body: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunc = jest.fn();
  });

  it('should sanitize long queries to 500 chars', () => {
    mockReq.body = { query: 'A'.repeat(600), knowledgeLevel: 'Beginner' };
    
    validateQuery(mockReq, mockRes, nextFunc);
    
    expect(mockReq.body.query.length).toBe(500);
    expect(nextFunc).toHaveBeenCalled();
  });

  it('should trim whitespace from queries', () => {
    mockReq.body = { query: '   How does voting work?   ', knowledgeLevel: 'Beginner' };
    
    validateQuery(mockReq, mockRes, nextFunc);
    
    expect(mockReq.body.query).toBe('How does voting work?');
    expect(nextFunc).toHaveBeenCalled();
  });
});
