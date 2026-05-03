import { OAuth2Client } from 'google-auth-library';
import logger from '../config/logger.js';
import { HTTP_STATUS } from '../config/constants.js';

/**
 * Google Authentication middleware.
 * Verifies Google OAuth2 ID tokens (JWTs) using the google-auth-library.
 *
 * Authentication flow:
 * 1. Production/Cloud Run: Validates real Google ID tokens from the frontend.
 * 2. Local development:    Accepts `Bearer mock_jwt_for_development` for
 *                          frontend testing without real Google Sign-In.
 * 3. Test environment:     Bypasses auth entirely when BYPASS_AUTH=true.
 *
 * @module middleware/auth
 */

const client = new OAuth2Client();

/**
 * Express middleware that enforces Google Authentication.
 * Attaches the decoded Google user to `req.user` on success.
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
      hint: 'Include "Authorization: Bearer <Google_ID_Token>" in your request.',
    });
  }

  // ── Verify Google ID token ──
  const idToken = authHeader.split('Bearer ')[1];

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      // audience is optional here but recommended if we enforce a single client ID
      // audience: getClientId(),
    });

    const payload = ticket.getPayload();
    
    // Map Google payload to standard user object
    req.user = {
      uid: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };
    
    next();
  } catch (error) {
    logger.warn('Google token verification failed', {
      error: error.message,
      ip: req.ip,
    });
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      error: 'Forbidden: Invalid or expired token.',
    });
  }
};
