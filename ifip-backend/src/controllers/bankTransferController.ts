import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import mongoose, { Types } from 'mongoose';
import multer from 'multer';
import { z } from 'zod';
import { Applicant } from '../models/Applicants.js';
import { Application } from '../models/Application.js';
import { Cohort } from '../models/Cohort.js';
import { Coupon } from '../models/Coupon.js';
import { Payment, type BankTransfer, type IPayment } from '../models/Payments.js';
import { User } from '../models/User.js';
import { executeApplicationSubmission } from './applicantController.js';
import { checkCohortCapacity } from './paymentController.js';
import { paymentReadySchema } from '../validators/applicantValidators.js';
import { logAction } from '../utils/auditLogger.js';
import { sendSetPasswordEmail } from '../services/emailService.js';

const proofInput = z.object({ bankReference: z.string().trim().min(3).max(120), transferDate: z.iso.date() });
const approvalInput = z.object({ proofId: z.uuid(), bankCreditId: z.string().trim().min(3).max(120), settledDate: z.iso.date(),
    creditedAmount: z.string().regex(/^\d{1,8}(\.\d{1,2})?$/), currency: z.literal('USD') });
const reviewInput = z.object({ decision: z.enum(['needs_information', 'closed']), feedback: z.string().trim().min(1).max(500) });
const transferFilter = { 'bankTransfer.review': { $exists: true } };
const proofStates: BankTransfer['review'][] = ['awaiting_proof', 'needs_information', 'under_review'];

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 2 } }).single('receipt');
export const uploadTransferReceipt = (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, (error: unknown) => {
        if (error) {
            res.status(400).json({ message: 'Upload one PDF, PNG or JPEG receipt up to 5 MB.' });
            return;
        }
        next();
    });
};

function receiptType(file?: Express.Multer.File) {
    const bytes = file?.buffer;
    if (!bytes?.length) return undefined;
    if (bytes.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
    if (bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'image/png';
    if (bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) return 'image/jpeg';
    return undefined;
}

function publicTransfer(payment: IPayment, setPasswordToken?: string) {
    const transfer = payment.bankTransfer!;
    return {
        reference: payment.providerRef, amount: payment.amount, currency: payment.currency,
        review: transfer.review, holdUntil: transfer.holdUntil, feedback: transfer.feedback,
        account: transfer.review === 'awaiting_proof' && transfer.holdUntil > new Date() ? transfer.account : undefined,
        enrolled: Boolean(payment.applicationId), setPasswordToken,
    };
}

async function enrollApprovedTransfer(payment: IPayment) {
    return executeApplicationSubmission(payment.applicantId, String(payment._id));
}

export const getMyBankTransfer = async (req: Request, res: Response) => {
    res.set('Cache-Control', 'no-store');
    const payment = await Payment.findOne({ applicantId: req.applicant!.id, ...transferFilter })
        .sort({ createdAt: -1 }).select('+bankTransfer.account');
    if (!payment) { res.json({ transfer: null }); return; }
    if (payment.bankTransfer?.review === 'approved') {
        const result = await enrollApprovedTransfer(payment);
        payment.applicationId = result.application._id as Types.ObjectId;
        res.json({ transfer: publicTransfer(payment, result.setPasswordToken) });
        return;
    }
    res.json({ transfer: publicTransfer(payment) });
};

function submitProof(source: 'upload' | 'email') {
    return async (req: Request, res: Response) => {
        const input = proofInput.safeParse(req.body);
        const type = receiptType(req.file);
        if (!input.success || !type || input.data.transferDate > new Date().toISOString().slice(0, 10)) {
            res.status(400).json({ message: 'Enter a bank transaction ID, a valid transfer date, and a PDF, PNG or JPEG receipt.' });
            return;
        }
        const owner = source === 'upload' ? { applicantId: req.applicant!.id } : { _id: String(req.params.id) };
        const eligible = { ...owner, status: 'pending' as const, 'bankTransfer.review': { $in: proofStates } };
        const payment = await Payment.findOneAndUpdate(eligible, { $set: {
            'bankTransfer.review': 'under_review', 'bankTransfer.bankReference': input.data.bankReference,
            'bankTransfer.proofId': randomUUID(),
            'bankTransfer.transferDate': input.data.transferDate, 'bankTransfer.source': source,
            'bankTransfer.receiptType': type, transferReceipt: req.file!.buffer,
        }, $unset: { 'bankTransfer.feedback': 1 } }, { sort: { createdAt: -1 }, returnDocument: 'after' }).select('-transferReceipt');
        if (!payment) { res.status(409).json({ message: 'This transfer is no longer accepting proof.' }); return; }
        if (source === 'email') await logAction(req, 'TRANSFER_EMAIL_PROOF', 'Attached emailed bank transfer evidence.', { targetId: String(payment._id), targetType: 'Payment' });
        res.json({ transfer: publicTransfer(payment) });
    };
}

export const submitApplicantTransferProof = submitProof('upload');
export const attachEmailedTransferProof = submitProof('email');

export const downloadTransferReceipt = async (req: Request, res: Response) => {
    const payment = await Payment.findOne({ _id: req.params.id, ...transferFilter }).select('+transferReceipt');
    if (!payment?.transferReceipt || !payment.bankTransfer?.receiptType) { res.status(404).end(); return; }
    const extension = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg' }[payment.bankTransfer.receiptType];
    res.set({ 'Cache-Control': 'private, no-store', 'Content-Disposition': `attachment; filename="receipt.${extension}"`, 'X-Content-Type-Options': 'nosniff' });
    res.type(payment.bankTransfer.receiptType).send(Buffer.from(payment.transferReceipt));
};

class TransferConflict extends Error {}

export const approveBankTransfer = async (req: Request, res: Response) => {
    try {
        const payment = await mongoose.connection.transaction(async session => {
            const current = await Payment.findOne({ _id: req.params.id, ...transferFilter }).session(session);
            if (!current) throw new TransferConflict('Transfer request was not found.');
            const transfer = current.bankTransfer!;
            if (transfer.review === 'approved' && current.status === 'success') return current;
            if (transfer.review !== 'under_review' || current.status !== 'pending') throw new TransferConflict('Attach payment proof before approving.');
            const input = approvalInput.safeParse(req.body);
            if (!input.success || input.data.settledDate > new Date().toISOString().slice(0, 10) ||
                input.data.settledDate < (transfer.transferDate ?? '') || Math.round(Number(input.data.creditedAmount) * 100) !== current.amount) {
                throw new TransferConflict('Enter the settled bank reference and date, and confirm the exact quoted USD amount.');
            }
            if (input.data.proofId !== transfer.proofId) throw new TransferConflict('The receipt changed. Reopen the payment and check the current proof.');
            const draft = await Applicant.findById(current.applicantId).session(session);
            if (!draft?.emailVerified || draft.country === 'Nigeria' || !paymentReadySchema.safeParse(draft.toObject()).success) {
                throw new TransferConflict('The applicant must complete and sign their application before approval.');
            }
            const cohort = await Cohort.findOneAndUpdate({ _id: transfer.cohortId, status: 'upcoming' }, { $inc: { checkoutRevision: 1 } }, { session });
            if (!cohort || (await checkCohortCapacity(cohort.id, draft.id, session)).isFull) throw new TransferConflict('The original cohort cannot accept this transfer. Review it with finance before promising a seat.');
            const existing = await Payment.exists({ applicantId: draft._id, status: 'success' }).session(session);
            const account = await User.findOne({ email: draft.email }).select('role').session(session);
            if (draft.isPaid || existing || (account && (account.role !== 'applicant' || await Application.exists({ userId: account._id }).session(session)))) {
                throw new TransferConflict('The applicant already has a payment or an account requiring review.');
            }
            if (current.couponId) {
                const coupon = await Coupon.findOneAndUpdate({ _id: current.couponId }, { $inc: { checkoutRevision: 1 } }, { session });
                const now = new Date();
                const otherHolds = await Payment.countDocuments({ couponId: current.couponId, _id: { $ne: current._id }, status: 'pending', checkoutManaged: true,
                    $or: [{ bankTransfer: { $exists: false } }, { 'bankTransfer.holdUntil': { $gt: now } }],
                }).session(session);
                if (!coupon || (coupon.maxUses != null && coupon.usedCount + otherHolds >= coupon.maxUses) ||
                    (transfer.holdUntil <= now && (!coupon.isActive || (coupon.expiresAt && coupon.expiresAt <= now)))) {
                    throw new TransferConflict('The coupon reservation is no longer available. Review the payment with finance.');
                }
                await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } }, { session });
            }
            transfer.creditKey = input.data.bankCreditId.replace(/\s+/g, '').toUpperCase();
            transfer.settledDate = input.data.settledDate;
            transfer.review = 'approved';
            current.status = 'success';
            current.recordedByAdminId = new Types.ObjectId(req.user!.id);
            await current.save({ session });
            draft.cohortId = transfer.cohortId;
            draft.isPaid = true;
            draft.transferHoldUntil = undefined;
            await draft.save({ session });
            return current;
        });

        const result = await enrollApprovedTransfer(payment);
        await logAction(req, 'TRANSFER_APPROVED', 'Confirmed settled bank credit and completed enrollment.', { targetId: String(payment._id), targetType: 'Payment' });
        res.json({ message: 'Transfer approved and enrollment complete.', applicationId: result.application._id });
    } catch (error) {
        if (error instanceof TransferConflict || (error as { code?: number }).code === 11000) {
            res.status(409).json({ message: error instanceof TransferConflict ? error.message : 'This bank credit is already linked to another payment.' });
            return;
        }
        throw error;
    }
};

export const reviewBankTransfer = async (req: Request, res: Response) => {
    const parsed = reviewInput.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: 'Enter a decision and an explanation for the applicant.' }); return; }
    const { decision, feedback } = parsed.data;
    const changed = await mongoose.connection.transaction(async session => {
        const payment = await Payment.findOneAndUpdate({ _id: String(req.params.id), status: 'pending', 'bankTransfer.review': { $in: proofStates } }, {
            $set: { 'bankTransfer.review': decision, 'bankTransfer.feedback': feedback,
                ...(decision === 'closed' ? { status: 'failed', 'bankTransfer.holdUntil': new Date() } : {}) },
        }, { session });
        if (payment && decision === 'closed') await Applicant.updateOne({ _id: payment.applicantId }, { $unset: { transferHoldUntil: 1 } }, { session });
        return Boolean(payment);
    });
    if (!changed) { res.status(409).json({ message: 'This request can no longer be reviewed.' }); return; }
    await logAction(req, 'TRANSFER_REVIEWED', `Transfer decision: ${decision}.`, { targetId: String(req.params.id), targetType: 'Payment' });
    res.json({ message: 'Transfer review saved.' });
};

export const resendTransferSetup = async (req: Request, res: Response) => {
    const payment = await Payment.findOne({ _id: req.params.id, status: 'success', 'bankTransfer.review': 'approved' });
    if (!payment) { res.status(404).json({ message: 'Approved transfer was not found.' }); return; }
    const hadEnrollment = Boolean(payment.applicationId);
    const { application, setPasswordToken } = await enrollApprovedTransfer(payment);
    if (!setPasswordToken) { res.status(409).json({ message: 'The applicant already set a password. They can sign in or reset it.' }); return; }
    if (hadEnrollment) {
        const user = await User.findById(application.userId).orFail();
        try {
            await sendSetPasswordEmail(user.email, setPasswordToken, user.country, true);
        } catch {
            res.status(502).json({ message: 'The email provider could not send the password setup link. Try again later.' });
            return;
        }
    }
    res.json({ message: 'Password setup email requested.' });
};
