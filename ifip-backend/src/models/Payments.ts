import { Schema, model, Document, Types } from 'mongoose';

export type PaymentStatus = 'pending' | 'success' | 'failed';

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
    },
    { timestamps: true }
);

export const Payment = model<IPayment>('Payment', paymentSchema);