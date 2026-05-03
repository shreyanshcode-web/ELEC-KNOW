import axios from 'axios';
import { getCachedResponse, setCachedResponse } from './cache.service.js';
import logger from '../config/logger.js';

/**
 * data.gov.in Open Government Data Platform API service.
 * Provides election timelines, schedules, results, and voter turnout
 * statistics to power the election process education platform.
 *
 * Problem Statement Alignment:
 * Supplies real-world election timelines and data that help users
 * understand the election process in an interactive way.
 *
 * Requires a free API key from: https://data.gov.in/
 * @module services/datagov.service
 */

const getDatagovBaseUrl = () => process.env.DATAGOV_BASE_URL || 'https://api.data.gov.in';
const getDatagovApiKey = () => process.env.DATAGOV_API_KEY;

/** @type {number} Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 15_000;

/** @type {number} Cache TTL: 7 days (election data is static once published) */
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Well-known resource UIDs for Lok Sabha 2024 data */
const RESOURCE_IDS = Object.freeze({
  VOTER_TURNOUT: process.env.DATAGOV_TURNOUT_RESOURCE || '9a22a518-5a33-4bab-8d12-1a3c3e6f5c8e',
  ELECTION_SCHEDULE: process.env.DATAGOV_SCHEDULE_RESOURCE || '9c3c4c8f-84ba-4ce8-b677-0c7edc8466fc',
  CONSTITUENCY_RESULTS: process.env.DATAGOV_RESULTS_RESOURCE || '8d2daacf-937d-412f-94c0-bf9ab57e01c7',
});

/**
 * Validates that the data.gov.in API key is configured.
 * @returns {string} The API key.
 * @throws {Error} If DATAGOV_API_KEY is not set.
 */
const ensureApiKey = () => {
  const apiKey = getDatagovApiKey();
  if (!apiKey) {
    throw new Error('DATAGOV_API_KEY is not configured. Add it to Google Secret Manager as datagov-api-key.');
  }
  return apiKey;
};

/**
 * Generic data.gov.in resource fetcher with pagination and caching.
 * @param {string} resourceId - The dataset resource UID.
 * @param {object} [filters={}] - Key-value query filters (e.g. { state_id: '19' }).
 * @param {number} [limit=50] - Max records per page (max 250 per data.gov.in).
 * @param {number} [offset=0] - Records to skip for pagination.
 * @returns {Promise<object>} { records, total, count }.
 */
const fetchResource = async (resourceId, filters = {}, limit = 50, offset = 0) => {
  const apiKey = ensureApiKey();

  const cacheKey = `datagov:${resourceId}:${JSON.stringify(filters)}:${limit}:${offset}`;
  const cached = await getCachedResponse(cacheKey, 'datagov');
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const params = {
      'api-key': apiKey,
      format: 'json',
      limit,
      offset,
      ...filters,
    };

    const response = await axios.get(`${getDatagovBaseUrl()}/resource/${resourceId}`, {
      params,
      timeout: REQUEST_TIMEOUT_MS,
    });

    const result = {
      records: response.data?.records || [],
      total: response.data?.total || 0,
      count: response.data?.count || 0,
    };

    await setCachedResponse(cacheKey, 'datagov', JSON.stringify(result), CACHE_TTL_SECONDS);

    return result;
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    logger.error('data.gov.in fetch failed', { resourceId, error: msg });
    throw new Error(`Failed to fetch election data from data.gov.in: ${msg}`);
  }
};

/**
 * Fetches voter turnout data, optionally filtered by state.
 * @param {string} [stateId] - Optional state ID filter.
 * @param {number} [limit=50] - Max records.
 * @returns {Promise<object>} Turnout records with total and count.
 */
export const getVoterTurnout = async (stateId, limit = 50) => {
  const filters = stateId ? { 'filters[state_id]': stateId } : {};
  return fetchResource(RESOURCE_IDS.VOTER_TURNOUT, filters, limit);
};

/**
 * Fetches election schedule/phases data (timelines).
 * @param {number} [limit=50] - Max records.
 * @returns {Promise<object>} Schedule records with dates and phases.
 */
export const getElectionSchedule = async (limit = 50) => {
  return fetchResource(RESOURCE_IDS.ELECTION_SCHEDULE, {}, limit);
};

/**
 * Fetches constituency-level election results.
 * @param {string} [constituencyName] - Optional constituency name filter.
 * @param {number} [limit=50] - Max records.
 * @returns {Promise<object>} Results records with winners and margins.
 */
export const getConstituencyResults = async (constituencyName, limit = 50) => {
  const filters = constituencyName
    ? { 'filters[constituency_name]': constituencyName }
    : {};
  return fetchResource(RESOURCE_IDS.CONSTITUENCY_RESULTS, filters, limit);
};

/**
 * Fetches any arbitrary data.gov.in resource by ID.
 * @param {string} resourceId - The dataset resource UID.
 * @param {object} [filters={}] - Query filters.
 * @param {number} [limit=50] - Max records.
 * @param {number} [offset=0] - Pagination offset.
 * @returns {Promise<object>} Resource records.
 */
export const getResource = async (resourceId, filters = {}, limit = 50, offset = 0) => {
  return fetchResource(resourceId, filters, limit, offset);
};

export { RESOURCE_IDS };
