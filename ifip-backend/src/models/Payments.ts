import { Schema, model, Document, Types } from 'mongoose';

export type PaymentStatus = 'pending' | 'success' | 'failed';

export interface BankTransfer {
    cohortId: Types.ObjectId;
    account: { name: string; bank: string; number: string; routing: string; swift: string; type: string; address: string };
    holdUntil: Date;
    review: 'awaiting_proof' | 'under_review' | 'needs_information' | 'approved' | 'closed';
    bankReference?: string;
    proofId?: string;
    transferDate?: string;
    source?: 'upload' | 'email';
    receiptType?: string;
    feedback?: string;
    creditKey?: string;
    settledDate?: string;
}

export interface IPayment extends Document {
    applicantId: Types.ObjectId;
    applicationId?: Types.ObjectId;
    provider: 'paystack' | 'flutterwave' | 'manual';
    providerRef: string;
    amount: number; // kobo/cents
    currency: string;
    status: PaymentStatus;
    type: string;
    webhookVerified: boolean;
    receiptUrl?: string;
    paymentMethod?: string;
    manualPaymentNotes?: string;
    recordedByAdminId?: Types.ObjectId;
    paystackVerification?: Record<string, unknown>;
    flutterwaveVerification?: Record<string, unknown>;
    couponId?: Types.ObjectId;
    discountPercent?: number;
    originalAmount?: number;
    authorizationUrl?: string;
    checkoutManaged?: boolean;
    fallbackFromRef?: string;
    fallbackReason?: 'currency_unavailable' | 'paystack_auth_rejected';
    reconciliationReason?: 'verification_mismatch' | 'late_success';
    bankTransfer?: BankTransfer;
    transferReceipt?: Buffer;
}

const paymentSchema = new Schema<IPayment>(
    {
        applicantId: { type: Schema.Types.ObjectId, ref: 'Applicant', required: true },
        applicationId: { type: Schema.Types.ObjectId, ref: 'Application' },
        provider: { type: String, enum: ['paystack', 'flutterwave', 'manual'], default: 'flutterwave' },
        providerRef: { type: String, required: true, unique: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'NGN' },
        status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
        type: { type: String, default: 'commitment_levy' },
        webhookVerified: { type: Boolean, default: false },
        receiptUrl: { type: String },
        paymentMethod: { type: String },
        manualPaymentNotes: { type: String },
        recordedByAdminId: { type: Schema.Types.ObjectId, ref: 'User' },
        paystackVerification: Schema.Types.Mixed,
        flutterwaveVerification: Schema.Types.Mixed,
        couponId: { type: Schema.Types.ObjectId, ref: 'Coupon' },
        discountPercent: { type: Number },
        originalAmount: { type: Number },
        authorizationUrl: { type: String, select: false },
        checkoutManaged: { type: Boolean, select: false },
        fallbackFromRef: { type: String },
        fallbackReason: { type: String, enum: ['currency_unavailable', 'paystack_auth_rejected'] },
        reconciliationReason: { type: String, enum: ['verification_mismatch', 'late_success'] },
        bankTransfer: {
            type: new Schema<BankTransfer>({
                cohortId: { type: Schema.Types.ObjectId, ref: 'Cohort', required: true },
                account: { type: new Schema({ name: String, bank: String, number: String, routing: String, swift: String, type: { type: String }, address: String }, { _id: false }), select: false, required: true },
                holdUntil: { type: Date, required: true },
                review: { type: String, enum: ['awaiting_proof', 'under_review', 'needs_information', 'approved', 'closed'], required: true },
                bankReference: String,
                proofId: String,
                transferDate: String,
                source: { type: String, enum: ['upload', 'email'] },
                receiptType: String,
                feedback: String,
                creditKey: String,
                settledDate: String,
            }, { _id: false }),
        },
        transferReceipt: { type: Buffer, select: false },
    },
    { timestamps: true }
);

paymentSchema.index({ applicantId: 1, type: 1, status: 1, createdAt: -1 });
paymentSchema.index({ 'bankTransfer.creditKey': 1 }, { unique: true, sparse: true });

export const Payment = model<IPayment>('Payment', paymentSchema);
