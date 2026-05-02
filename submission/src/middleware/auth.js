import admin from 'firebase-admin';

// Check if already initialized to avoid duplicate initialization in testing
if (!admin.apps.length) {
  // Uses Application Default Credentials (ADC) by default on Google Cloud
  // For local testing without full creds, we catch errors and mock it or assume emulator is set.
  try {
    admin.initializeApp();
  } catch(e) {
    console.warn("Firebase admin initialization failed, likely missing credentials.");
  }
}

/**
 * Express middleware to enforce Firebase Authentication.
 * Validates the JWT Bearer token server-side.
 */
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // In testing environments, bypass auth for specific unit tests if configured.
  // We use process.env to allow tests to mock auth
  if (process.env.NODE_ENV === 'test' && process.env.BYPASS_AUTH === 'true') {
    req.user = { uid: 'test-user', email: 'test@example.com' };
    return next();
  }

  // Allow mock token in local development
  if (process.env.NODE_ENV === 'development' && authHeader === 'Bearer mock_jwt_for_development') {
    req.user = { uid: 'dev-user', email: 'dev@example.com' };
    return next();
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying auth token', error);
    return res.status(403).json({ error: 'Forbidden: Invalid token.' });
  }
};
