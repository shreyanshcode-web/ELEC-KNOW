import { Kafka, logLevel } from 'kafkajs';
import { KAFKA_TOPICS } from './constants.js';
import logger from './logger.js';

/**
 * Kafka client for event-driven architecture.
 *
 * GCP deployment:
 * - GKE: Strimzi/Confluent Kafka in-cluster or Confluent Cloud
 * - Alternative: Google Pub/Sub (via Pub/Sub Lite Kafka connector)
 *
 * Graceful degradation: if Kafka is unavailable, event publishing
 * silently fails. The API response is unaffected — analytics are
 * simply delayed until Kafka reconnects.
 *
 * @module config/kafka
 */

const KAFKA_ENABLED = process.env.KAFKA_ENABLED !== 'false';
const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const clientId = process.env.KAFKA_CLIENT_ID || 'election-api';

let kafka = null;
let producer = null;
let kafkaAvailable = false;

/**
 * Returns whether Kafka producer is currently connected.
 * @returns {boolean}
 */
export const isKafkaAvailable = () => kafkaAvailable;

/**
 * Returns the Kafka instance, creating it if needed.
 * @returns {Kafka|null} Kafka instance or null if disabled.
 */
const getKafka = () => {
  if (!KAFKA_ENABLED) {
    return null;
  }

  if (!kafka) {
    kafka = new Kafka({
      clientId,
      brokers,
      logLevel: logLevel.WARN,
      retry: {
        initialRetryTime: 300,
        retries: 5,
      },
    });
  }

  return kafka;
};

/**
 * Returns a connected Kafka producer.
 * Returns null if Kafka is disabled or unavailable (graceful degradation).
 * @returns {Promise<import('kafkajs').Producer|null>} Connected producer or null.
 */
export const getProducer = async () => {
  if (!KAFKA_ENABLED) {
    return null;
  }

  if (producer) {
    return producer;
  }

  try {
    const k = getKafka();
    if (!k) return null;

    producer = k.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });

    await producer.connect();
    kafkaAvailable = true;
    logger.info('Kafka producer: connected', { brokers });
    return producer;
  } catch (err) {
    kafkaAvailable = false;
    logger.warn('Kafka producer connection failed — events will be skipped', {
      error: err.message,
    });
    producer = null;
    return null;
  }
};

/**
 * Creates and returns a Kafka consumer for a given group.
 * @param {string} groupId - The consumer group identifier.
 * @returns {import('kafkajs').Consumer|null} Consumer or null if disabled.
 */
export const createConsumer = (groupId) => {
  const k = getKafka();
  if (!k) return null;

  return k.consumer({
    groupId,
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
  });
};

/**
 * Gracefully disconnects the Kafka producer.
 * @returns {Promise<void>}
 */
export const closeProducer = async () => {
  if (producer) {
    try {
      await producer.disconnect();
      logger.info('Kafka producer: disconnected');
    } catch (err) {
      logger.warn('Kafka producer disconnect error', { error: err.message });
    }
    producer = null;
    kafkaAvailable = false;
  }
};

export { kafka, KAFKA_TOPICS };
