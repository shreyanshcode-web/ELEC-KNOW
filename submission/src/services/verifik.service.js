import axios from 'axios';
import { getCachedResponse, setCachedResponse } from './cache.service.js';
import logger from '../config/logger.js';

/**
 * Verifik Voting Information API service.
 * Commercial freemium service for Indian election data via EPIC lookup.
 * Requires JWT/API token from: https://verifik.co
 * Acts as a verified fallback to the official ECI endpoints.
 * @module services/verifik.service
 */

const getVerifikBaseUrl = () => process.env.VERIFIK_BASE_URL || 'https://api.verifik.co';
const getVerifikApiToken = () => process.env.VERIFIK_API_TOKEN;

/** @type {number} Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 10_000;

/** @type {number} Cache TTL: 30 days */
const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * Builds the Verifik authorization headers.
 * @returns {object} Headers object with Bearer token.
 * @throws {Error} If VERIFIK_API_TOKEN is not configured.
 */
const getAuthHeaders = () => {
  const apiToken = getVerifikApiToken();
  if (!apiToken) {
    throw new Error('VERIFIK_API_TOKEN is not configured. Add it to Google Secret Manager as verifik-api-token.');
  }
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${apiToken}`,
  };
};

/**
 * Looks up voter information by EPIC using Verifik's verified endpoint.
 * Returns name, relative, and other electoral roll fields.
 * @param {string} epicNumber - The EPIC (voter ID), e.g. 'ABC1234567'.
 * @returns {Promise<object|null>} Voter details or null on failure.
 */
export const getVoterInfo = async (epicNumber) => {
  const cacheKey = `verifik:epic:${epicNumber.toUpperCase()}`;

  const cached = await getCachedResponse(cacheKey, 'verifik');
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const response = await axios.get(`${getVerifikBaseUrl()}/voting/in/eci/epic`, {
      params: { documentNumber: epicNumber.toUpperCase() },
      headers: getAuthHeaders(),
      timeout: REQUEST_TIMEOUT_MS,
    });

    const data = response.data?.data || null;

    if (data) {
      await setCachedResponse(cacheKey, 'verifik', JSON.stringify(data), CACHE_TTL_SECONDS);
    }

    return data;
  } catch (error) {
    const status = error.response?.status;
    const msg = error.response?.data?.message || error.message;

    if (status === 401 || status === 403) {
      logger.error('Verifik auth failed — check Secret Manager secret verifik-api-token', { status, error: msg });
    } else if (status === 429) {
      logger.warn('Verifik rate limit exceeded', { error: msg });
    } else {
      logger.warn('Verifik voter lookup failed', { error: msg, epicNumber });
    }

    return null;
  }
};

/**
 * Looks up polling station info by EPIC using Verifik.
 * Returns booth, constituency, and building details.
 * @param {string} epicNumber - The EPIC (voter ID).
 * @returns {Promise<object|null>} Polling station details or null.
 */
export const getPollingInfo = async (epicNumber) => {
  const cacheKey = `verifik:votacion:${epicNumber.toUpperCase()}`;

  const cached = await getCachedResponse(cacheKey, 'verifik');
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const response = await axios.get(`${getVerifikBaseUrl()}/voting/in/eci/epic/votacion`, {
      params: { documentNumber: epicNumber.toUpperCase() },
      headers: getAuthHeaders(),
      timeout: REQUEST_TIMEOUT_MS,
    });

    const data = response.data?.data || null;

    if (data) {
      await setCachedResponse(cacheKey, 'verifik', JSON.stringify(data), CACHE_TTL_SECONDS);
    }

    return data;
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    logger.warn('Verifik polling lookup failed', { error: msg, epicNumber });
    return null;
  }
};
