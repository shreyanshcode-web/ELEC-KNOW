import request from 'supertest';

let app;

/**
 * Integration tests for the Election Education API.
 * Validates end-to-end request/response cycles including auth,
 * validation, health checks, and error handling.
 */
describe('Election Education API — Integration Tests', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.BYPASS_AUTH = 'true';
    ({ default: app } = await import('../../src/index.js'));
  });

  afterAll(() => {
    delete process.env.BYPASS_AUTH;
  });

  // ── Health & Readiness Probes ─────────────────────────
  describe('Health Probes', () => {
    it('GET /health should return 200 with healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.timestamp).toBeDefined();
    });

    it('GET /ready should return 200 with dependency status', async () => {
      const res = await request(app).get('/ready');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.dependencies).toBeDefined();
      expect(res.body.dependencies).toHaveProperty('database');
      expect(res.body.dependencies).toHaveProperty('redis');
      expect(res.body.dependencies).toHaveProperty('kafka');
    });
  });

  // ── Education API Validation ──────────────────────────
  describe('POST /api/education — Validation', () => {
    it('should return 400 for missing query', async () => {
      const res = await request(app)
        .post('/api/education')
        .set('Authorization', 'Bearer dummy_token')
        .send({ knowledgeLevel: 'Beginner' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/missing or invalid/i);
    });

    it('should return 400 for empty string query', async () => {
      const res = await request(app)
        .post('/api/education')
        .set('Authorization', 'Bearer dummy_token')
        .send({ query: '   ', knowledgeLevel: 'Beginner' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/empty/i);
    });

    it('should return 400 for invalid knowledge level', async () => {
      const res = await request(app)
        .post('/api/education')
        .set('Authorization', 'Bearer dummy_token')
        .send({ query: 'How to vote?', knowledgeLevel: 'ExpertLevelThatDoesNotExist' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/Invalid knowledge level/i);
    });

    it('should return 400 for non-string query', async () => {
      const res = await request(app)
        .post('/api/education')
        .set('Authorization', 'Bearer dummy_token')
        .send({ query: 12345 });

      expect(res.statusCode).toBe(400);
    });
  });

  // ── Authentication ────────────────────────────────────
  describe('Authentication', () => {
    it('should return 401 when no auth header is provided', async () => {
      // Temporarily disable bypass
      delete process.env.BYPASS_AUTH;
      process.env.NODE_ENV = 'production';

      const res = await request(app)
        .post('/api/education')
        .send({ query: 'How to vote?', knowledgeLevel: 'Beginner' });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toMatch(/unauthorized/i);

      // Restore
      process.env.NODE_ENV = 'test';
      process.env.BYPASS_AUTH = 'true';
    });
  });

  // ── Static Assets ─────────────────────────────────────
  describe('Static Assets', () => {
    it('GET / should return the HTML page', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/i);
    });
  });

  // ── 404 Handling ──────────────────────────────────────
  describe('Error Handling', () => {
    it('should return 404 for unknown API routes', async () => {
      const res = await request(app).get('/api/nonexistent-route');
      expect([404, 500]).toContain(res.statusCode);
    });
  });
});
