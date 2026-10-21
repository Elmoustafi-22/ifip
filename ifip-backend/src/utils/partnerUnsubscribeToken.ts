/**
 * partnerUnsubscribeToken.ts
 *
 * Generates and verifies HMAC-signed one-click unsubscribe tokens for partner organisations.
 * Token format: base64url("<orgId>.<hmac-sha256>")
 * No expiry — the token remains valid until the partner re-enables emails.
 */
import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../config/env.js';

const SEPARATOR = '.';

/**
 * Generate a signed unsubscribe token for a partner org.
 */
export function generatePartnerUnsubscribeToken(orgId: string): string {
    const sig = createHmac('sha256', env.JWT_ACCESS_SECRET)
        .update(orgId)
        .digest('hex');
    const raw = `${orgId}${SEPARATOR}${sig}`;
    return Buffer.from(raw).toString('base64url');
}

/**
 * Verify a token and extract the orgId.
 * Returns null if the token is invalid or tampered with.
 */
export function verifyPartnerUnsubscribeToken(token: string): string | null {
    try {
        const raw = Buffer.from(token, 'base64url').toString('utf8');
        const sepIdx = raw.indexOf(SEPARATOR);
        if (sepIdx === -1) return null;

        const orgId = raw.slice(0, sepIdx);
        const receivedSig = raw.slice(sepIdx + 1);

        const expectedSig = createHmac('sha256', env.JWT_ACCESS_SECRET)
            .update(orgId)
            .digest('hex');

        // Constant-time comparison to prevent timing attacks
        const a = Buffer.from(receivedSig, 'hex');
        const b = Buffer.from(expectedSig, 'hex');
        if (a.length !== b.length) return null;
        if (!timingSafeEqual(a, b)) return null;

        return orgId;
    } catch {
        return null;
    }
}
