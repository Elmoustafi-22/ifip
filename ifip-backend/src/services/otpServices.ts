import crypto from 'node:crypto';
import { env } from '../config/env.js';

// OTP is hashed at rest with a fast hash (sha256), not bcrypt — this is a
// 10-minute-lived 6-digit code, not a long-term credential, so bcrypt's
// deliberate slowness buys nothing here.
export const generateOtp = (): { code: string; hash: string; expiry: Date } => {
    const code = crypto.randomInt(100000, 999999).toString();
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    const expiry = new Date(Date.now() + Number(env.OTP_EXPIRY_MINUTES) * 60 * 1000);
    return { code, hash, expiry };
};

export const verifyOtp = (candidate: string, hash: string): boolean => {
    const candidateHash = crypto.createHash('sha256').update(candidate).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(hash));
};
