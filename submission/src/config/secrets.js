import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import logger from './logger.js';

/**
 * Google Secret Manager integration.
 * In production (GKE/Cloud Run), loads secrets from Secret Manager.
 * In development, falls back to environment variables.
 *
 * Uses Workload Identity for authentication (no service account key files).
 * @see https://cloud.google.com/secret-manager/docs/creating-and-accessing-secrets
 * @module config/secrets
 */

const IS_GCP = process.env.K_SERVICE || process.env.KUBERNETES_SERVICE_HOST;
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;

/** @type {SecretManagerServiceClient|null} */
let smClient = null;

/** In-memory cache to avoid repeated Secret Manager calls */
const secretCache = new Map();

/**
 * Returns the Secret Manager client (lazy init).
 * @returns {SecretManagerServiceClient}
 */
const getClient = () => {
  if (!smClient) {
    smClient = new SecretManagerServiceClient();
  }
  return smClient;
};

/**
 * Fetches a secret value from Google Secret Manager.
 * Results are cached in-memory for the lifetime of the process.
 * @param {string} secretName - The secret name (e.g. 'gemini-api-key').
 * @param {string} [version='latest'] - The secret version.
 * @returns {Promise<string>} The secret value.
 */
export const getSecret = async (secretName, version = 'latest') => {
  // Check in-memory cache first
  const cacheKey = `${secretName}:${version}`;
  if (secretCache.has(cacheKey)) {
    return secretCache.get(cacheKey);
  }

  // In non-GCP environments, fall back to env vars
  if (!IS_GCP || !PROJECT_ID) {
    const envKey = secretName.toUpperCase().replace(/-/g, '_');
    const envValue = process.env[envKey];
    if (envValue) {
      logger.debug(`Secret '${secretName}' loaded from env var ${envKey}`);
      secretCache.set(cacheKey, envValue);
      return envValue;
    }
    throw new Error(`Secret '${secretName}' not found in env. Set ${envKey} or deploy to GCP.`);
  }

  // Fetch from Google Secret Manager
  try {
    const client = getClient();
    const name = `projects/${PROJECT_ID}/secrets/${secretName}/versions/${version}`;

    const [response] = await client.accessSecretVersion({ name });
    const payload = response.payload.data.toString('utf8');

    secretCache.set(cacheKey, payload);
    logger.info(`Secret '${secretName}' loaded from Secret Manager`, { secretName });

    return payload;
  } catch (error) {
    logger.error(`Failed to load secret '${secretName}' from Secret Manager`, {
      error: error.message,
      secretName,
    });
    throw error;
  }
};

/**
 * Loads all application secrets from Secret Manager (or env vars).
 * Call once during startup. Non-critical secrets that fail are logged
 * but won't crash the application (graceful degradation).
 * @returns {Promise<object>} Map of loaded secrets.
 */
export const loadAllSecrets = async () => {
  const secrets = {};

  /** Secret name → env var fallback name → required flag */
  const secretMap = [
    { name: 'gemini-api-key', envKey: 'GEMINI_API_KEY', required: process.env.NODE_ENV === 'production' },
    { name: 'db-password', envKey: 'DB_PASSWORD', required: false },
    { name: 'datagov-api-key', envKey: 'DATAGOV_API_KEY', required: false },
    { name: 'verifik-api-token', envKey: 'VERIFIK_API_TOKEN', required: false },
    { name: 'redis-password', envKey: 'REDIS_PASSWORD', required: false },
  ];

  for (const { name, envKey, required } of secretMap) {
    try {
      secrets[envKey] = await getSecret(name);
      // Also set as env var so existing code picks it up
      process.env[envKey] = secrets[envKey];
    } catch (err) {
      if (required) {
        logger.error(`Required secret '${name}' is missing`, { error: err.message });
        throw err;
      }
      logger.warn(`Optional secret '${name}' not available — feature may be limited`, {
        error: err.message,
      });
    }
  }

  logger.info('Secrets loading complete', {
    loaded: Object.keys(secrets).length,
    total: secretMap.length,
  });

  return secrets;
};
