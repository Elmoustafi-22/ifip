import Redis from 'ioredis';
import { env } from './env.js';

// Resolve default import if needed (ioredis handles ESM differently in some environments)
const RedisClient = (Redis as any).default || Redis;

export const redisConnection = new RedisClient(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableKeepAlive: true,
    keepAliveDelay: 5000, // Enable TCP Keep-Alive with 5-second delay
});

export default redisConnection;
