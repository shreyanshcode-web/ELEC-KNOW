import axios from 'axios';
import { getCachedResponse, setCachedResponse } from './cache.service.js';
import logger from '../config/logger.js';

/**
 * ECI Electoralsearch API service.
 * Official Election Commission of India voter lookup — no API key required.
 * Endpoint: electoralsearch.eci.gov.in
 *
 * Part of the election process education platform — helps users
 * locate their polling station and verify their registration status.
 *
 * @module services/eci.service
 */

const ECI_BASE_URL = process.env.ECI_BASE_URL || 'https://electoralsearch.eci.gov.in';

/** @type {number} Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 10_000;

/** @type {number} Cache TTL: 30 days (voter rolls update ~annually) */
const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * Looks up voter details by EPIC (Voter ID) number.
 * Returns personal name info from the electoral roll.
 * @param {string} epicNumber - The EPIC (voter ID), e.g. 'ABC1234567'.
 * @returns {Promise<object|null>} Voter details or null on failure.
 */
export const getVoterByEpic = async (epicNumber) => {
  const cacheKey = `eci:epic:${epicNumber.toUpperCase()}`;

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
      await setCachedResponse(cacheKey, 'eci', JSON.stringify(data), CACHE_TTL_SECONDS);
    }

    return data;
  } catch (error) {
    logger.warn('ECI EPIC lookup failed', { error: error.message, epicNumber });
    return null;
  }
};

/**
 * Looks up polling station and constituency info by EPIC number.
 * Returns booth address, assembly constituency, parliament constituency.
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
      await setCachedResponse(cacheKey, 'eci', JSON.stringify(data), CACHE_TTL_SECONDS);
    }

    return data;
  } catch (error) {
    logger.warn('ECI polling station lookup failed', { error: error.message, epicNumber });
    return null;
  }
};
