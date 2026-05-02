import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { aiRateLimiter } from '../middleware/rateLimit.js';
import {
  lookupVoter,
  lookupPollingStation,
  getTurnoutData,
  getScheduleData,
  getResultsData,
  getSourcesStatus,
} from '../services/election.orchestrator.js';

/**
 * Election data API routes.
 * Provides endpoints for voter lookup, polling station search,
 * election results, turnout stats, and schedule data.
 * All EPIC-based lookups require authentication.
 * @module routes/election.routes
 */

const router = Router();

/**
 * GET /api/election/voter/:epicNumber
 * Looks up voter details by EPIC (Voter ID).
 * Cascading fallback: ECI → Verifik.
 */
router.get('/voter/:epicNumber', requireAuth, aiRateLimiter, async (req, res, next) => {
  try {
    const { epicNumber } = req.params;

    if (!epicNumber || epicNumber.length < 6) {
      return res.status(400).json({ error: 'Valid EPIC number is required (minimum 6 characters).' });
    }

    const result = await lookupVoter(epicNumber);
    res.json({ data: result.data, source: result.source });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/election/polling-station/:epicNumber
 * Looks up polling station and constituency by EPIC.
 * Returns booth address, assembly, parliament info.
 */
router.get('/polling-station/:epicNumber', requireAuth, aiRateLimiter, async (req, res, next) => {
  try {
    const { epicNumber } = req.params;

    if (!epicNumber || epicNumber.length < 6) {
      return res.status(400).json({ error: 'Valid EPIC number is required.' });
    }

    const result = await lookupPollingStation(epicNumber);
    res.json({ data: result.data, source: result.source });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/election/turnout
 * Fetches voter turnout statistics from data.gov.in.
 * Query params: ?stateId=19&limit=50
 */
router.get('/turnout', async (req, res, next) => {
  try {
    const { stateId, limit } = req.query;
    const result = await getTurnoutData(stateId, parseInt(limit || '50', 10));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/election/schedule
 * Fetches election schedule and phases from data.gov.in.
 * Query params: ?limit=50
 */
router.get('/schedule', async (req, res, next) => {
  try {
    const { limit } = req.query;
    const result = await getScheduleData(parseInt(limit || '50', 10));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/election/results
 * Fetches constituency-level election results from data.gov.in.
 * Query params: ?constituency=Indore&limit=50
 */
router.get('/results', async (req, res, next) => {
  try {
    const { constituency, limit } = req.query;
    const result = await getResultsData(constituency, parseInt(limit || '50', 10));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/election/sources
 * Returns the configuration status of all election data APIs.
 * Useful for admin dashboards and debugging.
 */
router.get('/sources', requireAuth, async (req, res, next) => {
  try {
    const status = await getSourcesStatus();
    res.json({ data: status });
  } catch (error) {
    next(error);
  }
});

export default router;
