import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

// Keyed by email, not IP — catches someone rotating source IPs to dodge
// the IP-based limiter and spam one victim's inbox.
export const otpEmailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
        const email = req.body?.email;
        return typeof email === 'string' ? email.toLowerCase().trim() : req.ip ?? 'unknown';
    },
    validate: { keyGeneratorIpFallback: false },
    message: { message: 'Too many verification code requests for this email. Please wait 15 minutes and try again.' },
});