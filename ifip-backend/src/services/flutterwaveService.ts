import axios from 'axios';
import { env } from '../config/env.js';

const flutterwaveApi = axios.create({
    baseURL: 'https://api.flutterwave.com/v3',
    headers: {
        Authorization: `Bearer ${env.FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json'
    },
    timeout: 15000
});

interface InitializeParams {
    email: string;
    amount: number;
    reference: string;
    metadata: Record<string, unknown>;
    currency: string;
}

interface InitializeResponse {
    link: string;
}

interface VerifyResponse {
    status: 'successful' | 'failed' | string;
    amount: number;
    currency: string;
    tx_ref: string;
    id: number;
}

export const initializeTransaction = async (params: InitializeParams): Promise<InitializeResponse> => {
    const { data } = await flutterwaveApi.post('/payments', {
        tx_ref: params.reference,
        amount: params.amount,
        currency: params.currency,
        redirect_url: env.FLUTTERWAVE_CALLBACK_URL,
        meta: params.metadata,
        customer: {
            email: params.email
        },
        customizations: {
            title: 'IFIP Admission',
            description: 'Commitment Levy Payment'
        }
    });

    if (data.status !== 'success') {
        throw new Error(data.message || 'Flutterwave initialization failed');
    }

    return {
        link: data.data.link
    };
};

export const verifyTransaction = async (transactionId: string | number): Promise<VerifyResponse> => {
    const { data } = await flutterwaveApi.get(`/transactions/${transactionId}/verify`);
    if (data.status !== 'success') {
        throw new Error(data.message || 'Flutterwave transaction verification failed');
    }
    return data.data;
};

export const verifyTransactionByRef = async (txRef: string): Promise<VerifyResponse> => {
    const { data } = await flutterwaveApi.get(`/transactions/find_by_tx_ref?tx_ref=${txRef}`);
    if (data.status !== 'success') {
        throw new Error(data.message || 'Flutterwave find by reference failed');
    }
    const transaction = Array.isArray(data.data) ? data.data[0] : data.data;
    if (!transaction) {
        throw new Error('Transaction not found on Flutterwave');
    }
    return transaction;
};
