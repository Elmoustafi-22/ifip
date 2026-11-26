import crypto from 'node:crypto';
import { isAxiosError } from 'axios';
import type { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import { Applicant } from '../models/Applicants.js';
import { Payment, type BankTransfer, type IPayment } from '../models/Payments.js';
import { Application } from '../models/Application.js';
import { User } from '../models/User.js';
import { Cohort } from '../models/Cohort.js';
import { Coupon } from '../models/Coupon.js';
import * as paystackService from '../services/paystackService.js';
import * as flutterwaveService from '../services/flutterwaveService.js';
import { notificationEmitter } from '../services/notificationBroadcast.js';
import { generateResumeToken } from '../services/tokenService.js';
import { signPollingToken, verifyPollingToken } from '../utils/jwt.js';
import { paymentInitiateSchema, paymentReadySchema } from '../validators/applicantValidators.js';
import { env } from '../config/env.js';
import { getLevyAmounts } from '../models/LevyPricing.js';
import { executeApplicationSubmission } from './applicantController.js';
import { logRawAction } from '../utils/auditLogger.js';

import { checkCohortCapacity } from '../services/registrationAvailability.js';
export { getActiveRegistrationCohort, checkCohortCapacity } from '../services/registrationAvailability.js';

class CheckoutRejected extends Error {
    constructor(message: string, public statusCode = 400) {
        super(message);
    }
}

async function replaceRejectedPaystackAttempt(payment: IPayment) {
    return mongoose.connection.transaction(async (session) => {
        const retired = await Payment.updateOne({ _id: payment._id, provider: 'paystack', status: 'pending',
            authorizationUrl: { $exists: false }, reconciliationReason: { $exists: false },
        }, { $set: { status: 'failed' } }, { session });
        if (!retired.modifiedCount) return null;

        const [replacement] = await Payment.create([{
            applicantId: payment.applicantId, cohortId: payment.cohortId, type: payment.type,
            provider: 'flutterwave', providerRef: `IFIP-${crypto.randomUUID()}`,
            amount: payment.amount, currency: payment.currency, originalAmount: payment.originalAmount,
            couponId: payment.couponId, discountPercent: payment.discountPercent,
            checkoutManaged: true, fallbackFromRef: payment.providerRef, fallbackReason: 'paystack_auth_rejected',
        }], { session });
        return replacement;
    });
}

async function initializeHostedCheckout(payment: IPayment, email: string): Promise<IPayment> {
    const metadata = { applicantId: String(payment.applicantId), couponId: payment.couponId?.toString() };
    let authorizationUrl: string;
    try {
        authorizationUrl = payment.provider === 'paystack'
            ? (await paystackService.initializeTransaction({ email, amountMinor: payment.amount,
                reference: payment.providerRef, currency: payment.currency, metadata })).authorization_url
            : (await flutterwaveService.initializeTransaction({ email, amount: payment.amount / 100,
                reference: payment.providerRef, currency: payment.currency, metadata })).link;
    } catch (error) {
        const status = isAxiosError(error) ? error.response?.status : undefined;
        if (status === 401 || status === 403) {
            await recordProviderFailure(payment);
            throw new CheckoutRejected('The payment provider is unavailable. Please try again later.', 503);
        }
        // The provider may have created a payable checkout before the response was lost.
        console.error('[Checkout] Could not confirm hosted checkout creation for', payment.providerRef, error instanceof Error ? error.name : 'unknown error');
        return payment;
    }

    const saved = await Payment.updateOne({ _id: payment._id, status: 'pending', reconciliationReason: { $exists: false } }, { $set: { authorizationUrl } });
    if (!saved.matchedCount) return payment;
    payment.authorizationUrl = authorizationUrl;
    void logRawAction({
        userId: String(payment.applicantId), userEmail: email, userRole: 'applicant',
        action: 'PAYMENT_INITIATED', description: `Checkout started with ${payment.provider} for ${payment.providerRef}`,
        targetId: String(payment._id), targetType: 'Payment',
    });
    return payment;
}

export const initiatePayment = async (req: Request, res: Response) => {
    const applicantId = req.applicant!.id;
    const code = typeof req.body?.couponCode === 'string' ? req.body.couponCode.trim().toUpperCase() : '';

    const { payment, customerEmail } = await mongoose.connection.transaction(async (session) => {
        const applicant = await Applicant.findById(applicantId).session(session);
        const existing = await Payment.findOne({
            applicantId,
            type: 'commitment_levy',
            $or: [
                { status: 'success' },
                { status: 'pending', provider: { $in: ['flutterwave', 'paystack'] } },
                { status: 'pending', 'bankTransfer.review': { $exists: true } },
                { reconciliationReason: 'late_success' },
            ],
        })
            .sort({ status: -1, createdAt: -1 }).select('+authorizationUrl').session(session);

        // Authenticated retries can recover a completed attempt even after the draft was removed.
        if (existing) return { payment: existing, customerEmail: undefined };
        if (!applicant) throw new CheckoutRejected('Session expired — please resume via your email link.', 404);
        if (applicant.isPaid) throw new CheckoutRejected('Payment is already confirmed. Resume your application to submit it.', 409);

        const validation = paymentInitiateSchema.safeParse(applicant.toObject());
        if (!validation.success) throw new CheckoutRejected('Application is incomplete. Please finish all sections before paying.');

        const now = new Date();
        // Updating the cohort in this transaction serializes competing checkout starts.
        const cohort = await Cohort.findOneAndUpdate({
            registrationStartDate: { $lte: now },
            registrationEndDate: { $gte: now },
            status: 'upcoming',
        }, { $inc: { checkoutRevision: 1 } }, { session });
        if (!cohort) throw new CheckoutRejected('There is no active cohort registration window open at this time. Please join our waitlist.');
        const account = await User.findOne({ email: applicant.email }).session(session);
        if (account?.role === 'participant') {
            const existingApplication = await Application.exists({
                userId: account._id,
                cohortId: cohort._id,
                status: { $ne: 'withdrawn' },
            }).session(session);
            if (existingApplication) {
                throw new CheckoutRejected('You already have an application for this cohort. Sign in to check its status.', 409);
            }
        }
        const { isFull } = await checkCohortCapacity(cohort.id, applicantId, session);
        if (isFull) throw new CheckoutRejected('This cohort has reached its registration capacity limit. Please join the waitlist for the next intake.');

        // Serialize claims for the same coupon even across different cohorts.
        const coupon = code
            ? await Coupon.findOneAndUpdate({ code }, { $inc: { checkoutRevision: 1 } }, { session })
            : null;
        if (code && !coupon) throw new CheckoutRejected('Invalid coupon code.');
        if (coupon && !coupon.isActive) throw new CheckoutRejected('This coupon code is currently inactive.');
        if (coupon?.expiresAt && coupon.expiresAt <= now) throw new CheckoutRejected(coupon.expiredMessage || 'This coupon code has expired.');
        if (coupon?.maxUses != null) {
            const pending = await Payment.countDocuments({
                couponId: coupon._id, status: 'pending', checkoutManaged: true,
                $or: [{ bankTransfer: { $exists: false } }, { 'bankTransfer.holdUntil': { $gt: now } }],
            }).session(session);
            if (coupon.usedCount + pending >= coupon.maxUses) {
                throw new CheckoutRejected('This coupon code has reached its maximum usage limit.');
            }
        }

        const currency = applicant.country === 'Nigeria' ? 'NGN' : 'USD';
        const originalAmount = (await getLevyAmounts(session))[currency];
        const discountPercent = coupon?.discountPercent ?? 0;
        const amount = Math.max(0, Math.round(originalAmount * (1 - discountPercent / 100)));
        const waived = amount === 0;
        const transfer = !waived && currency === 'USD';
        let bankTransfer: BankTransfer | undefined;
        if (transfer) {
            if (!applicant.emailVerified || !paymentReadySchema.safeParse(applicant.toObject()).success) {
                throw new CheckoutRejected('Verify your email and sign the declaration before starting a bank transfer.');
            }
            if (!env.BANK_TRANSFER_ACCOUNT_NUMBER) {
                throw new CheckoutRejected('USD bank transfer instructions are unavailable. Email ifip.program@gmail.com for help.', 503);
            }
            bankTransfer = {
                cohortId: cohort._id as Types.ObjectId,
                account: { name: 'Nextif Mentorship Ltd', bank: 'Lead Bank', number: env.BANK_TRANSFER_ACCOUNT_NUMBER,
                    routing: '101019644', swift: 'LEADUS49', type: 'Personal checking',
                    address: '9450 Southwest Gemini Drive, Beaverton, OR 97008, USA' },
                holdUntil: new Date(now.getTime() + env.BANK_TRANSFER_HOLD_DAYS * 86_400_000),
                review: 'awaiting_proof',
            };
        }

        applicant.cohortId = cohort._id as Types.ObjectId;
        if (bankTransfer) applicant.transferHoldUntil = bankTransfer.holdUntil;
        else applicant.checkoutStartedAt = now;
        await applicant.save({ session });
        if (waived && coupon) await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } }, { session });

        const [createdPayment] = await Payment.create([{
            applicantId,
            cohortId: cohort._id,
            provider: waived || transfer ? 'manual' : 'paystack',
            providerRef: (waived ? 'COUPON-' : 'IFIP-') + crypto.randomUUID(),
            amount,
            originalAmount,
            currency,
            status: waived ? 'success' : 'pending',
            checkoutManaged: true,
            bankTransfer,
            discountPercent: discountPercent || undefined,
            couponId: coupon?._id,
            webhookVerified: waived,
            paymentMethod: waived ? 'coupon_100_waiver' : transfer ? 'International bank transfer' : undefined,
            manualPaymentNotes: waived && coupon ? '100% Commitment Levy Waiver Coupon: ' + coupon.code : undefined,
        }], { session });
        return { payment: createdPayment, customerEmail: applicant.email };
    });

    if (payment.status === 'success') {
        const setPasswordToken = await completePaidRegistration(payment);
        if (payment.paymentMethod === 'coupon_100_waiver') {
            if (customerEmail) {
                logRawAction({
                    userId: applicantId, userEmail: customerEmail, userRole: 'applicant',
                    action: 'PAYMENT_CONFIRMED', description: 'Commitment levy waived for ' + payment.providerRef,
                    targetId: String(payment._id), targetType: 'Payment',
                });
            }
            res.json({ status: 'success', bypassPayment: true, reference: payment.providerRef, setPasswordToken });
        } else {
            res.json({ reference: payment.providerRef, pollingToken: signPollingToken(payment.providerRef) });
        }
        return;
    }

    if (payment.bankTransfer) {
        res.json({ method: 'bank_transfer', reference: payment.providerRef });
        return;
    }

    const checkout = customerEmail ? await initializeHostedCheckout(payment, customerEmail) : payment;

    res.json({
        authorizationUrl: checkout.reconciliationReason || checkout.currency === 'USD' ? undefined : checkout.authorizationUrl,
        reference: checkout.providerRef,
        pollingToken: signPollingToken(checkout.providerRef),
    });
};

async function completePaidRegistration(payment: IPayment) {
    if (payment.status !== 'success') return undefined;
    const applicant = await Applicant.findById(payment.applicantId);
    if (!applicant || (applicant.declaration?.confirmed && applicant.declaration.signature)) {
        try {
            return (await executeApplicationSubmission(payment.applicantId, payment._id)).setPasswordToken;
        } catch (error) {
            // Leave the successful payment and draft available for the next verification or final submit.
            if (applicant) {
                await Applicant.updateOne({ _id: applicant._id }, { $set: { isPaid: true }, $unset: { expiresAt: 1 } });
            }
            console.error('[Enrollment] Could not finish payment', payment.providerRef, error instanceof Error ? error.name : 'unknown error');
            return undefined;
        }
    }

    const { raw, hash } = generateResumeToken();
    const markedPaid = await Applicant.findOneAndUpdate({ _id: applicant._id, isPaid: { $ne: true } }, {
        $set: { isPaid: true, resumeTokenHash: hash },
        $unset: { expiresAt: 1 },
    });
    if (markedPaid) notificationEmitter.emit('payment.success', { email: applicant.email, resumeToken: raw, country: applicant.country });
    return undefined;
}

async function recordProviderSuccess(payment: IPayment, verification: Record<string, unknown>, webhookVerified: boolean) {
    const flutterwave = payment.provider === 'flutterwave';
    const verificationField = flutterwave ? 'flutterwaveVerification' : 'paystackVerification';
    const reference = flutterwave ? verification.tx_ref : verification.reference;
    const providerAmount = typeof verification.amount === 'number' ? verification.amount : NaN;
    const requestedAmount = typeof verification.requested_amount === 'number' ? verification.requested_amount : undefined;
    const amount = flutterwave ? Math.round(providerAmount * 100) : providerAmount;
    const amountMatches = amount === payment.amount || (requestedAmount != null && requestedAmount === payment.amount);
    const matches = reference === payment.providerRef && amountMatches && verification.currency === payment.currency;

    const confirmed = await mongoose.connection.transaction(async (session) => {
        if (!matches) {
            await Payment.updateOne({ _id: payment._id, status: { $ne: 'success' }, reconciliationReason: { $ne: 'late_success' } }, {
                $set: { reconciliationReason: 'verification_mismatch', [verificationField]: verification },
            }, { session });
            return false;
        }
        const updated = await Payment.findOneAndUpdate({ _id: payment._id, status: 'pending' }, {
            $set: { status: 'success', [verificationField]: verification, ...(webhookVerified ? { webhookVerified: true } : {}) },
            $unset: { reconciliationReason: 1 },
        }, { session, returnDocument: 'before' });
        if (updated?.couponId) await Coupon.updateOne({ _id: updated.couponId }, { $inc: { usedCount: 1 } }, { session });
        if (!updated) {
            // A retired attempt may have a replacement already. Keep late receipts for reconciliation.
            await Payment.updateOne({ _id: payment._id, status: 'failed' }, {
                $set: { reconciliationReason: 'late_success', [verificationField]: verification },
            }, { session });
            if (webhookVerified) await Payment.updateOne({ _id: payment._id, status: 'success' }, { $set: { webhookVerified: true } }, { session });
        }
        return Boolean(updated);
    });
    if (confirmed) {
        void Applicant.findById(payment.applicantId).select('email').then((applicant) => {
            if (!applicant) return;
            return logRawAction({
                userId: String(payment.applicantId), userEmail: applicant.email, userRole: 'applicant',
                action: 'PAYMENT_CONFIRMED', description: 'Payment confirmed for ' + payment.providerRef,
                targetId: String(payment._id), targetType: 'Payment',
            });
        }).catch((error: unknown) => console.error('[Payment] Could not write confirmation audit', error));
    }
}

async function recordProviderFailure(payment: IPayment) {
    await Payment.updateOne({ _id: payment._id, status: 'pending', reconciliationReason: { $exists: false } }, { $set: { status: 'failed' } });
}

export const getPaymentStatus = async (req: Request, res: Response) => {
    const { token, transaction_id } = req.query;

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

    // Use provider evidence for the outcome. A callback label alone can be stale.
    if (payment.status !== 'success') {
        try {
            if (payment.provider === 'flutterwave') {
                let verified;
                if (typeof transaction_id === 'string' && transaction_id.trim()) {
                    try {
                        verified = await flutterwaveService.verifyTransaction(transaction_id);
                    } catch {
                        // The transaction ID is optional; the stored reference can also be verified.
                    }
                }
                if (verified?.tx_ref !== payment.providerRef) {
                    verified = await flutterwaveService.verifyTransactionByRef(payment.providerRef);
                }
                if (verified.status === 'successful') {
                    await recordProviderSuccess(payment, { ...verified }, false);
                } else if (verified.tx_ref === payment.providerRef && (verified.status === 'failed' || verified.status === 'cancelled')) {
                    await recordProviderFailure(payment);
                }
            } else if (payment.provider === 'paystack') {
                const verified = await paystackService.verifyTransaction(payment.providerRef);
                if (verified.status === 'success') {
                    await recordProviderSuccess(payment, { ...verified }, false);
                } else if (verified.reference === payment.providerRef && verified.status === 'failed') {
                    await recordProviderFailure(payment);
                }
            }
        } catch (error) {
            console.error('[PaymentStatus] Could not verify payment', payment.providerRef, error instanceof Error ? error.name : 'unknown error');
        }
    }

    const current = await Payment.findById(payment._id).orFail();
    const setPasswordToken = await completePaidRegistration(current);
    res.json({ status: current.status !== 'success' && current.reconciliationReason ? 'pending' : current.status, setPasswordToken });
};

// Admin recovery uses the same provider checks and idempotent finalization as polling.
export async function verifyPaystackPaymentForAdmin(payment: IPayment) {
    if (payment.provider !== 'paystack' || payment.bankTransfer) throw new Error('Only Paystack payments can be verified here.');
    if (payment.status === 'pending') {
        const verified = await paystackService.verifyTransaction(payment.providerRef);
        if (verified.status === 'success') {
            await recordProviderSuccess(payment, { ...verified }, false);
        } else if (verified.reference === payment.providerRef && verified.status === 'failed') {
            await recordProviderFailure(payment);
        }
    }
    const current = await Payment.findById(payment._id).orFail();
    await completePaidRegistration(current);
    return Payment.findById(payment._id).orFail();
}

export const handlePaystackWebhook = async (req: Request, res: Response) => {
    if (!env.PAYSTACK_SECRET_KEY) {
        res.status(200).end();
        return;
    }
    if (!paystackService.verifyWebhookSignature(req.rawBody, req.get('paystack-signature'), req.get('x-paystack-signature'))) {
        console.warn('Paystack webhook signature mismatch — possible spoofed request');
        res.status(401).end();
        return;
    }

    const event = req.body as { event?: string; data?: { reference?: string } } | undefined;
    const reference = event?.data?.reference;
    if (event?.event !== 'charge.success' || typeof reference !== 'string' || !reference) {
        res.status(200).end();
        return;
    }

    const payment = await Payment.findOne({ providerRef: reference, provider: 'paystack' });
    if (!payment) {
        res.status(200).end();
        return;
    }
    if (payment.status !== 'success') {
        const verified = await paystackService.verifyTransaction(reference);
        if (verified.status !== 'success') {
            res.status(503).end();
            return;
        }
        await recordProviderSuccess(payment, { ...verified }, true);
    } else if (!payment.webhookVerified) {
        await Payment.updateOne({ _id: payment._id, status: 'success' }, { $set: { webhookVerified: true } });
    }
    await completePaidRegistration(await Payment.findById(payment._id).orFail());
    res.status(200).end();
};

export const handleFlutterwaveWebhook = async (req: Request, res: Response) => {
    const signature = req.headers['verif-hash'] as string | undefined;
    const expectedSignature = env.FLUTTERWAVE_WEBHOOK_HASH;

    if (!signature || signature !== expectedSignature) {
        console.warn('Flutterwave webhook signature mismatch — possible spoofed request');
        res.status(401).end();
        return;
    }

    const payload = req.body as { event: string; data: { tx_ref: string; id: number; status: string } };
    if (payload.event !== 'charge.completed' || payload.data.status !== 'successful') {
        res.status(200).end();
        return;
    }

    const { tx_ref, id } = payload.data;
    const payment = await Payment.findOne({ providerRef: tx_ref, provider: 'flutterwave' });
    if (!payment) {
        res.status(200).end();
        return;
    }
    if (payment.status !== 'success') {
        const verified = await flutterwaveService.verifyTransaction(id);
        if (verified.status === 'successful') await recordProviderSuccess(payment, { ...verified }, true);
        else if (verified.tx_ref === payment.providerRef && (verified.status === 'failed' || verified.status === 'cancelled')) await recordProviderFailure(payment);
    }
    await completePaidRegistration(await Payment.findById(payment._id).orFail());
    res.status(200).end();
};
