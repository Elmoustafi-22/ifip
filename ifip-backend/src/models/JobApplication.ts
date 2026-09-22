import { Schema, model, Document, Types } from 'mongoose';

export type JobApplicationStatus =
    | 'submitted'
    | 'under_review'
    | 'shortlisted'
    | 'interview_scheduled'
    | 'not_selected';

export interface IJobApplicationResponse {
    requirement: string;
    answer: string;
}

export interface IJobApplication extends Document {
    jobOpeningId: Types.ObjectId;
    userId: Types.ObjectId;
    cvUrl: string;
    coverNote?: string;
    responses: IJobApplicationResponse[];
    status: JobApplicationStatus;
    partnerNotes?: string;
    interviewScheduledAt?: Date;
    interviewFormat?: 'Video' | 'Call' | 'In-person';
    interviewLink?: string;
    interviewLocation?: string;
    submittedAt: Date;
    reviewedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const jobApplicationResponseSchema = new Schema<IJobApplicationResponse>(
    {
        requirement: { type: String, required: true },
        answer: { type: String, required: true },
    },
    { _id: false }
);

const jobApplicationSchema = new Schema<IJobApplication>(
    {
        jobOpeningId: { type: Schema.Types.ObjectId, ref: 'JobOpening', required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        cvUrl: { type: String, required: true },
        coverNote: { type: String },
        responses: { type: [jobApplicationResponseSchema], default: [] },
        status: {
            type: String,
            enum: ['submitted', 'under_review', 'shortlisted', 'interview_scheduled', 'not_selected'],
            default: 'submitted',
            required: true,
        },
        partnerNotes: { type: String },
        interviewScheduledAt: { type: Date },
        interviewFormat: { type: String, enum: ['Video', 'Call', 'In-person'] },
        interviewLink: { type: String },
        interviewLocation: { type: String },
        submittedAt: { type: Date, default: Date.now },
        reviewedAt: { type: Date },
    },
    { timestamps: true }
);

// One application per participant per job opening
jobApplicationSchema.index({ jobOpeningId: 1, userId: 1 }, { unique: true });
jobApplicationSchema.index({ userId: 1, submittedAt: -1 });
jobApplicationSchema.index({ jobOpeningId: 1, status: 1 });

export const JobApplication = model<IJobApplication>('JobApplication', jobApplicationSchema);
