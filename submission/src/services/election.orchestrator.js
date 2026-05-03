import * as eciService from './eci.service.js';
import * as verifikService from './verifik.service.js';
import * as datagovService from './datagov.service.js';
import logger from '../config/logger.js';

/**
 * Unified Election Data Orchestrator.
 * Routes queries to the best available API with automatic fallback.
 *
 * Priority chain for EPIC lookups:
 *   1. ECI Electoralsearch (official, free, no key)
 *   2. Verifik (authenticated, verified, freemium)
 *
 * For historical data (turnout, results, schedules):
 *   → data.gov.in OGD Platform (free API key)
 *
 * @module services/election.orchestrator
 */

/**
 * Looks up voter details by EPIC with cascading fallback.
 * Tries ECI first → Verifik if each fails.
 * @param {string} epicNumber - The voter ID (EPIC).
 * @returns {Promise<object>} { data, source } or throws if all fail.
 */
export const lookupVoter = async (epicNumber) => {
  // Attempt 1: Official ECI (free, no auth)
  const eciResult = await eciService.getVoterByEpic(epicNumber);
  if (eciResult) {
    return { data: eciResult, source: 'eci' };
  }

  // Attempt 2: Verifik (authenticated fallback)
  try {
    const verifikResult = await verifikService.getVoterInfo(epicNumber);
    if (verifikResult) {
      return { data: verifikResult, source: 'verifik' };
    }
  } catch (err) {
    logger.warn('Verifik voter fallback skipped', { error: err.message });
  }

  throw new Error(`Voter lookup failed for EPIC ${epicNumber} — all sources unavailable.`);
};

/**
 * Looks up polling station by EPIC with cascading fallback.
 * Tries ECI first → Verifik if ECI fails.
 * @param {string} epicNumber - The voter ID (EPIC).
 * @returns {Promise<object>} { data, source } or throws if all fail.
 */
export const lookupPollingStation = async (epicNumber) => {
  // Attempt 1: ECI
  const eciResult = await eciService.getPollingStationByEpic(epicNumber);
  if (eciResult) {
    return { data: eciResult, source: 'eci' };
  }

  // Attempt 2: Verifik
  try {
    const verifikResult = await verifikService.getPollingInfo(epicNumber);
    if (verifikResult) {
      return { data: verifikResult, source: 'verifik' };
    }
  } catch (err) {
    logger.warn('Verifik polling fallback skipped', { error: err.message });
  }

  throw new Error(`Polling station lookup failed for EPIC ${epicNumber} — all sources unavailable.`);
};

/**
 * Fetches voter turnout statistics from data.gov.in.
 * @param {string} [stateId] - Optional state filter.
 * @param {number} [limit=50] - Max records.
 * @returns {Promise<object>} { records, total, source }.
 */
export const getTurnoutData = async (stateId, limit = 50) => {
  const result = await datagovService.getVoterTurnout(stateId, limit);
  return { ...result, source: 'data.gov.in' };
};

/**
 * Fetches election schedule/phases from data.gov.in.
 * @param {number} [limit=50] - Max records.
 * @returns {Promise<object>} { records, total, source }.
 */
export const getScheduleData = async (limit = 50) => {
  const result = await datagovService.getElectionSchedule(limit);
  return { ...result, source: 'data.gov.in' };
};

/**
 * Fetches constituency election results from data.gov.in.
 * @param {string} [constituencyName] - Optional constituency filter.
 * @param {number} [limit=50] - Max records.
 * @returns {Promise<object>} { records, total, source }.
 */
export const getResultsData = async (constituencyName, limit = 50) => {
  const result = await datagovService.getConstituencyResults(constituencyName, limit);
  return { ...result, source: 'data.gov.in' };
};

/**
 * Returns the health/availability status of all configured API sources.
 * Useful for admin dashboards to see which sources are currently reachable.
 * @returns {Promise<object>} Status of each source.
 */
export const getSourcesStatus = async () => {
  const status = {
    eci: { configured: true, description: 'ECI Electoralsearch (no key required)' },
    dataGovIn: {
      configured: !!process.env.DATAGOV_API_KEY,
      description: 'data.gov.in Open Government Data Platform',
    },
    verifik: {
      configured: !!process.env.VERIFIK_API_TOKEN,
      description: 'Verifik Voting Information API',
    },
  };

  return status;
};
