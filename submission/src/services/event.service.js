import { getProducer, KAFKA_TOPICS } from '../config/kafka.js';

/**
 * Kafka event producer service.
 * Publishes domain events to Kafka topics for asynchronous processing
 * by worker consumers (analytics, logging, etc.).
 * @module services/event.service
 */

/**
 * Publishes a "query submitted" event when a user asks a question.
 * The worker consumes this to persist analytics and update topic counts.
 * @param {object} payload - The event payload.
 * @param {string} payload.queryId - UUID of the stored query.
 * @param {string} payload.userId - UUID of the user.
 * @param {string} payload.queryText - The sanitized question text.
 * @param {string} payload.knowledgeLevel - User's knowledge level.
 * @param {number} payload.responseTimeMs - AI response generation time.
 * @param {boolean} payload.fromCache - Whether it was a cache hit.
 * @returns {Promise<void>}
 */
export const publishQuerySubmitted = async (payload) => {
  try {
    const producer = await getProducer();

    await producer.send({
      topic: KAFKA_TOPICS.QUERY_SUBMITTED,
      messages: [
        {
          key: payload.userId,
          value: JSON.stringify({
            eventType: 'QUERY_SUBMITTED',
            timestamp: new Date().toISOString(),
            data: payload,
          }),
        },
      ],
    });

    console.log(`Event published: QUERY_SUBMITTED (query=${payload.queryId})`);
  } catch (error) {
    // Event publishing failures are non-fatal — the query still succeeded
    console.error('Failed to publish QUERY_SUBMITTED event:', error.message);
  }
};

/**
 * Publishes an analytics event for tracking and reporting.
 * @param {object} payload - The analytics event payload.
 * @param {string} payload.queryId - UUID of the query.
 * @param {number} payload.tokenCount - Tokens consumed by the AI response.
 * @param {number} [payload.feedbackRating] - User satisfaction rating (1-5).
 * @param {object} [payload.metadata] - Additional metadata.
 * @returns {Promise<void>}
 */
export const publishAnalyticsEvent = async (payload) => {
  try {
    const producer = await getProducer();

    await producer.send({
      topic: KAFKA_TOPICS.ANALYTICS,
      messages: [
        {
          key: payload.queryId,
          value: JSON.stringify({
            eventType: 'ANALYTICS_UPDATE',
            timestamp: new Date().toISOString(),
            data: payload,
          }),
        },
      ],
    });
  } catch (error) {
    console.error('Failed to publish analytics event:', error.message);
  }
};
