import admin from 'firebase-admin';
import logger from '../config/logger.js';
import { HTTP_STATUS } from '../config/constants.js';

/**
 * Firebase Authentication middleware.
 * Verifies JWT Bearer tokens server-side using the Firebase Admin SDK.
 *
 * Authentication flow:
 * 1. Production/Cloud Run: Validates real Firebase ID tokens via Admin SDK.
 * 2. Local development:    Accepts `Bearer mock_jwt_for_development` for
 *                          frontend testing without a full Firebase Emulator.
 * 3. Test environment:     Bypasses auth entirely when BYPASS_AUTH=true.
 *
 * The Firebase Admin SDK uses Application Default Credentials (ADC)
 * automatically on Google Cloud (Workload Identity on GKE, built-in on Cloud Run).
 *
 * @module middleware/auth
 */

// Lazy-initialize Firebase Admin SDK (prevents duplicate initialization in tests)
if (!admin.apps.length) {
  try {
    admin.initializeApp();
    logger.debug('Firebase Admin SDK initialized');
  } catch {
    logger.warn('Firebase Admin SDK initialization failed — auth will require mock tokens locally');
  }
}

/**
 * Express middleware that enforces Firebase Authentication.
 * Attaches the decoded Firebase user to `req.user` on success.
 *
 * @param {import('express').Request} req - Express request (expects Authorization header).
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // ── Test bypass (controlled via env — never enabled in production) ──
  if (process.env.NODE_ENV === 'test' && process.env.BYPASS_AUTH === 'true') {
    req.user = { uid: 'test-user', email: 'test@example.com', name: 'Test User' };
    return next();
  }

  // ── Local development mock token ──
  if (process.env.NODE_ENV !== 'production' && authHeader === 'Bearer mock_jwt_for_development') {
    req.user = { uid: 'dev-user', email: 'dev@example.com', name: 'Developer' };
    return next();
  }

  // ── Validate Authorization header format ──
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: 'Unauthorized: Missing or invalid authorization header.',
      hint: 'Include "Authorization: Bearer <Firebase_ID_Token>" in your request.',
    });
  }

  // ── Verify Firebase ID token ──
  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    logger.warn('Firebase token verification failed', {
      error: error.code || error.message,
      ip: req.ip,
    });
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      error: 'Forbidden: Invalid or expired token.',
    });
  }
};
