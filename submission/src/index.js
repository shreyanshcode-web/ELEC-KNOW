import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { setupRoutes } from './routes.js';
import { errorHandler } from './middleware/error.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { closePool } from './config/database.js';
import { closeRedis } from './config/redis.js';
import { closeProducer } from './config/kafka.js';

dotenv.config();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https://firebasestorage.googleapis.com"]
    }
  }
}));

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Apply distributed rate limiting (Redis-backed)
app.use(apiRateLimiter);

setupRoutes(app);

app.use(errorHandler);

const PORT = process.env.PORT || 8080;

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });

  /**
   * Graceful shutdown — cleanly closes DB pool, Redis, and Kafka
   * before the K8s pod terminates (SIGTERM from kubelet).
   */
  const gracefulShutdown = async (signal) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);

    server.close(async () => {
      console.log('HTTP server closed');

      try {
        await Promise.allSettled([
          closePool(),
          closeRedis(),
          closeProducer(),
        ]);
        console.log('All connections closed. Exiting.');
        process.exit(0);
      } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
      }
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 25000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export default app;
