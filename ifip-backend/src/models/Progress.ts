import { Schema, model, Document, Types } from 'mongoose';

export interface IProgress extends Document {
    userId: Types.ObjectId;
    moduleId: Types.ObjectId;
    status: 'locked' | 'not_started' | 'in_progress' | 'completed';
    completedAt?: Date;
    assessmentStatus?: 'not_started' | 'in_progress' | 'passed' | 'failed' | 'pending_review';
    assessmentSubmissionId?: Types.ObjectId;
    moduleTaskStatus?: 'not_started' | 'submitted' | 'pending_review' | 'passed' | 'failed' | 'needs_resubmission';
    moduleTaskSubmissionId?: Types.ObjectId;
    taskPointsAwarded?: number;
    createdAt: Date;
}

const progressSchema = new Schema<IProgress>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
    status: { type: String, enum: ['locked', 'not_started', 'in_progress', 'completed'], default: 'locked' },
    completedAt: { type: Date },
    assessmentStatus: {
        type: String,
        enum: ['not_started', 'in_progress', 'passed', 'failed', 'pending_review'],
        default: 'not_started'
    },
    assessmentSubmissionId: { type: Schema.Types.ObjectId, ref: 'AssessmentSubmission' },
    moduleTaskStatus: {
        type: String,
        enum: ['not_started', 'submitted', 'pending_review', 'passed', 'failed', 'needs_resubmission'],
        default: 'not_started'
    },
    moduleTaskSubmissionId: { type: Schema.Types.ObjectId, ref: 'ModuleTaskSubmission' },
    taskPointsAwarded: { type: Number, default: 0, min: 0 },
    createdAt: { type: Date, default: Date.now }
});

progressSchema.index({ userId: 1, moduleId: 1 }, { unique: true });

export const Progress = model<IProgress>('Progress', progressSchema);
