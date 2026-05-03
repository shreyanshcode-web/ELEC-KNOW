import { createConsumer, KAFKA_TOPICS } from '../config/kafka.js';
import { saveQueryAnalytics } from '../services/analytics.service.js';
import { incrementQueryCount } from '../models/topic.model.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Kafka consumer worker for asynchronous query processing.
 * Runs as a separate process/pod — decoupled from the API hot path.
 *
 * Responsibilities:
 * - Persist query analytics to PostgreSQL
 * - Update topic query counters
 * - Future: trigger notifications, generate reports
 *
 * @module workers/query.worker
 */

const CONSUMER_GROUP = process.env.KAFKA_GROUP_ID || 'election-workers';

/**
 * Processes a single QUERY_SUBMITTED event.
 * @param {object} event - The parsed Kafka message.
 */
const handleQuerySubmitted = async (event) => {
  const { queryId, responseTimeMs, fromCache } = event.data;

  try {
    // Save analytics record
    await saveQueryAnalytics({
      queryId,
      tokenCount: event.data.tokenCount || null,
      confidenceScore: null,
      feedbackRating: null,
      metadata: {
        fromCache,
        responseTimeMs,
        processedAt: new Date().toISOString(),
      },
    });

    // Increment topic counter if topic was identified
    if (event.data.topicId) {
      await incrementQueryCount(event.data.topicId);
    }

    logger.info(`Worker: processed QUERY_SUBMITTED (query=${queryId})`);
  } catch (error) {
    logger.error(`Worker: failed to process QUERY_SUBMITTED (query=${queryId}):`, { error: error.message });
  }
};

/**
 * Processes a single ANALYTICS_UPDATE event.
 * @param {object} event - The parsed Kafka message.
 */
const handleAnalyticsUpdate = async (event) => {
  const { queryId, feedbackRating } = event.data;

  try {
    await saveQueryAnalytics({
      queryId,
      tokenCount: event.data.tokenCount || null,
      confidenceScore: event.data.confidenceScore || null,
      feedbackRating: feedbackRating || null,
      metadata: event.data.metadata || {},
    });

    logger.info(`Worker: processed ANALYTICS_UPDATE (query=${queryId})`);
  } catch (error) {
    logger.error(`Worker: failed to process ANALYTICS_UPDATE:`, { error: error.message });
  }
};

/**
 * Starts the Kafka consumer and begins processing messages.
 * Runs indefinitely until the process is terminated.
 */
const startWorker = async () => {
  const consumer = createConsumer(CONSUMER_GROUP);

  await consumer.connect();
  logger.info(`Worker: connected to Kafka (group=${CONSUMER_GROUP})`);

  // Subscribe to all relevant topics
  await consumer.subscribe({
    topics: [KAFKA_TOPICS.QUERY_SUBMITTED, KAFKA_TOPICS.ANALYTICS],
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const event = JSON.parse(message.value.toString());

        switch (event.eventType) {
          case 'QUERY_SUBMITTED':
            await handleQuerySubmitted(event);
            break;
          case 'ANALYTICS_UPDATE':
            await handleAnalyticsUpdate(event);
            break;
          default:
            logger.warn(`Worker: unknown event type: ${event.eventType}`);
        }
      } catch (error) {
        logger.error(`Worker: message processing error (topic=${topic}, partition=${partition}):`, { error: error.message });
      }
    },
  });

  // Graceful shutdown handlers
  const shutdown = async () => {
    logger.info('Worker: shutting down gracefully...');
    await consumer.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  logger.info('Worker: listening for events...');
};

// Boot the worker
startWorker().catch((err) => {
  logger.error('Worker: failed to start:', { error: err.message });
  process.exit(1);
});
