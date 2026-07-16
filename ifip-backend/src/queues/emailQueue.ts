import { Queue } from 'bullmq';
import { redisConnection } from '../config/redisConnection.js';

export const emailQueue = new Queue('emailQueue', {
    connection: redisConnection
});

/**
 * Pushes an email dispatch task onto the Redis background queue with retry policies
 */
export const queueEmail = async (type: string, data: any) => {
    try {
        const recipient = data.to || data.email;
        await emailQueue.add(type, { type, data }, {
            attempts: 5,
            backoff: {
                type: 'exponential',
                delay: 5000,
            }
        });
        console.log(`[Queue Producer] Enqueued email job of type: "${type}" to ${recipient}`);
    } catch (err) {
        console.error(`[Queue Producer] Failed to enqueue email job:`, err);
    }
};
