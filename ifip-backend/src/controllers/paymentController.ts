import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Applicant } from '../models/Applicants.js';
import { Payment } from '../models/Payments.js';
import { Application } from '../models/Application.js';
import { User } from '../models/User.js';
import { Cohort } from '../models/Cohort.js';
import * as paystackService from '../services/paystackService.js';
import { sendSetPasswordEmail, sendPaymentSuccessEmail } from '../services/emailService.js';
import { generateResumeToken } from '../services/tokenService.js';
import { signSetPasswordToken, signPollingToken, verifyPollingToken } from '../utils/jwt.js';
import { paymentInitiateSchema } from '../validators/applicantValidators.js';
import { env } from '../config/env.js';

export const getActiveRegistrationCohort = async (): Promise<any> => {
    const currentDate = new Date();
    const cohort = await Cohort.findOne({
        registrationStartDate: { $lte: currentDate },
        registrationEndDate: { $gte: currentDate },
        status: 'upcoming'
    });
    return cohort;
};

export const checkCohortCapacity = async (cohortId: Types.ObjectId | string, excludeApplicantId?: string): Promise<{ isFull: boolean; count: number; cap: number }> => {
    const cohort = await Cohort.findById(cohortId);
    if (!cohort) {
        return { isFull: true, count: 0, cap: 0 };
    }

    const applicationsCount = await Application.countDocuments({
        cohortId: new Types.ObjectId(cohortId as string),
        status: { $in: ['payment_confirmed', 'active', 'completed'] }
    });

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const filter: any = {
        cohortId: new Types.ObjectId(cohortId as string),
        $or: [
            { isPaid: true },
            { 
                isPaid: false, 
                checkoutStartedAt: { $gte: fifteenMinutesAgo } 
            }
        ]
    };
    if (excludeApplicantId) {
        filter._id = { $ne: new Types.ObjectId(excludeApplicantId) };
    }

    const lockedApplicantsCount = await Applicant.countDocuments(filter);
    const totalOccupied = applicationsCount + lockedApplicantsCount;

    return {
        isFull: totalOccupied >= cohort.cohortCap,
        count: totalOccupied,
        cap: cohort.cohortCap
    };
};

const LEVY_AMOUNT_KOBO = Number(env.LEVY_AMOUNT_NGN) * 100;

export const initiatePayment = async (req: Request, res: Response) => {
    const applicant = await Applicant.findById(req.applicant!.id);
    if (!applicant) {
        res.status(404).json({ message: 'Session expired — please resume via your email link.' });
        return;
    }

    const validation = paymentInitiateSchema.safeParse(applicant.toObject());
    if (!validation.success) {
        res.status(400).json({
            message: 'Application is incomplete. Please finish all sections before paying.',
            errors: validation.error.flatten(),
        });
        return;
    }

    const activeCohort = await getActiveRegistrationCohort();
    if (!activeCohort) {
        res.status(400).json({ message: 'There is no active cohort registration window open at this time. Please join our waitlist.' });
        return;
    }

    const { isFull } = await checkCohortCapacity(activeCohort._id, applicant.id);
    if (isFull) {
        res.status(400).json({ message: 'This cohort has reached its registration capacity limit. Please join the waitlist for the next intake.' });
        return;
    }

    // Assign cohort association and save checkoutStartedAt lock timestamp
    applicant.cohortId = activeCohort._id as any;
    applicant.checkoutStartedAt = new Date();
    await applicant.save();

    const reference = `IFIP-${crypto.randomUUID()}`;
    const isNigeria = applicant.country === 'Nigeria';
    const amountKobo = isNigeria ? Number(env.LEVY_AMOUNT_NGN) * 100 : 30 * 100;
    const currency = isNigeria ? 'NGN' : 'USD';

    const paystackResponse = await paystackService.initializeTransaction({
        email: applicant.email,
        amountKobo,
        reference,
        currency,
        metadata: { applicantId: applicant.id },
    });

    await Payment.create({
        applicantId: applicant._id,
        provider: 'paystack',
        providerRef: reference,
        amount: amountKobo,
        currency,
        status: 'pending',
    });

    const pollingToken = signPollingToken(reference);

    res.json({ authorizationUrl: paystackResponse.authorization_url, reference, pollingToken });
};

export const getPaymentStatus = async (req: Request, res: Response) => {
    const { token } = req.query;

    if (typeof token !== 'string') {
        res.status(401).json({ message: 'Polling token required.' });
        return;
    }

    let decoded;
    try {
        decoded = verifyPollingToken(token);
    } catch {
        res.status(401).json({ message: 'Invalid or expired polling token.' });
        return;
    }

    if (decoded.reference !== req.params.reference) {
        res.status(403).json({ message: 'Token does not match this payment reference.' });
        return;
    }

    const payment = await Payment.findOne({ providerRef: req.params.reference });
    if (!payment) {
        res.status(404).json({ message: 'Payment not found' });
        return;
    }

    // Fallback direct check if webhook is delayed
    if (payment.status === 'pending') {
        try {
            const verified = await paystackService.verifyTransaction(req.params.reference);
            console.log(`[PaymentStatus] Paystack verify → status=${verified.status} amount=${verified.amount} stored=${payment.amount}`);

            if (verified.status === 'success') {
                // Trust the reference match — Paystack adds processing fee so amounts differ
                payment.status = 'success';
                payment.paystackVerification = verified as unknown as Record<string, unknown>;
                await payment.save();

                // Mark applicant as paid and remove TTL expiresAt field to prevent auto-deletion
                const applicant = await Applicant.findById(payment.applicantId);
                if (applicant && !applicant.isPaid) {
                    const { raw: resumeTokenRaw, hash: resumeTokenHash } = generateResumeToken();
                    applicant.resumeTokenHash = resumeTokenHash;
                    applicant.isPaid = true;
                    applicant.expiresAt = undefined;
                    await applicant.save();

                    try {
                        await sendPaymentSuccessEmail(applicant.email, resumeTokenRaw, applicant.country);
                    } catch (emailError) {
                        console.error('[PaymentStatus] Failed to send payment success email:', emailError);
                    }
                }
            } else if (verified.status === 'failed' || verified.status === 'abandoned') {
                payment.status = 'failed';
                await payment.save();
            }
        } catch (e: any) {
            console.error('[PaymentStatus] Paystack verify error:', e?.response?.status, e?.response?.data ?? e?.message);
        }
    }

    res.json({ status: payment.status });
};

export const handlePaystackWebhook = async (req: Request, res: Response) => {
    const signature = req.headers['x-paystack-signature'] as string | undefined;
    const expectedSignature = crypto
        .createHmac('sha512', env.PAYSTACK_SECRET_KEY)
        .update(req.rawBody!)
        .digest('hex');

    if (!signature || signature !== expectedSignature) {
        console.warn('Paystack webhook signature mismatch — possible spoofed request');
        res.status(401).end();
        return;
    }

    const event = req.body as { event: string; data: { reference: string } };
    if (event.event !== 'charge.success') {
        res.status(200).end();
        return;
    }

    const { reference } = event.data;
    const payment = await Payment.findOne({ providerRef: reference });

    if (!payment) {
        console.warn(`Webhook received for unknown reference: ${reference}`);
        res.status(200).end();
        return;
    }

    if (payment.status === 'success') {
        res.status(200).end();
        return;
    }

    const verified = await paystackService.verifyTransaction(reference);
    if (verified.status !== 'success') {
        console.error(`Webhook verify: non-success status for ${reference}:`, verified.status);
        payment.status = 'failed';
        await payment.save();
        res.status(200).end();
        return;
    }

    payment.status = 'success';
    payment.webhookVerified = true;
    payment.paystackVerification = verified as unknown as Record<string, unknown>;
    await payment.save();

    // Mark applicant as paid and remove TTL expiresAt field to prevent auto-deletion
    const applicant = await Applicant.findById(payment.applicantId);
    if (applicant && !applicant.isPaid) {
        const { raw: resumeTokenRaw, hash: resumeTokenHash } = generateResumeToken();
        applicant.resumeTokenHash = resumeTokenHash;
        applicant.isPaid = true;
        applicant.expiresAt = undefined;
        await applicant.save();

        try {
            await sendPaymentSuccessEmail(applicant.email, resumeTokenRaw, applicant.country);
        } catch (emailError) {
            console.error('[Webhook] Failed to send payment success email:', emailError);
        }
    }

    res.status(200).end();
};