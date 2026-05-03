import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { setupRoutes } from './routes.js';
import { errorHandler } from './middleware/error.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { closePool, testConnection } from './config/database.js';
import { closeRedis, getRedisClient } from './config/redis.js';
import { closeProducer, getProducer } from './config/kafka.js';
import { loadAllSecrets } from './config/secrets.js';
import logger from './config/logger.js';

const app = express();

// ──────────── Security Middleware ────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// CORS: restrict origins in production, allow all in dev
const corsOptions = process.env.NODE_ENV === 'production'
  ? { origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || [/\.run\.app$/], credentials: true }
  : { origin: true };
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public', { dotfiles: 'deny' }));

// ──────────── Request Logging (Cloud Trace correlation) ────────────
app.use((req, res, next) => {
  const traceHeader = req.headers['x-cloud-trace-context'];
  if (traceHeader) {
    req.traceId = traceHeader.split('/')[0];
  }
  req.startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    logger.info('HTTP request', {
      httpRequest: {
        requestMethod: req.method,
        requestUrl: req.originalUrl,
        status: res.statusCode,
        latency: `${duration / 1000}s`,
        userAgent: req.headers['user-agent'],
        remoteIp: req.ip,
      },
      traceId: req.traceId,
    });
  });

  next();
});

// ──────────── Rate Limiting (Redis-backed) ────────────
app.use(apiRateLimiter);

setupRoutes(app);
app.use(errorHandler);

const PORT = process.env.PORT || 8080;

/**
 * Application bootstrap sequence.
 * Loads secrets → connects infrastructure → starts HTTP server.
 * Non-critical services (Redis, Kafka) degrade gracefully.
 */
const bootstrap = async () => {
  try {
    // Step 1: Load secrets from Secret Manager (or env vars)
    logger.info('Loading application secrets...');
    await loadAllSecrets();

    // Step 2: Connect infrastructure (non-blocking for optional services)
    logger.info('Connecting infrastructure...');
    const [dbOk] = await Promise.allSettled([
      testConnection(),
      getRedisClient(),
      getProducer(),
    ]);

    if (dbOk.status === 'fulfilled' && dbOk.value) {
      logger.info('Database connected ✓');
    } else {
      logger.warn('Database unavailable — DB-dependent features will fail');
    }

    // Step 3: Start HTTP server
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server listening on port ${PORT}`, {
        port: PORT,
        nodeEnv: process.env.NODE_ENV,
        gcpProject: process.env.GOOGLE_CLOUD_PROJECT || 'not-set',
      });
    });

    // ──────────── Graceful Shutdown (K8s SIGTERM) ────────────
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');

        // Close all infrastructure connections in parallel
        const results = await Promise.allSettled([
          closePool(),
          closeRedis(),
          closeProducer(),
        ]);

        results.forEach((r, i) => {
          const names = ['PostgreSQL', 'Redis', 'Kafka'];
          if (r.status === 'rejected') {
            logger.warn(`${names[i]} close error`, { error: r.reason?.message });
          }
        });

        logger.info('Graceful shutdown complete');
        process.exit(0);
      });

      // Force exit after 25s (K8s default terminationGracePeriodSeconds is 30s)
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 25000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Catch unhandled rejections (don't crash in production)
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection', {
        error: reason?.message || String(reason),
        stack: reason?.stack,
      });
    });

  } catch (err) {
    logger.error('Bootstrap failed', { error: err.message, stack: err.stack });
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}

export default app;
