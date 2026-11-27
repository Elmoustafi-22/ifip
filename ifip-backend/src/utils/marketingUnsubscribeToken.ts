import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

const signature = (id: string) => createHmac('sha256', env.APPLICANT_SESSION_SECRET).update(`marketing-unsubscribe:${id}`).digest('base64url');

export function createMarketingUnsubscribeToken(id: string) {
    return `${id}.${signature(id)}`;
}

export function verifyMarketingUnsubscribeToken(token: string) {
    const [id, supplied, ...rest] = token.split('.');
    if (!id || !supplied || rest.length || !/^[a-f\d]{24}$/i.test(id)) return null;
    const expected = Buffer.from(signature(id));
    const actual = Buffer.from(supplied);
    return actual.length === expected.length && timingSafeEqual(actual, expected) ? id : null;
}
