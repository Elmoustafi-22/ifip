import axios from "axios";
import { env } from "../config/env.js";

const paystackApi = axios.create({
    baseURL: "https://api.paystack.co",
    headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`
    },
    timeout: 15000,

});

interface InitializeParams {
    email: string;
    amountKobo: number;
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
    status: 'success' | 'failed' | 'abandoned';
    amount: number;
    reference: string;
}

export const initializeTransaction = async (params: InitializeParams): Promise<InitializeResponse> => {
    const { data } = await paystackApi.post('/transaction/initialize', {
        email: params.email,
        amount: params.amountKobo,
        reference: params.reference,
        currency: params.currency || 'NGN',
        callback_url: env.PAYSTACK_CALLBACK_URL,
        metadata: params.metadata,
    });
    return data.data;
};

export const verifyTransaction = async (reference: string): Promise<VerifyResponse> => {
    const { data } = await paystackApi.get(`/transaction/verify/${reference}`);
    return data.data;
};