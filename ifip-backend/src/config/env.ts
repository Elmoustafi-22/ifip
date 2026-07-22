import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
    PORT: z.string().default('5000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    MONGO_URI: z.string().min(1),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRY: z.string().default('15m'),
    JWT_REFRESH_EXPIRY: z.string().default('7d'),
    APPLICANT_SESSION_SECRET: z.string().min(32),
    APPLICANT_SESSION_EXPIRY: z.string().default('2h'),
    RESUME_TOKEN_EXPIRY_HOURS: z.string().default('48'),
    OTP_EXPIRY_MINUTES: z.string().default('10'),
    SET_PASSWORD_TOKEN_SECRET: z.string().min(32),
    SET_PASSWORD_TOKEN_EXPIRY: z.string().default('24h'),
    RESET_PASSWORD_TOKEN_SECRET: z.string().min(32),
    RESET_PASSWORD_TOKEN_EXPIRY: z.string().default('1h'),
    CLOUDINARY_CLOUD_NAME: z.string().min(1),
    CLOUDINARY_API_KEY: z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1),
    CLIENT_URL: z.string().min(1),
    PAYSTACK_SECRET_KEY: z.string().min(1),
    PAYSTACK_CALLBACK_URL: z.string().min(1),
    LEVY_AMOUNT_NGN: z.string().default('20000'),
    BREVO_API_KEY: z.string().min(1),
    EMAIL_FROM: z.string().min(1),
    EMAIL_REPLY_TO: z.string().email().default('ifip.program@gmail.com'),
    COHORT_CAP: z.string().default('100'),
    COHORT_START_DATE: z.string().default('2026-08-31T00:00:00.000Z'),
    REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
    FLUTTERWAVE_SECRET_KEY: z.string().min(1),
    FLUTTERWAVE_CALLBACK_URL: z.string().min(1),
    FLUTTERWAVE_WEBHOOK_HASH: z.string().min(1),
    LEVY_AMOUNT_USD: z.string().default('30'),
    COOKIE_DOMAIN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}

// Watch trigger comment for dev reload 2

export const env = parsed.data;