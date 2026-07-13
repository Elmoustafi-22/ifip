import crypto from 'node:crypto';
import { env } from '../config/env.js';
import type { IApplicant } from '../models/Applicants.js';

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

const COOLDOWN_SECONDS = 60;
const MAX_PER_WINDOW = 5;
const WINDOW_HOURS = 24;

interface RateLimitResult {
    allowed: boolean;
    reason?: string;
    retryAfterSeconds?: number;
}

// Persistent, DB-backed check — holds up across server restarts and multiple
// instances, unlike the in-memory express-rate-limit layers in app.ts.
export const checkOtpSendAllowed = (applicant: IApplicant): RateLimitResult => {
    const now = Date.now();
    const windowStart = applicant.otpWindowStart?.getTime() ?? 0;
    const windowMs = WINDOW_HOURS * 60 * 60 * 1000;

    if (now - windowStart > windowMs) {
        return { allowed: true };
    }

    const lastSentMs = applicant.updatedAt?.getTime?.() ?? 0;
    const secondsSinceLastSend = (now - lastSentMs) / 1000;
    if (applicant.otpSendCount > 0 && secondsSinceLastSend < COOLDOWN_SECONDS) {
        return {
            allowed: false,
            reason: 'Please wait before requesting another code.',
            retryAfterSeconds: Math.ceil(COOLDOWN_SECONDS - secondsSinceLastSend),
        };
    }

    if (applicant.otpSendCount >= MAX_PER_WINDOW) {
        return { allowed: false, reason: 'Too many verification codes requested. Please try again later.' };
    }

    return { allowed: true };
};