import { createClient } from 'redis';
import { env } from '../config/env.js';

export const redisClient = createClient({
    url: env.REDIS_URL,
    pingInterval: 30000, // Send a PING every 30 seconds to keep TLS/TCP connection alive
    socket: {
        keepAlive: true, // Enable TCP Keep-Alive
        reconnectStrategy(retries) {
            // Reconnect strategy: start fast, back off to max 3 seconds
            return Math.min(retries * 100, 3000);
        }
    }
});

redisClient.on('error', (err) => {
    // Avoid console spam for unexpected socket closures as node-redis automatically reconnects
    if (err.name === 'SocketClosedUnexpectedlyError') {
        console.warn('Redis Connection Warning: Socket closed unexpectedly. Reconnecting...');
    } else {
        console.error('Redis Client Error:', err);
    }
});

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
