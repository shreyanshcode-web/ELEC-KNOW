import { Router } from 'express';
import { getElectionInsight } from './services/gemini.js';
import { getCachedResponse, setCachedResponse } from './services/cache.service.js';
import { publishQuerySubmitted } from './services/event.service.js';
import { requireAuth } from './middleware/auth.js';
import { validateQuery } from './middleware/validation.js';
import { aiRateLimiter } from './middleware/rateLimit.js';
import { findOrCreateUser } from './models/user.model.js';
import { createQuery } from './models/query.model.js';
import { getAllTopics, getPopularTopics } from './models/topic.model.js';
import { getUsageStats, getDailyQueryVolume } from './services/analytics.service.js';
import { testConnection } from './config/database.js';
import { testRedis } from './config/redis.js';
import { isKafkaAvailable } from './config/kafka.js';
import electionRoutes from './routes/election.routes.js';

export const setupRoutes = (app) => {
  const router = Router();

  // Mount election data API routes (voter lookup, turnout, results, etc.)
  app.use('/api/election', electionRoutes);

  // K8s LIVENESS probe — is the process alive? (lightweight, no dependency checks)
  router.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // K8s/Cloud Run READINESS probe — can the app serve traffic?
  router.get('/ready', async (req, res) => {
    const dbOk = await testConnection();
    const redisOk = await testRedis();

    // All dependencies are optional — the app serves AI/static content without them
    res.status(200).json({
      status: 'ready',
      dependencies: {
        database: dbOk ? 'connected' : 'unavailable (optional)',
        redis: redisOk ? 'connected' : 'unavailable (optional)',
        kafka: isKafkaAvailable() ? 'connected' : 'unavailable (optional)',
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * POST /api/education — Protected AI education endpoint.
   * Flow: Auth → Validate → Check Redis cache → Gemini → Cache → Persist → Kafka event
   */
  router.post('/api/education', requireAuth, aiRateLimiter, validateQuery, async (req, res, next) => {
    const startTime = Date.now();

    try {
      const { query, knowledgeLevel } = req.body;

      // Step 1: Check Redis cache
      const cachedResponse = await getCachedResponse(query, knowledgeLevel);

      let response;
      let fromCache = false;

      if (cachedResponse) {
        response = cachedResponse;
        fromCache = true;
      } else {
        // Step 2: Call Gemini API
        response = await getElectionInsight(query, knowledgeLevel);

        // Step 3: Cache the response
        await setCachedResponse(query, knowledgeLevel, response);
      }

      const responseTimeMs = Date.now() - startTime;

      // Step 4: Persist to database (non-blocking — don't await)
      const persistAndPublish = async () => {
        try {
          // Upsert user from Firebase auth context
          const user = await findOrCreateUser({
            firebaseUid: req.user.uid,
            email: req.user.email || 'unknown',
            displayName: req.user.name || null,
          });

          // Save query record
          const savedQuery = await createQuery({
            userId: user.id,
            queryText: query,
            aiResponse: response,
            knowledgeLevel,
            responseTimeMs,
            fromCache,
          });

          // Step 5: Publish Kafka event for async analytics
          await publishQuerySubmitted({
            queryId: savedQuery.id,
            userId: user.id,
            queryText: query,
            knowledgeLevel,
            responseTimeMs,
            fromCache,
          });
        } catch (err) {
          // DB/Kafka failures must not break the response
          console.error('Background persist/publish error:', err.message);
        }
      };

      // Fire-and-forget: don't block the response
      persistAndPublish();

      res.json({
        data: response,
        meta: { responseTimeMs, fromCache },
      });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/topics — Public list of education topics
  router.get('/api/topics', async (req, res, next) => {
    try {
      const { category } = req.query;
      const topics = await getAllTopics(category || undefined);
      res.json({ data: topics });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/topics/popular — Top queried topics
  router.get('/api/topics/popular', async (req, res, next) => {
    try {
      const topics = await getPopularTopics(10);
      res.json({ data: topics });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/analytics/stats — Usage statistics (admin)
  router.get('/api/analytics/stats', requireAuth, async (req, res, next) => {
    try {
      const days = parseInt(req.query.days || '30', 10);
      const stats = await getUsageStats(days);
      res.json({ data: stats });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/analytics/volume — Daily query volume (admin)
  router.get('/api/analytics/volume', requireAuth, async (req, res, next) => {
    try {
      const days = parseInt(req.query.days || '30', 10);
      const volume = await getDailyQueryVolume(days);
      res.json({ data: volume });
    } catch (error) {
      next(error);
    }
  });

  app.use('/', router);
};
