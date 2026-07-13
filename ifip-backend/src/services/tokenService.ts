import crypto from 'node:crypto';

/**
 * Generates a secure, cryptographically random resume token and its sha256 hash.
 */
export const generateResumeToken = (): { raw: string; hash: string } => {
    const raw = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    return { raw, hash };
};

/**
 * Computes the sha256 hash of a candidate resume token.
 */
export const hashToken = (token: string): string => {
    return crypto.createHash('sha256').update(token).digest('hex');
};