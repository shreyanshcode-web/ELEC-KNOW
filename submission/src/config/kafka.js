import { Kafka, logLevel } from 'kafkajs';
import { KAFKA_TOPICS } from './constants.js';

/**
 * Kafka client configuration for event-driven architecture.
 * Produces events when queries are submitted; workers consume them asynchronously.
 * @module config/kafka
 */

const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const clientId = process.env.KAFKA_CLIENT_ID || 'election-api';

const kafka = new Kafka({
  clientId,
  brokers,
  logLevel: logLevel.WARN,
  retry: {
    initialRetryTime: 300,
    retries: 8,
  },
});

/** Shared Kafka producer instance */
let producer = null;

/**
 * Returns an initialized and connected Kafka producer.
 * @returns {Promise<import('kafkajs').Producer>} Connected producer.
 */
export const getProducer = async () => {
  if (producer) {
    return producer;
  }

  producer = kafka.producer({
    allowAutoTopicCreation: true,
    transactionTimeout: 30000,
  });

  await producer.connect();
  console.log('Kafka producer: connected');
  return producer;
};

/**
 * Creates and returns a Kafka consumer for a given group.
 * @param {string} groupId - The consumer group identifier.
 * @returns {import('kafkajs').Consumer} An unconnected consumer.
 */
export const createConsumer = (groupId) => {
  return kafka.consumer({
    groupId,
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
  });
};

/**
 * Gracefully disconnects the Kafka producer. Call during shutdown.
 * @returns {Promise<void>}
 */
export const closeProducer = async () => {
  if (producer) {
    await producer.disconnect();
    producer = null;
    console.log('Kafka producer: disconnected');
  }
};

export { kafka, KAFKA_TOPICS };
