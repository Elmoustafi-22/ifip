import crypto from 'node:crypto';
import axios from "axios";
import { env } from "../config/env.js";

const paystackApi = axios.create({
    baseURL: "https://api.paystack.co",
    headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY ?? ''}`
    },
    timeout: 15000,
});

interface InitializeParams {
    email: string;
    amountMinor: number;
    reference: string;
    metadata: Record<string, unknown>;
    currency?: string;
}

interface InitializeResponse {
    authorization_url: string;
    access_code: string;
    reference: string;
}

interface VerifyResponse {
    status: string;
    amount: number;
    currency: string;
    reference: string;
}

export const initializeTransaction = async (params: InitializeParams): Promise<InitializeResponse> => {
    const { data } = await paystackApi.post('/transaction/initialize', {
        email: params.email,
        amount: String(params.amountMinor),
        reference: params.reference,
        currency: params.currency || 'NGN',
        callback_url: env.PAYSTACK_CALLBACK_URL,
        metadata: JSON.stringify(params.metadata),
    });
    if (data.status !== true || data.data?.reference !== params.reference ||
        typeof data.data.authorization_url !== 'string' || new URL(data.data.authorization_url).protocol !== 'https:') {
        throw new Error('Paystack checkout could not be confirmed');
    }
    return data.data;
};

export const verifyTransaction = async (reference: string): Promise<VerifyResponse> => {
    const { data } = await paystackApi.get(`/transaction/verify/${encodeURIComponent(reference)}`);
    if (data.status !== true || typeof data.data?.status !== 'string') throw new Error('Paystack verification unavailable');
    return data.data;
};

function matchesSignature(expected: Buffer, signature: string | undefined) {
    return Boolean(signature && /^[0-9a-f]{128}$/.test(signature) && crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex')));
}

export function verifyWebhookSignature(rawBody: Buffer | undefined, signedHeader?: string, legacyHeader?: string) {
    if (!Buffer.isBuffer(rawBody)) return false;
    if (env.PAYSTACK_WEBHOOK_SECRET) {
        const parts = signedHeader?.split(',').map(part => part.trim()) ?? [];
        const timestamps = parts.filter(part => part.startsWith('t='));
        const timestamp = timestamps[0]?.slice(2) ?? '';
        if (timestamps.length !== 1 || !/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
        const expected = crypto.createHmac('sha512', env.PAYSTACK_WEBHOOK_SECRET).update(`${timestamp}.`).update(rawBody).digest();
        return parts.some(part => part.startsWith('v1=whk_') && matchesSignature(expected, part.split(':')[1]));
    }
    if (!env.PAYSTACK_SECRET_KEY) return false;
    const expected = crypto.createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(rawBody).digest();
    return matchesSignature(expected, legacyHeader);
}
