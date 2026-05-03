import axios from 'axios';
import { getCachedResponse, setCachedResponse } from './cache.service.js';

/**
 * Verifik Voting Information API service.
 * Commercial freemium service for Indian election data via EPIC lookup.
 * Requires JWT/API token from: https://verifik.co
 * Acts as a verified fallback to the official ECI endpoints.
 * @module services/verifik.service
 */

const getVerifikBaseUrl = () => process.env.VERIFIK_BASE_URL || 'https://api.verifik.co';
const getVerifikApiToken = () => process.env.VERIFIK_API_TOKEN;
const REQUEST_TIMEOUT_MS = 10000;

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
 * @param {string} epicNumber - The EPIC (voter ID), e.g. 'IHM2796746'.
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
      // Cache for 30 days
      await setCachedResponse(cacheKey, 'verifik', JSON.stringify(data), 2592000);
    }

    return data;
  } catch (error) {
    const status = error.response?.status;
    const msg = error.response?.data?.message || error.message;

    if (status === 401 || status === 403) {
      console.error('Verifik auth failed; check Secret Manager secret verifik-api-token:', msg);
    } else if (status === 429) {
      console.warn('Verifik rate limit exceeded:', msg);
    } else {
      console.error('Verifik voter lookup failed:', msg);
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
      await setCachedResponse(cacheKey, 'verifik', JSON.stringify(data), 2592000);
    }

    return data;
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    console.error('Verifik polling lookup failed:', msg);
    return null;
  }
};
