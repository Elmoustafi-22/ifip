import { Schema, model, Document } from 'mongoose';
import { env } from '../config/env.js';
import { string } from 'zod';

export interface IApplicant extends Document {
    email: string;
    emailVerified: boolean;
    otpCodeHash?: string;
    otpExpiry?: Date;
    resumeTokenHash?: string;
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
        weeklyCommitment?: number;
    };
    motivation?: { whyApplying?: string; careerGoals?: string };
    cvUrl?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    leadSource?: string;
    levyAcknowledged: boolean;
    declaration?: { confirmed?: boolean; signature?: string; date?: Date };
    currentStep: number;
    expiresAt: Date;
    refreshExpiry(): void;
};


const applicantSchema = new Schema<IApplicant>(
    {
        email: { type: String, required: true, lowercase: true, trim: true, index: true },
        emailVerified: { type: Boolean, default: false },
        otpCodeHash: String,
        otpExpiry: Date,
        resumeTokenHash: String,
        academicInfo: {
            status: String, institution: String, fieldOfStudy: String,
            qualification: String, gradYear: Number,
        },
        programInterest: { primary: [String], secondary: String },
        skills: {
            relevantSkills: [String], tools: [String],
            hasPriorInternship: Boolean, priorInternshipDesc: String,
            commSkillLevel: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'Native'] },
            availability: { type: String, enum: ['immediately', '1-month', 'Physical/ virtual'] },
            weeklyCommitment: { type: String, enum: ['3-hours', '5-hours', '10-hours'] },

        },
        motivation: { whyApplying: String, careerGoals: String },
        cvUrl: String,
        linkedinUrl: String,
        portfolioUrl: String,
        leadSource: String,
        levyAcknowledged: { type: Boolean, default: false },
        declaration: { confirmed: Boolean, signature: String, date: Date },
        currentStep: { type: Number, default: 1 },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }

)

// TTL — self-deletes; note Mongoose lifecycle hooks (pre/post 'deleteOne') do NOT
// fire for TTL-driven deletions, since they happen at the MongoDB server level.
applicantSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

applicantSchema.methods.refreshExpiry = function (this: IApplicant) {
    const hours = Number(env.RESUME_TOKEN_EXPIRY_HOURS);
    this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
};

export const Applicant = model<IApplicant>('Applicant', applicantSchema);