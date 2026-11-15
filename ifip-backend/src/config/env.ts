import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
    PORT: z.string().default('5000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    MONGO_URI: z.string().min(1),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRY: z.string().default('1h'),
    JWT_REFRESH_EXPIRY: z.string().default('30d'),
    APPLICANT_SESSION_SECRET: z.string().min(32),
    APPLICANT_SESSION_EXPIRY: z.string().default('7d'),
    OTP_EXPIRY_MINUTES: z.string().default('10'),
    SET_PASSWORD_TOKEN_SECRET: z.string().min(32),
    SET_PASSWORD_TOKEN_EXPIRY: z.string().default('24h'),
    RESET_PASSWORD_TOKEN_SECRET: z.string().min(32),
    RESET_PASSWORD_TOKEN_EXPIRY: z.string().default('1h'),
    CLOUDINARY_CLOUD_NAME: z.string().min(1),
    CLOUDINARY_API_KEY: z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1),
    CLIENT_URL: z.string().min(1),
    CORS_ALLOWED_ORIGINS: z.string().optional(),
    PAYSTACK_SECRET_KEY: z.string().min(1),
    PAYSTACK_CALLBACK_URL: z.string().min(1),
    PAYSTACK_WEBHOOK_SECRET: z.string().transform((val) => val?.trim() || undefined).optional(),
    BANK_TRANSFER_ACCOUNT_NUMBER: z.string().regex(/^\d{4,17}$/).optional(),
    BANK_TRANSFER_HOLD_DAYS: z.coerce.number().int().min(1).max(30).default(5),
    BREVO_API_KEY: z.string().min(1),
    EMAIL_FROM: z.string().min(1),
    EMAIL_REPLY_TO: z.string().email().default('ifip.program@gmail.com'),
    SUPPORT_PHONE: z.string().default('+2349060356610'),
    COHORT_CAP: z.string().default('100'),
    REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
    FLUTTERWAVE_SECRET_KEY: z.string().optional(),
    FLUTTERWAVE_CALLBACK_URL: z.string().optional(),
    FLUTTERWAVE_WEBHOOK_HASH: z.string().optional(),
    COOKIE_DOMAIN: z.string().optional(),
    OPS_EMAIL: z.string().email().optional(),
}).superRefine((config, ctx) => {
    if (!z.url({ protocol: /^https?$/ }).safeParse(config.PAYSTACK_CALLBACK_URL).success) {
        ctx.addIssue({ code: 'custom', path: ['PAYSTACK_CALLBACK_URL'], message: 'An HTTP(S) callback URL is required for Paystack checkout.' });
    }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}

// Watch trigger comment for dev reload 3

export const env = parsed.data;
