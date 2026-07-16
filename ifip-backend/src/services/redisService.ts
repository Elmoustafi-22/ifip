import { createClient } from 'redis';
import { env } from '../config/env.js';

export const redisClient = createClient({
    url: env.REDIS_URL
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

export const connectRedis = async (): Promise<void> => {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
            console.log('Connected to Redis successfully');
        }
    } catch (err: any) {
        console.error('Redis connection failure:', err.message);
    }
};
