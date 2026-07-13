import { Schema, model, Document, Types } from 'mongoose';

export type PaymentStatus = 'pending' | 'success' | 'failed';

export interface IPayment extends Document {
    applicantId: Types.ObjectId;
    applicationId?: Types.ObjectId;
    provider: 'paystack';
    providerRef: string;
    amount: number; // kobo
    currency: string;
    status: PaymentStatus;
    type: string;
    webhookVerified: boolean;
    paystackVerification?: Record<string, unknown>;
}

const paymentSchema = new Schema<IPayment>(
    {
        applicantId: { type: Schema.Types.ObjectId, ref: 'Applicant', required: true },
        applicationId: { type: Schema.Types.ObjectId, ref: 'Application' },
        provider: { type: String, enum: ['paystack'], default: 'paystack' },
        providerRef: { type: String, required: true, unique: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'NGN' },
        status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
        type: { type: String, default: 'commitment_levy' },
        webhookVerified: { type: Boolean, default: false },
        paystackVerification: Schema.Types.Mixed,
    },
    { timestamps: true }
);

export const Payment = model<IPayment>('Payment', paymentSchema);