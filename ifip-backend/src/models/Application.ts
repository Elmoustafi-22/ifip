import { Schema, model, Document, Types } from 'mongoose';

export type ApplicationStatus =
    | 'payment_confirmed'   // just paid, awaiting cohort assignment
    | 'active'               // assigned to a cohort, has LMS access, in training
    | 'completed'            // finished the training curriculum
    | 'withdrawn';           // participant voluntarily left — not a rejection

export interface IApplication extends Document {
    userId: Types.ObjectId;
    paymentId?: Types.ObjectId;
    cohortId?: Types.ObjectId;
    fullName?: string;
    phone?: string;
    dob?: Date;
    gender?: string;
    country?: string;
    stateCity?: string;
    academicInfo?: Record<string, unknown>;
    programInterest?: { primary: string[]; secondary?: string };
    skills?: Record<string, unknown>;
    motivation?: { whyApplying?: string; careerGoals?: string };
    cvUrl?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    leadSource?: string;
    levyAcknowledged?: boolean;
    declaration?: { confirmed?: boolean; signature?: string; date?: Date };
    status: ApplicationStatus;
    submittedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', unique: true, sparse: true },
        cohortId: { type: Schema.Types.ObjectId, ref: 'Cohort' },
        fullName: String,
        phone: String,
        dob: Date,
        gender: String,
        country: String,
        stateCity: String,
        academicInfo: Schema.Types.Mixed,
        programInterest: { primary: [String], secondary: String },
        skills: Schema.Types.Mixed,
        motivation: { whyApplying: String, careerGoals: String },
        cvUrl: String,
        linkedinUrl: String,
        portfolioUrl: String,
        leadSource: String,
        levyAcknowledged: { type: Boolean, default: false },
        declaration: { confirmed: Boolean, signature: String, date: Date },
        status: {
            type: String,
            enum: ['payment_confirmed', 'active', 'completed', 'withdrawn'],
            default: 'payment_confirmed',
        },
        submittedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

applicationSchema.index({ status: 1, createdAt: -1 });
applicationSchema.index({ 'programInterest.primary': 1 });

export const Application = model<IApplication>('Application', applicationSchema);