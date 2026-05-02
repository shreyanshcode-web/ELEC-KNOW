import axios from 'axios';
import { getCachedResponse, setCachedResponse } from './cache.service.js';

/**
 * ECI Electoralsearch API service.
 * Official Election Commission of India voter lookup — no API key required.
 * Endpoints: electoralsearch.eci.gov.in
 * @module services/eci.service
 */

const ECI_BASE_URL = process.env.ECI_BASE_URL || 'https://electoralsearch.eci.gov.in';
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Looks up voter details by EPIC (Voter ID) number.
 * Returns personal name info from the electoral roll.
 * @param {string} epicNumber - The EPIC (voter ID), e.g. 'IHM2796746'.
 * @returns {Promise<object|null>} Voter details or null on failure.
 */
export const getVoterByEpic = async (epicNumber) => {
  const cacheKey = `eci:epic:${epicNumber.toUpperCase()}`;

  // Check Redis cache first (voter data changes infrequently)
  const cached = await getCachedResponse(cacheKey, 'eci');
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const response = await axios.get(`${ECI_BASE_URL}/v2/in/epic`, {
      params: { documentNumber: epicNumber.toUpperCase() },
      headers: { Accept: 'application/json' },
      timeout: REQUEST_TIMEOUT_MS,
    });

    const data = response.data?.data || null;

    if (data) {
      // Cache for 30 days — voter rolls update ~annually
      await setCachedResponse(cacheKey, 'eci', JSON.stringify(data), 2592000);
    }

    return data;
  } catch (error) {
    console.error('ECI EPIC lookup failed:', error.message);
    return null;
  }
};

/**
 * Looks up polling station and constituency info by EPIC number.
 * Returns booth address, assembly constituency, parliament constituency, etc.
 * @param {string} epicNumber - The EPIC (voter ID).
 * @returns {Promise<object|null>} Polling station details or null.
 */
export const getPollingStationByEpic = async (epicNumber) => {
  const cacheKey = `eci:votacion:${epicNumber.toUpperCase()}`;

  const cached = await getCachedResponse(cacheKey, 'eci');
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const response = await axios.get(`${ECI_BASE_URL}/v2/in/epic/votacion`, {
      params: { documentNumber: epicNumber.toUpperCase() },
      headers: { Accept: 'application/json' },
      timeout: REQUEST_TIMEOUT_MS,
    });

    const data = response.data?.data || null;

    if (data) {
      // Cache for 30 days
      await setCachedResponse(cacheKey, 'eci', JSON.stringify(data), 2592000);
    }

    return data;
  } catch (error) {
    console.error('ECI polling station lookup failed:', error.message);
    return null;
  }
};
