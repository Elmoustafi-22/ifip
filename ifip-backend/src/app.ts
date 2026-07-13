import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import applicantRoutes from './routes/applicantRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import authRoutes from './routes/authRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import waitlistRoutes from './routes/waitlistRoutes.js';
import cohortRoutes from './routes/cohortRoutes.js';
import lmsRoutes from './routes/lmsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import placementRoutes from './routes/placementRoutes.js';
import partnerRoutes from './routes/partnerRoutes.js';
import { otpEmailLimiter } from './middleware/otpEmailLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(helmet());

const allowedOrigins = [
    env.CLIENT_URL,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
];

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (
                allowedOrigins.includes(origin) ||
                origin.startsWith('http://localhost:') ||
                origin.startsWith('http://127.0.0.1:')
            ) {
                return callback(null, true);
            }
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
    })
);

app.use(
    express.json({
        verify: (req, _res, buf) => {
            (req as express.Request).rawBody = buf;
        },
    })
);

app.use(cookieParser());
app.use(morgan('dev'));

const otpIpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const paymentLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

app.use('/api/v1/applicants/start', otpIpLimiter, otpEmailLimiter);
app.use('/api/v1/applicants', applicantRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/payments/initiate', paymentLimiter);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/waitlist', waitlistRoutes);
app.use('/api/v1/cohort', cohortRoutes);
app.use('/api/v1/lms', lmsRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/placements', placementRoutes);
app.use('/api/v1/partners', partnerRoutes);

app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

export default app;