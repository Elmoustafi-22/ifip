import { Schema, model, Document, Types } from 'mongoose';

export interface IApplicant extends Document {
    email: string;
    emailVerified: boolean;
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
    lastReminderSentAt?: Date;
    reminderCount?: number;
    reminderHistory?: Array<{
        sentAt: Date;
        sentBy?: string;
        subject?: string;
        includeResumeLink?: boolean;
    }>;
    updatedAt: Date;
    refreshExpiry(): void;
}

const applicantSchema = new Schema<IApplicant>(
    {
        email: { type: String, required: true, lowercase: true, trim: true, index: true },
        emailVerified: { type: Boolean, default: false },
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
            availability: { type: String, enum: ['Immediately', 'Within 1 week', 'Within 2 weeks', 'Within 3 weeks'] },
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
        lastReminderSentAt: Date,
        reminderCount: { type: Number, default: 0 },
        reminderHistory: [
            {
                sentAt: { type: Date, default: Date.now },
                sentBy: String,
                subject: String,
                includeResumeLink: Boolean,
            },
        ],
    },
    { timestamps: true }
);

// No TTL index — applicant documents are kept indefinitely until the cohort closes.
// Deletion is handled manually by admins only.

applicantSchema.methods.refreshExpiry = function (this: IApplicant) {
    // Applicant data is retained indefinitely — no rolling TTL.
    // Always clear expiresAt so the (now-removed) TTL index never triggers.
    this.expiresAt = undefined;
};

export const Applicant = model<IApplicant>('Applicant', applicantSchema);