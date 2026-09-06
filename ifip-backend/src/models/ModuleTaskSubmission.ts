import { Schema, model, Document, Types } from 'mongoose';

export type ModuleTaskSubmissionStatus =
    | 'submitted'
    | 'pending_review'
    | 'approved'
    | 'rejected'
    | 'needs_resubmission'
    | 'expired';

export interface IModuleTaskSubmission extends Document {
    userId: Types.ObjectId;
    moduleId: Types.ObjectId;
    moduleTitle?: string;
    fileUrl?: string;
    fileName?: string;
    files?: { fileUrl: string; fileName?: string }[];
    note?: string;
    status: ModuleTaskSubmissionStatus;
    attemptNumber: number;
    pointsAwarded: number;
    reviewedBy?: Types.ObjectId;
    reviewedAt?: Date;
    adminFeedback?: string;
    submittedAt: Date;
    windowOpen: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const moduleTaskSubmissionSchema = new Schema<IModuleTaskSubmission>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
        moduleTitle: { type: String },
        fileUrl: { type: String },
        fileName: { type: String },
        files: [
            {
                fileUrl: { type: String, required: true },
                fileName: { type: String },
            },
        ],
        note: { type: String },
        status: {
            type: String,
            enum: ['submitted', 'pending_review', 'approved', 'rejected', 'needs_resubmission', 'expired'],
            default: 'submitted',
        },
        attemptNumber: { type: Number, default: 1, min: 1 },
        pointsAwarded: { type: Number, default: 0, min: 0 },
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        reviewedAt: { type: Date },
        adminFeedback: { type: String },
        submittedAt: { type: Date, default: Date.now },
        windowOpen: { type: Boolean, default: true },
    },
    { timestamps: true }
);

moduleTaskSubmissionSchema.index({ userId: 1, moduleId: 1, submittedAt: -1 });
moduleTaskSubmissionSchema.index({ moduleId: 1, status: 1, submittedAt: -1 });
moduleTaskSubmissionSchema.index({ userId: 1, status: 1 });

export const ModuleTaskSubmission = model<IModuleTaskSubmission>(
    'ModuleTaskSubmission',
    moduleTaskSubmissionSchema
);
