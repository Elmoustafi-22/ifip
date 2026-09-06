import { Schema, model, Document, Types } from 'mongoose';

export interface IModuleTaskReward extends Document {
    userId: Types.ObjectId;
    moduleId: Types.ObjectId;
    submissionId: Types.ObjectId;
    taskTitle?: string;
    pointsAwarded: number;
    status: 'awarded' | 'reversed';
    awardedAt: Date;
    awardedBy?: Types.ObjectId;
    reason?: string;
    createdAt: Date;
    updatedAt: Date;
}

const moduleTaskRewardSchema = new Schema<IModuleTaskReward>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
        submissionId: { type: Schema.Types.ObjectId, ref: 'ModuleTaskSubmission', required: true },
        taskTitle: { type: String },
        pointsAwarded: { type: Number, default: 0, min: 0 },
        status: {
            type: String,
            enum: ['awarded', 'reversed'],
            default: 'awarded',
        },
        awardedAt: { type: Date, default: Date.now },
        awardedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String },
    },
    { timestamps: true }
);

moduleTaskRewardSchema.index({ userId: 1, moduleId: 1, awardedAt: -1 });
moduleTaskRewardSchema.index({ submissionId: 1 }, { unique: true });

export const ModuleTaskReward = model<IModuleTaskReward>(
    'ModuleTaskReward',
    moduleTaskRewardSchema
);
