import { Schema, model, Document, Types } from 'mongoose';
import { env } from '../config/env.js';

export interface IApplicant extends Document {
    email: string;
    emailVerified: boolean;
    otpCodeHash?: string;
    otpExpiry?: Date;
    otpSendCount: number;
    otpWindowStart: Date;
    resumeTokenHash?: string;
    fullName?: string;
    phone?: string;
    dob?: Date;
    gender?: string;
    country?: string;
    stateCity?: string;
    academicInfo?: {
        status?: string;
        institution?: string;
        fieldOfStudy?: string;
        qualification?: string;
        gradYear?: number;
    };
    programInterest?: { primary: string[]; secondary?: string };
    skills?: {
        relevantSkills?: string[];
        tools?: string[];
        hasPriorInternship?: boolean;
        priorInternshipDesc?: string;
        commSkillLevel?: string;
        availability?: string;
    };
    motivation?: { whyApplying?: string; careerGoals?: string };
    cvUrl?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    leadSource?: string;
    levyAcknowledged: boolean;
    declaration?: { confirmed?: boolean; signature?: string; date?: Date };
    currentStep: number;
    isPaid?: boolean;
    expiresAt?: Date;
    cohortId?: Types.ObjectId;
    checkoutStartedAt?: Date;
    updatedAt: Date;
    refreshExpiry(): void;
}

const applicantSchema = new Schema<IApplicant>(
    {
        email: { type: String, required: true, lowercase: true, trim: true, index: true },
        emailVerified: { type: Boolean, default: false },
        otpCodeHash: String,
        otpExpiry: Date,
        otpSendCount: { type: Number, default: 0 },
        otpWindowStart: { type: Date, default: Date.now },
        resumeTokenHash: String,
        fullName: String,
        phone: String,
        dob: Date,
        gender: String,
        country: String,
        stateCity: String,
        academicInfo: {
            status: String, institution: String, fieldOfStudy: String,
            qualification: String, gradYear: Number,
        },
        programInterest: { primary: [String], secondary: String },
        skills: {
            relevantSkills: [String], tools: [String],
            hasPriorInternship: Boolean, priorInternshipDesc: String,
            commSkillLevel: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'Native'] },
            availability: { type: String, enum: ['Immediately', 'Within 1-3 months', 'Flexible', 'Physical/ virtual'] },
        },
        motivation: { whyApplying: String, careerGoals: String },
        cvUrl: String,
        linkedinUrl: String,
        portfolioUrl: String,
        leadSource: String,
        levyAcknowledged: { type: Boolean, default: false },
        declaration: { confirmed: Boolean, signature: String, date: Date },
        currentStep: { type: Number, default: 1 },
        isPaid: { type: Boolean, default: false },
        expiresAt: { type: Date, required: false },
        cohortId: { type: Schema.Types.ObjectId, ref: 'Cohort' },
        checkoutStartedAt: Date,
    },
    { timestamps: true }
);

// TTL — self-deletes; Mongoose lifecycle hooks (pre/post 'deleteOne') do NOT
// fire for TTL-driven deletions, since they happen at the MongoDB server level.
// (This is why the Cloudinary purge job below exists as a separate safeguard.)
applicantSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

applicantSchema.methods.refreshExpiry = function (this: IApplicant) {
    if (this.isPaid) {
        this.expiresAt = undefined;
        return;
    }
    const hours = Number(env.RESUME_TOKEN_EXPIRY_HOURS);
    this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
};

export const Applicant = model<IApplicant>('Applicant', applicantSchema);